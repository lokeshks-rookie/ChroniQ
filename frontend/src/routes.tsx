import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Skeleton } from '@/components/ui/Skeleton';

// Page Loading Skeleton Fallback
const PageLoadingFallback = () => (
  <div className="space-y-6 p-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="h-28 rounded-card" />
    </div>
    <Skeleton className="h-96 rounded-card w-full" />
  </div>
);

// Code-split pages with React.lazy
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AppointmentsPage = lazy(() => import('@/pages/admin/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
const QueuePage = lazy(() => import('@/pages/admin/QueuePage').then((m) => ({ default: m.QueuePage })));
const WalkInPage = lazy(() => import('@/pages/admin/WalkInPage').then((m) => ({ default: m.WalkInPage })));
const CheckInPage = lazy(() => import('@/pages/admin/CheckInPage').then((m) => ({ default: m.CheckInPage })));
const DoctorsPage = lazy(() => import('@/pages/admin/DoctorsPage').then((m) => ({ default: m.DoctorsPage })));
const DoctorSchedulePage = lazy(() => import('@/pages/admin/DoctorSchedulePage').then((m) => ({ default: m.DoctorSchedulePage })));
const DepartmentsPage = lazy(() => import('@/pages/admin/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })));
const PatientsPage = lazy(() => import('@/pages/admin/PatientsPage').then((m) => ({ default: m.PatientsPage })));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const StaffPage = lazy(() => import('@/pages/admin/StaffPage').then((m) => ({ default: m.StaffPage })));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const BroadcastsPage = lazy(() => import('@/pages/admin/BroadcastsPage').then((m) => ({ default: m.BroadcastsPage })));
const UiKitPreviewPage = lazy(() => import('@/pages/admin/UiKitPreviewPage').then((m) => ({ default: m.UiKitPreviewPage })));

// Doctor Pages
const MyDayPage = lazy(() => import('@/pages/doctor/MyDayPage').then((m) => ({ default: m.MyDayPage })));
const MyQueuePage = lazy(() => import('@/pages/doctor/MyQueuePage').then((m) => ({ default: m.MyQueuePage })));
const DoctorAvailabilityPage = lazy(() => import('@/pages/doctor/DoctorAvailabilityPage').then((m) => ({ default: m.DoctorAvailabilityPage })));

import { DisplayLayout } from '@/components/layout/DisplayLayout';
import { KioskLayout } from '@/components/layout/KioskLayout';
import { PatientLayout } from '@/components/layout/PatientLayout';

// Special Screens (Section 4.6)
const DisplayBoardPage = lazy(() => import('@/pages/special/DisplayBoardPage').then((m) => ({ default: m.DisplayBoardPage })));
const KioskCheckInPage = lazy(() => import('@/pages/special/KioskCheckInPage').then((m) => ({ default: m.KioskCheckInPage })));

// Patient Pages (Section 4.2, Pages 20–24)
const ProfilePage = lazy(() => import('@/pages/patient/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const FamilyPage = lazy(() => import('@/pages/patient/FamilyPage').then((m) => ({ default: m.FamilyPage })));
const RecordsPage = lazy(() => import('@/pages/patient/RecordsPage').then((m) => ({ default: m.RecordsPage })));
const ReviewPage = lazy(() => import('@/pages/patient/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const HelpPage = lazy(() => import('@/pages/patient/HelpPage').then((m) => ({ default: m.HelpPage })));

import { useAuthStore } from '@/store/authStore';
import { useParams } from 'react-router-dom';

const RootRedirect = () => {
  const role = useAuthStore((s) => s.currentRole);
  if (role === 'doctor') return <Navigate to="/doctor" replace />;
  if (role === 'patient') return <Navigate to="/app/profile" replace />;
  return <Navigate to="/admin" replace />;
};

const DisplayRedirect = () => {
  const { hospitalId } = useParams();
  return <Navigate to={`/display/${hospitalId}/all`} replace />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/display/:hospitalId',
    element: <DisplayRedirect />,
  },
  {
    path: '/display/:hospitalId/:deptId',
    element: <DisplayLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <DisplayBoardPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/checkin/:hospitalId',
    element: <KioskLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <KioskCheckInPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/app',
    element: <PatientLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/app/profile" replace />,
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProfilePage />
          </Suspense>
        ),
      },
      {
        path: 'family',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <FamilyPage />
          </Suspense>
        ),
      },
      {
        path: 'records',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <RecordsPage />
          </Suspense>
        ),
      },
      {
        path: 'reviews/:appointmentId',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ReviewPage />
          </Suspense>
        ),
      },
      {
        path: 'help',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <HelpPage />
          </Suspense>
        ),
      },
      {
        path: 'search',
        element: <Navigate to="/app/records" replace />,
      },
      {
        path: 'appointments',
        element: <Navigate to="/app/records" replace />,
      },
      {
        path: 'notifications',
        element: <Navigate to="/app/profile" replace />,
      },
      {
        path: '*',
        element: <Navigate to="/app/profile" replace />,
      },
    ],
  },
  {
    path: '/doctor',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute allowedRoles={['doctor']}>
              <MyDayPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'queue',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute allowedRoles={['doctor']}>
              <MyQueuePage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'availability',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorAvailabilityPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/doctor" replace />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="view_dashboard">
              <DashboardPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'appointments',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="manage_appointments">
              <AppointmentsPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'queue',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="queue_control">
              <QueuePage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'walk-in',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="walk_in_registration">
              <WalkInPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'checkin',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="check_in">
              <CheckInPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'doctors',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="manage_doctors">
              <DoctorsPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'doctors/:id/schedule',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="manage_schedules">
              <DoctorSchedulePage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'departments',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="manage_departments">
              <DepartmentsPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'patients',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="view_patients">
              <PatientsPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="reports_and_export">
              <ReportsPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'staff',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="manage_staff">
              <StaffPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="hospital_settings">
              <SettingsPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: 'notifications',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="send_broadcasts">
              <BroadcastsPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: '_kit',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <UiKitPreviewPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/admin" replace />,
      },
    ],
  },
]);
