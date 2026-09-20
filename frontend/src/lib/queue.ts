import type { Doctor, QueueEntry } from '@/types';

/**
 * Queue ordering rules:
 * 1. Priority ascending: 0 (emergency), 1 (priority: elderly, pregnant, critical), 2 (normal).
 * 2. sort_time ascending (slot time for booked, arrival time for walk-in or late arrival reset).
 */
export function sortQueueEntries(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    const timeA = new Date(a.sort_time).getTime();
    const timeB = new Date(b.sort_time).getTime();
    return timeA - timeB;
  });
}

/**
 * Check if an arrival exceeds the hospital's grace period.
 * Returns true if arrivalTime > slotStartTime + gracePeriodMinutes.
 */
export function isGracePeriodExceeded(
  slotStartTimeIso: string,
  arrivalTimeIso: string,
  gracePeriodMinutes: number
): boolean {
  const slotStart = new Date(slotStartTimeIso).getTime();
  const arrival = new Date(arrivalTimeIso).getTime();
  const allowedLimit = slotStart + gracePeriodMinutes * 60 * 1000;
  return arrival > allowedLimit;
}

/**
 * Calculate ETA in minutes for waiting patients of a doctor.
 * Formula from ChroniQ.md Section 5.3:
 * remaining_current + (position - 1) * doctor.avg_consult_minutes + 8% buffer, rounded up.
 * Shifted by delayMinutes or offsetMinutes (break or lateness) if any.
 */
export function computeEtaMinutes({
  position,
  avgConsultMinutes,
  remainingCurrentMinutes = 0,
  delayMinutes = 0,
  offsetMinutes = 0,
  bufferPercentage = 0.08,
}: {
  position: number; // 1-indexed (1 is next)
  avgConsultMinutes: number;
  remainingCurrentMinutes?: number;
  delayMinutes?: number;
  offsetMinutes?: number;
  bufferPercentage?: number;
}): number {
  if (position <= 0) return 0;

  const basePatientsAhead = Math.max(0, position - 1);
  const rawWait = remainingCurrentMinutes + basePatientsAhead * avgConsultMinutes;
  const withBuffer = rawWait * (1 + bufferPercentage);
  const total = Math.ceil(withBuffer + delayMinutes + offsetMinutes);
  return Math.max(1, total);
}

/**
 * Pure computeEta shorthand matching Section 5.3 / prompt signature:
 * Supports positional (remainingCurrentMin, position, avgConsultMin, offsetMinutes)
 * or object ({ position, avg_consult_minutes, remaining_current_minutes, offset_minutes })
 */
export function computeEta(
  param1:
    | number
    | {
        position?: number;
        avg_consult_minutes?: number;
        avgConsultMinutes?: number;
        remaining_current_minutes?: number;
        remainingCurrentMin?: number;
        offset_minutes?: number;
        offsetMinutes?: number;
      },
  position?: number,
  avgConsultMin?: number,
  offsetMinutes: number = 0
): number {
  if (typeof param1 === 'object') {
    return computeEtaMinutes({
      position: param1.position ?? 1,
      avgConsultMinutes: param1.avg_consult_minutes ?? param1.avgConsultMinutes ?? 10,
      remainingCurrentMinutes: param1.remaining_current_minutes ?? param1.remainingCurrentMin ?? 0,
      offsetMinutes: param1.offset_minutes ?? param1.offsetMinutes ?? 0,
    });
  }
  return computeEtaMinutes({
    position: position ?? 1,
    avgConsultMinutes: avgConsultMin ?? 10,
    remainingCurrentMinutes: param1,
    offsetMinutes,
  });
}

/**
 * Recompute positions and ETAs for all waiting entries of a doctor.
 */
export function recomputeDoctorQueueEtas(
  doctor: Doctor,
  waitingEntries: QueueEntry[],
  currentInConsultation?: QueueEntry | null,
  delayMinutes: number = 0,
  nowIso?: string,
  offsetMinutes: number = 0
): QueueEntry[] {
  const sorted = sortQueueEntries(waitingEntries);
  const now = nowIso ? new Date(nowIso) : new Date();

  let remainingCurrentMinutes = 0;
  if (currentInConsultation && currentInConsultation.started_at) {
    const started = new Date(currentInConsultation.started_at).getTime();
    const elapsedMinutes = (now.getTime() - started) / (60 * 1000);
    remainingCurrentMinutes = Math.max(0, doctor.avg_consult_minutes - elapsedMinutes);
  } else if (currentInConsultation) {
    remainingCurrentMinutes = doctor.avg_consult_minutes;
  }

  return sorted.map((entry, index) => {
    const position = index + 1;
    const eta = computeEtaMinutes({
      position,
      avgConsultMinutes: doctor.avg_consult_minutes,
      remainingCurrentMinutes,
      delayMinutes,
      offsetMinutes,
    });

    return {
      ...entry,
      position,
      eta_minutes: eta,
    };
  });
}

/**
 * Rolling average consultation time update:
 * avg = 0.8 * avg + 0.2 * consult_minutes
 */
export function updateRollingAverage(currentAvg: number, actualConsultMinutes: number): number {
  const updated = 0.8 * currentAvg + 0.2 * actualConsultMinutes;
  return Number(updated.toFixed(1));
}

/**
 * Handle skip: Move entry down one position in the waiting list.
 */
export function handleQueueSkip(waitingEntries: QueueEntry[], entryIdToSkip: string): QueueEntry[] {
  const index = waitingEntries.findIndex((e) => e.id === entryIdToSkip);
  if (index === -1 || index >= waitingEntries.length - 1) {
    // Can't skip if not found or already at the bottom; just increment skip count
    return waitingEntries.map((e) => (e.id === entryIdToSkip ? { ...e, skip_count: (e.skip_count || 0) + 1 } : e));
  }

  const copy = [...waitingEntries];
  const [item] = copy.splice(index, 1);
  const updatedItem: QueueEntry = {
    ...item,
    skip_count: (item.skip_count || 0) + 1,
  };
  copy.splice(index + 1, 0, updatedItem);

  // Recalculate positions
  return copy.map((e, idx) => ({ ...e, position: idx + 1 }));
}
