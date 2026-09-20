import { useHospitalStore } from '@/store/hospitalStore';
import type {
  Doctor,
  Department,
  QueueEntry,
  BroadcastLog,
  DoctorAvailabilityState,
  Hospital,
} from '@/types';
import type { SupportedLanguage } from './i18n';
import { t } from './i18n';

/**
 * Display Doctor Tile State
 * Calling takes precedence over Serving!
 */
export type DisplayTileState =
  | 'calling'
  | 'serving'
  | 'on_break'
  | 'late'
  | 'on_leave'
  | 'available_empty';

/**
 * Privacy Rule: No patient fields (name, age, phone, reason, etc.) exist here!
 */
export interface DisplayDoctorTile {
  doctorId: string;
  doctor_id: string;
  doctorName: string;
  doctor_name: string;
  department_id?: string;
  department_name?: string;
  room: string;
  state: DisplayTileState;
  token?: string | null;
  breakUntil?: string;
  lateMinutes?: number;
  statusText?: string;
}

/**
 * Next in line token
 * Privacy Rule: Strictly tokens only! No patient names, phone, or priority indicators.
 */
export interface DisplayNextWaitingToken {
  token: string;
  room: string;
  tokenNumber: number;
  etaMinutes: number;
  approxWaitText: string;
}

export interface DisplayNotice {
  id: string;
  text: string;
  doctorName?: string;
  minutesDelayed?: number;
}

export interface DisplayBoardData {
  hospitalName: string;
  departmentName: string;
  doctorTiles: DisplayDoctorTile[];
  nextInLine: DisplayNextWaitingToken[];
  totalWaitingCount: number;
  totalWaitingAcrossScope: number;
  moreWaitingCount: number;
  notices: DisplayNotice[];
}

export interface SelectBoardScope {
  hospitalId: string;
  deptId: string;
  doctors?: Doctor[];
  departments?: Department[];
  queue_entries?: QueueEntry[];
  broadcasts?: BroadcastLog[];
  availabilityStates?: Record<string, DoctorAvailabilityState>;
  hospital?: Hospital;
}

/**
 * Approximate wait rounded UP to nearest 5 minutes
 * e.g. 1-4 -> "under 5 min"
 * 5 -> "about 5 min"
 * 6-10 -> "about 10 min"
 * 11-15 -> "about 15 min"
 */
export function roundWait(etaMinutes?: number, lang: SupportedLanguage = 'en'): string {
  if (etaMinutes === undefined || etaMinutes === null || etaMinutes < 5) {
    return t('display.under_5_min', lang);
  }
  const rounded = Math.ceil(etaMinutes / 5) * 5;
  return t('display.about_min', lang, { min: rounded });
}

/**
 * Pure selector for waiting-hall display board data.
 * Strictly verifies and enforces patient privacy.
 */
export function selectBoard(
  scope: SelectBoardScope,
  lang: SupportedLanguage = 'en'
): DisplayBoardData {
  const storeState = useHospitalStore.getState();
  const hospital = scope.hospital || storeState.hospital;
  const departments = scope.departments || storeState.departments;
  const doctors = scope.doctors || storeState.doctors;
  const queue_entries = scope.queue_entries || storeState.queue_entries;
  const broadcasts = scope.broadcasts || storeState.broadcasts;
  const availabilityStates = scope.availabilityStates || storeState.doctor_availability;

  const isLobby = scope.deptId === 'all';
  const department = isLobby ? null : departments.find((d) => d.id === scope.deptId);
  const departmentName = isLobby
    ? t('common.all_departments', lang)
    : department?.name || 'Department';

  // Filter doctors in scope
  const doctorsInScope = doctors.filter(
    (d) => d.is_active && (isLobby || d.department_id === scope.deptId)
  );

  // Helper to get doctor effective status
  const getEffStatus = (docId: string) => {
    if (availabilityStates && availabilityStates[docId]) {
      const av = availabilityStates[docId];
      return {
        status: av.status,
        until: av.until,
        lateMinutes: av.delay_minutes,
      };
    }
    return storeState.getDoctorEffectiveStatus(docId);
  };

  // 1. Build Doctor Tiles
  const doctorTiles: DisplayDoctorTile[] = doctorsInScope.map((doc) => {
    const docEntries = queue_entries.filter((q) => q.doctor_id === doc.id);
    const calledEntry = docEntries.find((q) => q.status === 'called');
    const consultEntry = docEntries.find((q) => q.status === 'in_consultation');
    const effectiveStatus = getEffStatus(doc.id);
    const dept = departments.find((d) => d.id === doc.department_id);

    // Calling takes precedence over Serving!
    if (calledEntry) {
      return {
        doctorId: doc.id,
        doctor_id: doc.id,
        doctorName: doc.name,
        doctor_name: doc.name,
        department_id: doc.department_id,
        department_name: dept?.name || '',
        room: doc.room || 'Room 1',
        state: 'calling',
        token: calledEntry.token,
        statusText: 'Now calling',
      };
    }

    if (consultEntry) {
      return {
        doctorId: doc.id,
        doctor_id: doc.id,
        doctorName: doc.name,
        doctor_name: doc.name,
        department_id: doc.department_id,
        department_name: dept?.name || '',
        room: doc.room || 'Room 1',
        state: 'serving',
        token: consultEntry.token,
        statusText: 'Now serving',
      };
    }

    if (effectiveStatus.status === 'on_break') {
      return {
        doctorId: doc.id,
        doctor_id: doc.id,
        doctorName: doc.name,
        doctor_name: doc.name,
        department_id: doc.department_id,
        department_name: dept?.name || '',
        room: doc.room || 'Room 1',
        state: 'on_break',
        breakUntil: effectiveStatus.until,
        statusText: effectiveStatus.until
          ? `On break until ${effectiveStatus.until}`
          : 'On break',
      };
    }

    if (effectiveStatus.status === 'late') {
      return {
        doctorId: doc.id,
        doctor_id: doc.id,
        doctorName: doc.name,
        doctor_name: doc.name,
        department_id: doc.department_id,
        department_name: dept?.name || '',
        room: doc.room || 'Room 1',
        state: 'late',
        lateMinutes: effectiveStatus.lateMinutes,
        statusText: `Running about ${effectiveStatus.lateMinutes || 20} min late`,
      };
    }

    if (effectiveStatus.status === 'on_leave') {
      return {
        doctorId: doc.id,
        doctor_id: doc.id,
        doctorName: doc.name,
        doctor_name: doc.name,
        department_id: doc.department_id,
        department_name: dept?.name || '',
        room: doc.room || 'Room 1',
        state: 'on_leave',
        statusText: 'Not available today',
      };
    }

    // Default: available with no active patient
    return {
      doctorId: doc.id,
      doctor_id: doc.id,
      doctorName: doc.name,
      doctor_name: doc.name,
      department_id: doc.department_id,
      department_name: dept?.name || '',
      room: doc.room || 'Room 1',
      state: 'available_empty',
      statusText: 'No patients waiting',
    };
  });

  // 2. Build Next in Line Waiting List (ordered by ETA, ties by token number)
  const waitingEntries = queue_entries.filter((q) => {
    if (q.status !== 'waiting') return false;
    if (isLobby) return true;
    return q.department_id === scope.deptId;
  });

  // Sort by ETA ascending, ties by token_number
  const sortedWaiting = [...waitingEntries].sort((a, b) => {
    const etaA = a.eta_minutes ?? 999;
    const etaB = b.eta_minutes ?? 999;
    if (etaA !== etaB) return etaA - etaB;
    return (a.token_number || 0) - (b.token_number || 0);
  });

  const top8 = sortedWaiting.slice(0, 8);
  const nextInLine: DisplayNextWaitingToken[] = top8.map((q) => {
    const doc = doctors.find((d) => d.id === q.doctor_id);
    return {
      token: q.token,
      room: doc?.room || 'Room 1',
      tokenNumber: q.token_number || 0,
      etaMinutes: q.eta_minutes || 0,
      approxWaitText: roundWait(q.eta_minutes, lang),
    };
  });

  const totalWaitingCount = sortedWaiting.length;
  const moreWaitingCount = Math.max(0, totalWaitingCount - 8);

  // 3. Build Active Notices (from delay and closure broadcasts in last 3 hours)
  const threeHoursAgo = Date.now() - 3 * 3600 * 1000;
  const activeBroadcasts = broadcasts.filter((b) => {
    const bTime = new Date(b.sent_at).getTime();
    if (bTime < threeHoursAgo) return false;
    if (isLobby) return true;
    if (b.audience_type === 'department' && b.target_id === scope.deptId) return true;
    if (b.audience_type === 'doctor') {
      const doc = doctors.find((d) => d.id === b.target_id);
      return doc?.department_id === scope.deptId;
    }
    return b.audience_type === 'all';
  });

  const notices: DisplayNotice[] = activeBroadcasts.map((b) => ({
    id: b.id,
    text: b.message,
    doctorName: b.target_name,
    minutesDelayed: b.minutes_delayed,
  }));

  // If no specific delay broadcast, show the default friendly notice
  if (notices.length === 0) {
    notices.push({
      id: 'notice_default',
      text: t('display.default_notice', lang),
    });
  }

  return {
    hospitalName: hospital.name,
    departmentName,
    doctorTiles,
    nextInLine,
    totalWaitingCount,
    totalWaitingAcrossScope: totalWaitingCount,
    moreWaitingCount,
    notices,
  };
}

/**
 * Paginates doctor tiles: 4 tiles per screen, rotating every 10 seconds if > 4
 */
export function pageTiles(
  tiles: DisplayDoctorTile[],
  pageIndex: number,
  pageSize = 4
): {
  tiles: DisplayDoctorTile[];
  visibleTiles: DisplayDoctorTile[];
  totalPages: number;
  currentPage: number;
} {
  const totalPages = Math.max(1, Math.ceil(tiles.length / pageSize));
  const normalizedPage = pageIndex % totalPages;
  const start = normalizedPage * pageSize;
  const sliced = tiles.slice(start, start + pageSize);

  return {
    tiles: sliced,
    visibleTiles: sliced,
    totalPages,
    currentPage: normalizedPage,
  };
}
