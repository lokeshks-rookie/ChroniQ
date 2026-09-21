import type { Capability } from '@/types';
import type { ElementType } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Activity,
  DoorOpen,
  ClipboardCheck,
  UserCog,
  Building2,
  Users,
  UserCheck,
  BarChart2,
  Bell,
  Settings,
  Monitor,
  MonitorSmartphone,
  Calendar,
  Clock,
  Hospital,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: ElementType;
  capability: Capability;
  superAdminOnly?: boolean;
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
      { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: LayoutDashboard, capability: 'view_dashboard' },
      { id: 'appointments', label: 'Appointments', path: '/admin/appointments', icon: CalendarDays, capability: 'manage_appointments' },
      { id: 'queue', label: 'Live queue', path: '/admin/queue', icon: Activity, capability: 'queue_control', showQueueCount: true },
      { id: 'walk-in', label: 'Walk-in', path: '/admin/walk-in', icon: DoorOpen, capability: 'walk_in_registration' },
      { id: 'checkin', label: 'Check-in', path: '/admin/checkin', icon: ClipboardCheck, capability: 'check_in' },
    ],
  },
  {
    eyebrow: 'MANAGE',
    items: [
      { id: 'hospitals', label: 'Hospitals', path: '/admin/hospitals', icon: Hospital, capability: 'view_dashboard', superAdminOnly: true },
      { id: 'doctors', label: 'Doctors', path: '/admin/doctors', icon: UserCog, capability: 'manage_doctors' },
      { id: 'departments', label: 'Departments', path: '/admin/departments', icon: Building2, capability: 'manage_departments' },
      { id: 'patients', label: 'Patients', path: '/admin/patients', icon: Users, capability: 'view_patients' },
      { id: 'staff', label: 'Staff', path: '/admin/staff', icon: UserCheck, capability: 'manage_staff' },
    ],
  },
  {
    eyebrow: 'INSIGHTS',
    items: [
      { id: 'reports', label: 'Reports', path: '/admin/reports', icon: BarChart2, capability: 'reports_and_export' },
    ],
  },
  {
    eyebrow: 'COMMUNICATION',
    items: [
      { id: 'broadcasts', label: 'Broadcasts', path: '/admin/notifications', icon: Bell, capability: 'send_broadcasts' },
      { id: 'settings', label: 'Settings', path: '/admin/settings', icon: Settings, capability: 'hospital_settings' },
    ],
  },
  {
    eyebrow: 'SCREENS',
    items: [
      {
        id: 'screen-display',
        label: 'Display board',
        path: '/display',
        icon: Monitor,
        capability: 'check_in',
        openInNewTab: true,
        hasDeptPicker: true,
        allowCopyLink: true,
      },
      {
        id: 'screen-kiosk',
        label: 'Kiosk',
        path: '/checkin',
        icon: MonitorSmartphone,
        capability: 'check_in',
        openInNewTab: true,
        allowCopyLink: true,
      },
    ],
  },
];

export const SUPER_ADMIN_NAV_CONFIG: NavGroup[] = [
  {
    eyebrow: 'OPERATIONS',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/admin', icon: LayoutDashboard, capability: 'view_dashboard' },
      { id: 'appointments', label: 'Appointments', path: '/admin/appointments', icon: CalendarDays, capability: 'manage_appointments' },
      { id: 'queue', label: 'Live queue', path: '/admin/queue', icon: Activity, capability: 'queue_control', showQueueCount: true },
      { id: 'walk-in', label: 'Walk-in', path: '/admin/walk-in', icon: DoorOpen, capability: 'walk_in_registration' },
      { id: 'checkin', label: 'Check-in', path: '/admin/checkin', icon: ClipboardCheck, capability: 'check_in' },
    ],
  },
  {
    eyebrow: 'MANAGE',
    items: [
      { id: 'hospitals', label: 'Hospitals', path: '/admin/hospitals', icon: Hospital, capability: 'view_dashboard' },
      { id: 'doctors', label: 'Doctors', path: '/admin/doctors', icon: UserCog, capability: 'manage_doctors' },
      { id: 'departments', label: 'Departments', path: '/admin/departments', icon: Building2, capability: 'manage_departments' },
      { id: 'patients', label: 'Patients', path: '/admin/patients', icon: Users, capability: 'view_patients' },
      { id: 'staff', label: 'Staff', path: '/admin/staff', icon: UserCheck, capability: 'manage_staff' },
    ],
  },
  {
    eyebrow: 'INSIGHTS',
    items: [
      { id: 'reports', label: 'Reports', path: '/admin/reports', icon: BarChart2, capability: 'reports_and_export' },
    ],
  },
  {
    eyebrow: 'COMMUNICATION',
    items: [
      { id: 'broadcasts', label: 'Broadcasts', path: '/admin/notifications', icon: Bell, capability: 'send_broadcasts' },
      { id: 'settings', label: 'Settings', path: '/admin/settings', icon: Settings, capability: 'hospital_settings' },
    ],
  },
  {
    eyebrow: 'SCREENS',
    items: [
      {
        id: 'screen-display',
        label: 'Display board',
        path: '/display',
        icon: Monitor,
        capability: 'check_in',
        openInNewTab: true,
        hasDeptPicker: true,
        allowCopyLink: true,
      },
      {
        id: 'screen-kiosk',
        label: 'Kiosk',
        path: '/checkin',
        icon: MonitorSmartphone,
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
      { id: 'doctor-day', label: 'My day', path: '/doctor', icon: Calendar, capability: 'view_dashboard' },
      { id: 'doctor-queue', label: 'My queue', path: '/doctor/queue', icon: Activity, capability: 'queue_control', showQueueCount: true },
    ],
  },
  {
    eyebrow: 'STATUS',
    items: [
      { id: 'doctor-availability', label: 'Availability', path: '/doctor/availability', icon: Clock, capability: 'manage_schedules' },
    ],
  },
];

export function getNavConfigForRole(role: string): NavGroup[] {
  if (role === 'doctor') {
    return DOCTOR_NAV_CONFIG;
  }
  if (role === 'super_admin') {
    return SUPER_ADMIN_NAV_CONFIG;
  }
  return ADMIN_NAV_CONFIG;
}
