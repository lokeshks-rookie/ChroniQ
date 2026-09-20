import type { Capability } from '@/types';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  capability: Capability;
  showQueueCount?: boolean;
  openInNewTab?: boolean;
  hasDeptPicker?: boolean;
  allowCopyLink?: boolean;
}

export interface NavGroup {
  eyebrow: string;
  items: NavItem[];
}

export const ADMIN_NAV_CONFIG: NavGroup[] = [
  {
    eyebrow: 'OPERATIONS',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/admin', capability: 'view_dashboard' },
      { id: 'appointments', label: 'Appointments', path: '/admin/appointments', capability: 'manage_appointments' },
      { id: 'queue', label: 'Live queue', path: '/admin/queue', capability: 'queue_control', showQueueCount: true },
      { id: 'walk-in', label: 'Walk-in', path: '/admin/walk-in', capability: 'walk_in_registration' },
      { id: 'checkin', label: 'Check-in', path: '/admin/checkin', capability: 'check_in' },
    ],
  },
  {
    eyebrow: 'MANAGE',
    items: [
      { id: 'doctors', label: 'Doctors', path: '/admin/doctors', capability: 'manage_doctors' },
      { id: 'departments', label: 'Departments', path: '/admin/departments', capability: 'manage_departments' },
      { id: 'patients', label: 'Patients', path: '/admin/patients', capability: 'view_patients' },
      { id: 'staff', label: 'Staff', path: '/admin/staff', capability: 'manage_staff' },
    ],
  },
  {
    eyebrow: 'INSIGHTS',
    items: [
      { id: 'reports', label: 'Reports', path: '/admin/reports', capability: 'reports_and_export' },
    ],
  },
  {
    eyebrow: 'COMMUNICATION',
    items: [
      { id: 'broadcasts', label: 'Broadcasts', path: '/admin/notifications', capability: 'send_broadcasts' },
      { id: 'settings', label: 'Settings', path: '/admin/settings', capability: 'hospital_settings' },
    ],
  },
  {
    eyebrow: 'SCREENS',
    items: [
      {
        id: 'screen-display',
        label: 'Display board',
        path: '/display',
        capability: 'check_in',
        openInNewTab: true,
        hasDeptPicker: true,
        allowCopyLink: true,
      },
      {
        id: 'screen-kiosk',
        label: 'Kiosk',
        path: '/checkin',
        capability: 'check_in',
        openInNewTab: true,
        allowCopyLink: true,
      },
    ],
  },
];

// Doctor Navigation (Section 4.4)
export const DOCTOR_NAV_CONFIG: NavGroup[] = [
  {
    eyebrow: 'TODAY',
    items: [
      { id: 'doctor-day', label: 'My day', path: '/doctor', capability: 'view_dashboard' },
      { id: 'doctor-queue', label: 'My queue', path: '/doctor/queue', capability: 'queue_control', showQueueCount: true },
    ],
  },
  {
    eyebrow: 'STATUS',
    items: [
      { id: 'doctor-availability', label: 'Availability', path: '/doctor/availability', capability: 'manage_schedules' },
    ],
  },
];

export function getNavConfigForRole(role: string): NavGroup[] {
  if (role === 'doctor') {
    return DOCTOR_NAV_CONFIG;
  }
  return ADMIN_NAV_CONFIG;
}
