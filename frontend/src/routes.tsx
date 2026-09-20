import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Layouts
import PublicLayout from '@/layouts/PublicLayout';
import AppLayout from '@/layouts/AppLayout';
import AdminLayout from '@/layouts/AdminLayout';

// Public pages
import LandingPage from '@/pages/Landing/LandingPage';
import HospitalsPage from '@/pages/hospitals/HospitalsPage';
import HospitalDetailPage from '@/pages/hospitals/HospitalDetailPage';
import DoctorProfilePage from '@/pages/doctors/DoctorProfilePage';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import VerifyOtpPage from '@/pages/auth/VerifyOtpPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Patient portal pages
import PatientDashboard from '@/pages/app/PatientDashboard';
import SearchPage from '@/pages/app/SearchPage';
import BookingSlotPage from '@/pages/app/BookingSlotPage';
import BookingDetailsPage from '@/pages/app/BookingDetailsPage';
import BookingConfirmPage from '@/pages/app/BookingConfirmPage';
import BookingSuccessPage from '@/pages/app/BookingSuccessPage';
import AppointmentsPage from '@/pages/app/AppointmentsPage';
import AppointmentDetailPage from '@/pages/app/AppointmentDetailPage';
import QueueTrackerPage from '@/pages/app/QueueTrackerPage';
import NotificationsPage from '@/pages/app/NotificationsPage';
import ProfilePage from '@/pages/app/ProfilePage';
import FamilyPage from '@/pages/app/FamilyPage';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import QueueControlPage from '@/pages/admin/QueueControlPage';
import WalkInPage from '@/pages/admin/WalkInPage';
import CheckInPage from '@/pages/admin/CheckInPage';
import DoctorsAdminPage from '@/pages/admin/DoctorsAdminPage';
import AdminReportsPage from '@/pages/admin/AdminReportsPage';

// Doctor pages
import DoctorDayPage from '@/pages/doctor/DoctorDayPage';
import DoctorQueuePage from '@/pages/doctor/DoctorQueuePage';

// Super admin pages
import SuperDashboard from '@/pages/super/SuperDashboard';
import SuperHospitalsPage from '@/pages/super/SuperHospitalsPage';

// Special pages
import DisplayBoardPage from '@/pages/display/DisplayBoardPage';
import KioskCheckinPage from '@/pages/display/KioskCheckinPage';

// Shared components
import ErrorPage from '@/components/ui/ErrorPage';

const router = createBrowserRouter([
  // ── Public routes (with Navbar + Footer) ────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/',                    element: <LandingPage /> },
      { path: '/hospitals',           element: <HospitalsPage /> },
      { path: '/hospitals/:id',       element: <HospitalDetailPage /> },
      { path: '/doctors/:id',         element: <DoctorProfilePage /> },
    ],
  },

  // ── Auth routes (minimal layout) ────────────────────────────
  {
    children: [
      { path: '/login',               element: <LoginPage /> },
      { path: '/register',            element: <RegisterPage /> },
      { path: '/verify-otp',          element: <VerifyOtpPage /> },
      { path: '/forgot-password',     element: <ForgotPasswordPage /> },
      { path: '/reset-password',      element: <ResetPasswordPage /> },
    ]
  },

  // ── Patient portal (sidebar layout) ─────────────────────────
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true,                  element: <PatientDashboard /> },
      { path: 'search',               element: <SearchPage /> },
      { path: 'book/:doctorId',       element: <BookingSlotPage /> },
      { path: 'book/details',         element: <BookingDetailsPage /> },
      { path: 'book/confirm',         element: <BookingConfirmPage /> },
      { path: 'book/success',         element: <BookingSuccessPage /> },
      { path: 'appointments',         element: <AppointmentsPage /> },
      { path: 'appointments/:id',     element: <AppointmentDetailPage /> },
      { path: 'queue/:appointmentId', element: <QueueTrackerPage /> },
      { path: 'notifications',        element: <NotificationsPage /> },
      { path: 'profile',              element: <ProfilePage /> },
      { path: 'family',               element: <FamilyPage /> },
    ],
  },

  // ── Hospital admin dashboard ─────────────────────────────────
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true,                  element: <AdminDashboard /> },
      { path: 'queue',                element: <QueueControlPage /> },
      { path: 'walk-in',              element: <WalkInPage /> },
      { path: 'checkin',              element: <CheckInPage /> },
      { path: 'doctors',              element: <DoctorsAdminPage /> },
      { path: 'reports',              element: <AdminReportsPage /> },
    ],
  },

  // ── Doctor view ──────────────────────────────────────────────
  {
    path: '/doctor',
    element: <AdminLayout />,
    children: [
      { index: true,            element: <DoctorDayPage /> },
      { path: 'queue',          element: <DoctorQueuePage /> },
    ],
  },

  // ── Super admin console ──────────────────────────────────────
  {
    path: '/super',
    element: <AdminLayout />,
    children: [
      { index: true,            element: <SuperDashboard /> },
      { path: 'hospitals',      element: <SuperHospitalsPage /> },
    ],
  },

  // ── Special full-screen pages (no shared layout) ─────────────
  { path: '/display/:hospitalId/:deptId', element: <DisplayBoardPage /> },
  { path: '/checkin/:hospitalId',         element: <KioskCheckinPage /> },

  // ── Catch-all 404 ────────────────────────────────────────────
  { path: '*', element: <ErrorPage code={404} /> },
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
