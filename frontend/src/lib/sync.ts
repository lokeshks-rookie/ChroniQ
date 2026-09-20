import { useHospitalStore } from '@/store/hospitalStore';
import { useAuthStore } from '@/store/authStore';

export interface TabPresence {
  tab_id: string;
  role: string;
  doctor_id?: string;
  at: number;
}

export type SyncMessage =
  | {
      type: 'HELLO';
      tab_id: string;
    }
  | {
      type: 'SNAPSHOT';
      tab_id: string;
      version: number;
      heartbeat_at: string;
      state: unknown;
    }
  | {
      type: 'PRESENCE';
      tab_id: string;
      presence: TabPresence;
    }
  | {
      type: 'RESET';
      tab_id: string;
      version: number;
    }
  | {
      type: 'SIM_PAUSE_TOGGLE';
      tab_id: string;
      paused: boolean;
    };

export interface SyncManagerOptions {
  tabId?: string;
  getSnapshot?: () => unknown;
  applySnapshot?: (snapshot: any, version?: number) => void;
  initialVersion?: number;
}

export class SyncManager {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private currentVersion: number = 1;
  private isLeader: boolean = false;
  private presenceMap: Map<string, TabPresence> = new Map();
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private leaderLockAbort: AbortController | null = null;
  private options?: SyncManagerOptions;

  constructor(options?: SyncManagerOptions) {
    this.options = options;
    this.tabId = options?.tabId || `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    if (options?.initialVersion !== undefined) {
      this.currentVersion = options.initialVersion;
    }
  }

  init(): void {
    if (typeof window === 'undefined') return;

    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('chroniq-sync');
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          this.handleMessage(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed, running standalone:', err);
      }
    }

    // 1. Leader election via Web Locks API (or fallback)
    this.electLeader();

    // 2. Announce presence & ask for existing state from any existing tabs
    this.send({ type: 'HELLO', tab_id: this.tabId });
    this.broadcastPresence();

    // 3. Heartbeat & presence sweep every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      this.broadcastPresence();
      this.sweepStalePresence();
      if (this.isLeader) {
        useHospitalStore.getState().updateHeartbeat();
      }
    }, 5000);

    // 4. Clean up on unload
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  getTabId(): string {
    return this.tabId;
  }

  getVersion(): number {
    return this.currentVersion;
  }

  isCurrentTabLeader(): boolean {
    return this.isLeader;
  }

  /**
   * Return set of doctor IDs that currently have an active doctor-role tab open
   */
  getActiveDoctorIds(): Set<string> {
    const active = new Set<string>();
    const now = Date.now();
    this.presenceMap.forEach((p) => {
      if (p.role === 'doctor' && p.doctor_id && now - p.at < 15000) {
        active.add(p.doctor_id);
      }
    });
    return active;
  }

  /**
   * Broadcast current store snapshot throttled to ~4 times per second (250ms debounce/throttle)
   */
  broadcastSnapshot(): void {
    if (this.throttleTimer) return;

    this.throttleTimer = setTimeout(() => {
      this.throttleTimer = null;
      this.currentVersion++;
      const store = useHospitalStore.getState();

      const snapshot = {
        appointments: store.appointments,
        queue_entries: store.queue_entries,
        doctor_availability: store.doctor_availability,
        availability_log: store.availability_log,
        doctor_leaves: store.doctor_leaves,
        consultation_notes: store.consultation_notes,
        call_events: store.call_events,
        heartbeat_at: store.heartbeat_at,
        isSimulationPaused: store.isSimulationPaused,
      };

      this.send({
        type: 'SNAPSHOT',
        tab_id: this.tabId,
        version: this.currentVersion,
        heartbeat_at: store.heartbeat_at,
        state: snapshot,
      });
    }, 250);
  }

  broadcastReset(): void {
    this.currentVersion++;
    this.send({
      type: 'RESET',
      tab_id: this.tabId,
      version: this.currentVersion,
    });
  }

  broadcastSimPause(paused: boolean): void {
    this.send({
      type: 'SIM_PAUSE_TOGGLE',
      tab_id: this.tabId,
      paused,
    });
  }

  private send(msg: SyncMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // channel error
      }
    }
  }

  /**
   * Public hook for testing message handling
   */
  handleChannelMessage(event: { data: any } | any): void {
    const data = event && 'data' in event ? event.data : event;
    this.handleMessage(data);
  }

  private handleMessage(msg: SyncMessage): void {
    // Ignore echoes of our own messages
    if (msg.tab_id === this.tabId) return;

    switch (msg.type) {
      case 'HELLO': {
        // A fresh tab opened: reply with current snapshot
        const store = useHospitalStore.getState();
        const snapshot = {
          appointments: store.appointments,
          queue_entries: store.queue_entries,
          doctor_availability: store.doctor_availability,
          availability_log: store.availability_log,
          doctor_leaves: store.doctor_leaves,
          consultation_notes: store.consultation_notes,
          call_events: store.call_events,
          heartbeat_at: store.heartbeat_at,
          isSimulationPaused: store.isSimulationPaused,
        };
        this.send({
          type: 'SNAPSHOT',
          tab_id: this.tabId,
          version: this.currentVersion,
          heartbeat_at: store.heartbeat_at,
          state: snapshot,
        });
        break;
      }

      case 'SNAPSHOT': {
        // Apply snapshot only if newer (last write wins rule)
        if (msg.version > this.currentVersion) {
          this.currentVersion = msg.version;
          if (this.options?.applySnapshot) {
            this.options.applySnapshot(msg.state, msg.version);
          } else {
            useHospitalStore.getState().applySyncSnapshot(msg.state as Parameters<ReturnType<typeof useHospitalStore.getState>['applySyncSnapshot']>[0]);
          }
        }
        break;
      }

      case 'PRESENCE': {
        this.presenceMap.set(msg.tab_id, msg.presence);
        break;
      }

      case 'RESET': {
        if (msg.version > this.currentVersion) {
          this.currentVersion = msg.version;
          useHospitalStore.getState().resetDemoData();
        }
        break;
      }

      case 'SIM_PAUSE_TOGGLE': {
        useHospitalStore.getState().setSimulationPaused(msg.paused);
        break;
      }
    }
  }

  private broadcastPresence(): void {
    const auth = useAuthStore.getState();
    const presence: TabPresence = {
      tab_id: this.tabId,
      role: auth.currentRole,
      doctor_id: auth.currentRole === 'doctor' ? auth.currentDoctorId : undefined,
      at: Date.now(),
    };
    this.presenceMap.set(this.tabId, presence);
    this.send({
      type: 'PRESENCE',
      tab_id: this.tabId,
      presence,
    });
  }

  private sweepStalePresence(): void {
    const now = Date.now();
    this.presenceMap.forEach((val, key) => {
      if (now - val.at > 20000) {
        this.presenceMap.delete(key);
      }
    });
  }

  private electLeader(): void {
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
      this.leaderLockAbort = new AbortController();
      navigator.locks
        .request('chroniq-sim-leader', { signal: this.leaderLockAbort.signal }, () => {
          this.isLeader = true;
          // Keep lock alive while tab is active
          return new Promise<void>(() => {});
        })
        .catch(() => {
          // aborted or not acquired
        });
    } else {
      // Fallback: simple first tab election
      this.isLeader = true;
    }
  }

  destroy(): void {
    if (this.leaderLockAbort) {
      this.leaderLockAbort.abort();
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // ignore
      }
    }
  }
}

export const syncManager = new SyncManager();
