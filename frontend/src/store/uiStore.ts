import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'danger' | 'info';
  duration?: number;
}

export interface LiveAlert {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  time: string;
  actionLabel?: string;
  actionUrl?: string;
  dismissed?: boolean;
  doctor_id?: string;
}

interface UiState {
  toasts: ToastMessage[];
  alerts: LiveAlert[];
  liveAnnouncement: string;
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  announce: (message: string) => void;
  dismissAlert: (id: string) => void;
  addAlert: (alert: Omit<LiveAlert, 'id' | 'time'>) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  alerts: [
    {
      id: 'alert_1',
      severity: 'warning',
      title: 'Doctor delay advisory',
      message: 'Dr. Anand Ramanathan is running 20m late. 8 patients affected in Cardiology.',
      time: '10m ago',
      actionLabel: 'Broadcast delay',
      actionUrl: '/admin/notifications?type=delay&doctor=doc_card_1',
      doctor_id: 'doc_card_1',
    },
    {
      id: 'alert_2',
      severity: 'info',
      title: 'High waiting volume',
      message: 'General Medicine queue length reached 5 patients.',
      time: '18m ago',
      actionLabel: 'Open queue',
      actionUrl: '/admin/queue?dept=dept_genm',
    },
    {
      id: 'alert_3',
      severity: 'info',
      title: 'Facility maintenance reminder',
      message: 'Dermatology air sterilization planned for 28-29 Sep.',
      time: '1h ago',
      actionLabel: 'View broadcast',
      actionUrl: '/admin/notifications',
    },
    // Doctor Meena Raj specific alerts (6-10 alerts for Section 4.4)
    {
      id: 'alert_doc_1',
      severity: 'danger',
      title: 'Emergency patient queued',
      message: 'Priority 0 emergency inserted for consultation by Front Desk.',
      time: '5m ago',
      actionLabel: 'View queue',
      actionUrl: '/doctor/queue',
      doctor_id: 'doc_card_2',
    },
    {
      id: 'alert_doc_2',
      severity: 'warning',
      title: 'Patient no-show logged',
      message: 'Token CARD-011 did not respond to 2 calls and was marked no-show.',
      time: '25m ago',
      doctor_id: 'doc_card_2',
    },
    {
      id: 'alert_doc_3',
      severity: 'info',
      title: 'Schedule modification note',
      message: 'Admin updated afternoon consultation block to 15:00 - 17:30.',
      time: '45m ago',
      actionLabel: 'Check day',
      actionUrl: '/doctor',
      doctor_id: 'doc_card_2',
    },
    {
      id: 'alert_doc_4',
      severity: 'info',
      title: 'Broadcast delay alert',
      message: 'Reception broadcasted 10-minute queue advisory to waiting patients.',
      time: '1h ago',
      doctor_id: 'doc_card_2',
    },
    {
      id: 'alert_doc_5',
      severity: 'info',
      title: 'ECG Report Ready',
      message: 'Lab uploaded ECG and Troponin panel for patient Ravi Shankar.',
      time: '1h 20m ago',
      doctor_id: 'doc_card_2',
    },
    {
      id: 'alert_doc_6',
      severity: 'info',
      title: 'Priority patient arrived',
      message: 'Senior citizen Lakshmi Narayanan (CARD-012) checked in at desk.',
      time: '1h 45m ago',
      actionLabel: 'View queue',
      actionUrl: '/doctor/queue',
      doctor_id: 'doc_card_2',
    },
    {
      id: 'alert_doc_7',
      severity: 'warning',
      title: 'Leave overlap advisory',
      message: 'Upcoming conference leave (24-26 Sep) overlaps with 4 advance bookings.',
      time: '2h ago',
      actionLabel: 'Manage leave',
      actionUrl: '/doctor/availability',
      doctor_id: 'doc_card_2',
    },
  ],
  liveAnnouncement: '',

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    return id;
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  announce: (message) => {
    set({ liveAnnouncement: message });
  },

  dismissAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    }));
  },

  addAlert: (alert) => {
    const id = `alert_${Date.now()}`;
    const newAlert: LiveAlert = {
      ...alert,
      id,
      time: 'just now',
      dismissed: false,
    };
    set((state) => ({ alerts: [newAlert, ...state.alerts] }));
  },
}));
