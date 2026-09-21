import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router-dom';

// Layouts
import PublicLayout from '@/layouts/PublicLayout';
import AppLayout from '@/layouts/AppLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DisplayLayout } from '@/components/layout/DisplayLayout';
import { KioskLayout } from '@/components/layout/KioskLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Skeleton } from '@/components/ui/Skeleton';

// Page Loading Skeleton Fallback
const PageLoadingFallback = () => (
  <div className="space-y-6 p-6 min-h-[50vh]">
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="h-28 rounded-card" />
      <Skeleton className="h-28 rounded-card" />
    </div>
    <Skeleton className="h-96 rounded-card w-full mt-6" />
  </div>
);

// ── Section 4.1: Public Pages ─────────────────────────────────
const LandingPage = lazy(() => import('@/pages/Landing/LandingPage'));
const HospitalsPage = lazy(() => import('@/pages/hospitals/HospitalsPage'));
const HospitalDetailPage = lazy(() => import('@/pages/hospitals/HospitalDetailPage'));
const DoctorProfilePage = lazy(() => import('@/pages/doctors/DoctorProfilePage'));

// ── Section 4.1: Auth Pages ───────────────────────────────────
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const OAuthCallbackPage = lazy(() => import('@/pages/auth/OAuthCallbackPage'));

// ── Section 4.2: Patient Portal (Pages 10–19) ─────────────────
const PatientDashboard = lazy(() => import('@/pages/app/PatientDashboard'));
const SearchPage = lazy(() => import('@/pages/app/SearchPage'));
const BookingSlotPage = lazy(() => import('@/pages/app/BookingSlotPage'));
const BookingDetailsPage = lazy(() => import('@/pages/app/BookingDetailsPage'));
const BookingConfirmPage = lazy(() => import('@/pages/app/BookingConfirmPage'));
const BookingSuccessPage = lazy(() => import('@/pages/app/BookingSuccessPage'));
const AppointmentsPageApp = lazy(() => import('@/pages/app/AppointmentsPage'));
const AppointmentDetailPage = lazy(() => import('@/pages/app/AppointmentDetailPage'));
const QueueTrackerPage = lazy(() => import('@/pages/app/QueueTrackerPage'));
const NotificationsPage = lazy(() => import('@/pages/app/NotificationsPage'));

// ── Section 4.2: Patient Portal (Pages 20–24) ─────────────────
const ProfilePage = lazy(() => import('@/pages/patient/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const FamilyPage = lazy(() => import('@/pages/patient/FamilyPage').then((m) => ({ default: m.FamilyPage })));
const RecordsPage = lazy(() => import('@/pages/patient/RecordsPage').then((m) => ({ default: m.RecordsPage })));
const ReviewPage = lazy(() => import('@/pages/patient/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const HelpPage = lazy(() => import('@/pages/patient/HelpPage').then((m) => ({ default: m.HelpPage })));

// ── Section 4.3: Hospital Admin Dashboard (Pages 25–40) ───────
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AppointmentsPageAdmin = lazy(() => import('@/pages/admin/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })));
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

// ── Section 4.4: Doctor Views (Pages 41–43) ───────────────────
const MyDayPage = lazy(() => import('@/pages/doctor/MyDayPage').then((m) => ({ default: m.MyDayPage })));
const MyQueuePage = lazy(() => import('@/pages/doctor/MyQueuePage').then((m) => ({ default: m.MyQueuePage })));
const DoctorAvailabilityPage = lazy(() => import('@/pages/doctor/DoctorAvailabilityPage').then((m) => ({ default: m.DoctorAvailabilityPage })));

// ── Section 4.5: Super Admin Console ──────────────────────────
const SuperDashboard = lazy(() => import('@/pages/super/SuperDashboard'));
const SuperHospitalsPage = lazy(() => import('@/pages/super/SuperHospitalsPage'));

// ── Section 4.6: Special Screens ──────────────────────────────
const DisplayBoardPage = lazy(() => import('@/pages/special/DisplayBoardPage').then((m) => ({ default: m.DisplayBoardPage })));
const KioskCheckInPage = lazy(() => import('@/pages/special/KioskCheckInPage').then((m) => ({ default: m.KioskCheckInPage })));

// ── Error / 404 Page ──────────────────────────────────────────
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));

const DisplayRedirect = () => {
  const { hospitalId } = useParams();
  return <Navigate to={`/display/${hospitalId || 'hosp_city_01'}/all`} replace />;
};

export const router = createBrowserRouter([
  // ── 1. Public routes (with Navbar + Footer) ─────────────────
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <LandingPage />
          </Suspense>
        ),
      },
      {
        path: '/hospitals',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <HospitalsPage />
          </Suspense>
        ),
      },
      {
        path: '/hospitals/:id',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <HospitalDetailPage />
          </Suspense>
        ),
      },
      {
        path: '/doctors/:id',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <DoctorProfilePage />
          </Suspense>
        ),
      },
    ],
  },

  // ── 2. Auth routes ──────────────────────────────────────────
  {
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: '/register',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <RegisterPage />
          </Suspense>
        ),
      },
      {
        path: '/auth/callback',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <OAuthCallbackPage />
          </Suspense>
        ),
      },
    ],
  },

  // ── 3. Patient Portal (Pages 10–24) ─────────────────────────
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <PatientDashboard />
          </Suspense>
        ),
      },
      {
        path: 'search',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <SearchPage />
          </Suspense>
        ),
      },
      {
        path: 'book/:doctorId',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <BookingSlotPage />
          </Suspense>
        ),
      },
      {
        path: 'book/details',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <BookingDetailsPage />
          </Suspense>
        ),
      },
      {
        path: 'book/confirm',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <BookingConfirmPage />
          </Suspense>
        ),
      },
      {
        path: 'book/success',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <BookingSuccessPage />
          </Suspense>
        ),
      },
      {
        path: 'appointments',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <AppointmentsPageApp />
          </Suspense>
        ),
      },
      {
        path: 'appointments/:id',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <AppointmentDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'queue/:appointmentId',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <QueueTrackerPage />
          </Suspense>
        ),
      },
      {
        path: 'notifications',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <NotificationsPage />
          </Suspense>
        ),
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
    ],
  },

  // ── 4. Hospital Admin Dashboard (Pages 25–40) ───────────────
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
              <AppointmentsPageAdmin />
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
        path: 'check-in',
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
        path: 'hospitals',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <ProtectedRoute capability="view_dashboard">
              <SuperHospitalsPage />
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
        path: 'broadcasts',
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

  // ── 5. Doctor Views (Pages 41–43) ───────────────────────────
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
        path: 'my-day',
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

  // ── 6. Super Admin Console (Pages 46–47) ────────────────────
  {
    path: '/super',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <SuperDashboard />
          </Suspense>
        ),
      },
      {
        path: 'hospitals',
        element: (
          <Suspense fallback={<PageLoadingFallback />}>
            <SuperHospitalsPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/super" replace />,
      },
    ],
  },

  // ── 7. Special Displays (Section 4.6) ───────────────────────
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
    path: '/kiosk/:hospitalId',
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

  // ── 8. 404 Catch-All ────────────────────────────────────────
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoadingFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
