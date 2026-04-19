import { lazy, Suspense, ComponentType, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthRedirect from '@/components/AuthRedirect';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';
import { OnlineOnlyGuard } from '@/components/OnlineOnlyGuard';
import { OfflineEmptyState } from '@/components/OfflineEmptyState';

/**
 * Wraps a dynamic import so that when the chunk fetch fails (e.g. offline)
 * it renders an offline fallback instead of crashing the error boundary.
 * When the network comes back, it reloads the page to retry the real import.
 */
function lazyWithOfflineFallback<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  pageName?: string
) {
  let hasFailed = false;

  return lazy(() =>
    factory().catch(() => {
      hasFailed = true;
      const OfflineFallback = () => {
        const [, setTick] = useState(0);
        useEffect(() => {
          if (!hasFailed) return;
          const onOnline = () => {
            // Network is back — reload the page so lazy() retries the real import
            window.location.reload();
          };
          window.addEventListener('online', onOnline);
          return () => window.removeEventListener('online', onOnline);
        }, []);
        return <OfflineEmptyState pageName={pageName} />;
      };
      return { default: OfflineFallback as unknown as T };
    })
  );
}

// Lazy load all page components for code splitting
// Auth pages (no offline fallback needed — can't auth offline anyway)
const Login = lazy(() => import('@/pages/auth/Login'));
const AdminLogin = lazy(() => import('@/pages/auth/AdminLogin'));
const SuperAdminLogin = lazy(() => import('@/pages/auth/SuperAdminLogin'));
const SuperAdminSignup = lazy(() => import('@/pages/auth/SuperAdminSignup'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));

// Public pages
const Index = lazy(() => import('@/pages/Index'));
const AiTutorPage = lazy(() => import('@/pages/AiTutorPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Student pages
const StudentDashboard = lazyWithOfflineFallback(() => import('@/pages/student/Dashboard'), 'Dashboard');
const StudentAttendance = lazyWithOfflineFallback(() => import('@/pages/student/Attendance'), 'Attendance');
const StudentMarks = lazyWithOfflineFallback(() => import('@/pages/student/Marks'), 'Marks');
const StudentBooks = lazyWithOfflineFallback(() => import('@/pages/student/Books'), 'Books');
const StudentNotes = lazyWithOfflineFallback(() => import('@/pages/student/Notes'), 'Notes');
const StudentEvents = lazyWithOfflineFallback(() => import('@/pages/student/Events'), 'Events');
const StudentTimetable = lazyWithOfflineFallback(() => import('@/pages/student/Timetable'), 'Timetable');
const StudentTests = lazyWithOfflineFallback(() => import('@/pages/student/Tests'), 'Tests');
const TestTake = lazyWithOfflineFallback(() => import('@/pages/student/TestTake'), 'Test');
const StudentProfile = lazyWithOfflineFallback(() => import('@/pages/student/Profile'), 'Profile');
const StudentFeedback = lazyWithOfflineFallback(() => import('@/pages/student/Feedback'), 'Feedback');
const StudentAnalytics = lazyWithOfflineFallback(() => import('@/pages/student/Analytics'), 'Analytics');

// Teacher pages
const TeacherDashboard = lazyWithOfflineFallback(() => import('@/pages/teacher/Dashboard'), 'Dashboard');
const TeacherAttendance = lazyWithOfflineFallback(() => import('@/pages/teacher/Attendance'), 'Attendance');
const TeacherMarks = lazyWithOfflineFallback(() => import('@/pages/teacher/Marks'), 'Marks');
const TeacherFiles = lazyWithOfflineFallback(() => import('@/pages/teacher/Files'), 'Files');
const TeacherAnnouncements = lazyWithOfflineFallback(() => import('@/pages/teacher/Announcements'), 'Announcements');
const TeacherTests = lazyWithOfflineFallback(() => import('@/pages/teacher/Tests'), 'Tests');
const TestCreate = lazyWithOfflineFallback(() => import('@/pages/teacher/TestCreate'), 'Test Creator');
const TestDetails = lazyWithOfflineFallback(() => import('@/pages/teacher/TestDetails'), 'Test Details');
const AnalyticsDashboard = lazyWithOfflineFallback(() => import('@/pages/teacher/Analytics'), 'Analytics');
const VoiceUpload = lazyWithOfflineFallback(() => import('@/pages/teacher/VoiceUpload'), 'Voice Upload');
const TeacherCommunication = lazyWithOfflineFallback(() => import('@/pages/teacher/Communication'), 'Communication');
const TeacherProfile = lazyWithOfflineFallback(() => import('@/pages/teacher/Profile'), 'Profile');
const TeacherTasks = lazyWithOfflineFallback(() => import('@/pages/teacher/Tasks'), 'Tasks');
const TeacherEngagement = lazyWithOfflineFallback(() => import('@/pages/teacher/Engagement'), 'Engagement');

// Admin pages
const AdminDashboard = lazyWithOfflineFallback(() => import('@/pages/admin/Dashboard'), 'Dashboard');
const AdminAcademic = lazyWithOfflineFallback(() => import('@/pages/admin/Academic'), 'Academic');
const AdminMembers = lazyWithOfflineFallback(() => import('@/pages/admin/Members'), 'Members');
const AdminAssignments = lazyWithOfflineFallback(() => import('@/pages/admin/Assignments'), 'Assignments');
const AdminSettings = lazyWithOfflineFallback(() => import('@/pages/admin/Settings'), 'Settings');
const AdminTimetable = lazyWithOfflineFallback(() => import('@/pages/admin/Timetable'), 'Timetable');
const AdminCommunication = lazyWithOfflineFallback(() => import('@/pages/admin/Communication'), 'Communication');
const AdminProfile = lazyWithOfflineFallback(() => import('@/pages/admin/Profile'), 'Profile');
const AdminEngagement = lazyWithOfflineFallback(() => import('@/pages/admin/Engagement'), 'Engagement');
const AdminLifeCoachBooks = lazyWithOfflineFallback(() => import('@/pages/admin/LifeCoachBooks'), 'Life Coach Books');

// Super Admin pages
const SuperAdminDashboard = lazyWithOfflineFallback(() => import('@/pages/superadmin/SuperAdminDashboard'), 'Dashboard');

/**
 * App Routes Component
 * All routes with lazy loading for optimal bundle splitting
 */
export const AppRoutes = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<AuthRedirect><Index /></AuthRedirect>} />
      <Route path="/login" element={<AuthRedirect><Login /></AuthRedirect>} />
      <Route path="/reset-password" element={<AuthRedirect><ResetPassword /></AuthRedirect>} />
      <Route path="/admin-login" element={<AuthRedirect><AdminLogin /></AuthRedirect>} />
      <Route path="/super-admin-login" element={<AuthRedirect><SuperAdminLogin /></AuthRedirect>} />
      <Route path="/super-admin-signup" element={<AuthRedirect><SuperAdminSignup /></AuthRedirect>} />
      <Route path="/ai-tutor" element={
        <ProtectedRoute>
          <OnlineOnlyGuard featureName="AI Tutor" reason="uses cloud AI models that run on our servers and cannot work offline.">
            <AiTutorPage />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute>} />
      <Route path="/student/marks" element={<ProtectedRoute role="student"><StudentMarks /></ProtectedRoute>} />
      <Route path="/student/books" element={<ProtectedRoute role="student"><StudentBooks /></ProtectedRoute>} />
      <Route path="/student/notes" element={<ProtectedRoute role="student"><StudentNotes /></ProtectedRoute>} />
      <Route path="/student/events" element={<ProtectedRoute role="student"><StudentEvents /></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute role="student"><StudentTimetable /></ProtectedRoute>} />
      <Route path="/student/tests" element={<ProtectedRoute role="student"><StudentTests /></ProtectedRoute>} />
      <Route path="/student/tests/take/:testId" element={
        <ProtectedRoute role="student">
          <OnlineOnlyGuard featureName="Test Player" reason="submits your answers to the server and cannot work offline.">
            <TestTake />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />
      <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
      <Route path="/student/feedback" element={
        <ProtectedRoute role="student">
          <OnlineOnlyGuard featureName="Feedback" reason="submits your feedback to the server and requires an active internet connection.">
            <StudentFeedback />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />
      <Route path="/student/analytics" element={<ProtectedRoute role="student"><StudentAnalytics /></ProtectedRoute>} />

      {/* Teacher Routes */}
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute role="teacher"><TeacherAttendance /></ProtectedRoute>} />
      <Route path="/teacher/marks" element={<ProtectedRoute role="teacher"><TeacherMarks /></ProtectedRoute>} />
      <Route path="/teacher/files" element={
        <ProtectedRoute role="teacher">
          <OnlineOnlyGuard featureName="File Manager" reason="uploads and downloads files from cloud storage and requires an internet connection.">
            <TeacherFiles />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />
      <Route path="/teacher/announcements" element={<ProtectedRoute role="teacher"><TeacherAnnouncements /></ProtectedRoute>} />
      <Route path="/teacher/tests" element={<ProtectedRoute role="teacher"><TeacherTests /></ProtectedRoute>} />
      <Route path="/teacher/communication" element={
        <ProtectedRoute role="teacher">
          <OnlineOnlyGuard featureName="Communication" reason="sends messages via WhatsApp and email which require an active internet connection.">
            <TeacherCommunication />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />
      <Route path="/teacher/tests/create" element={
        <ProtectedRoute role="teacher">
          <OnlineOnlyGuard featureName="Test Creator" reason="saves tests to the server and requires an active internet connection.">
            <TestCreate />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />
      <Route path="/teacher/tests/:testId" element={<ProtectedRoute role="teacher"><TestDetails /></ProtectedRoute>} />
      <Route path="/teacher/analytics" element={<ProtectedRoute role="teacher"><AnalyticsDashboard /></ProtectedRoute>} />
      <Route path="/teacher/voice-upload" element={
        <ProtectedRoute role="teacher">
          <OnlineOnlyGuard featureName="Voice Upload" reason="uploads audio recordings to cloud storage and requires an internet connection.">
            <VoiceUpload />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />
      <Route path="/teacher/profile" element={<ProtectedRoute role="teacher"><TeacherProfile /></ProtectedRoute>} />
      <Route path="/teacher/tasks" element={<ProtectedRoute role="teacher"><TeacherTasks /></ProtectedRoute>} />
      <Route path="/teacher/engagement" element={
        <ProtectedRoute role="teacher">
          <OnlineOnlyGuard featureName="Live Engagement" reason="is a real-time classroom tool that uses WebSockets and cannot work offline.">
            <TeacherEngagement />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />
      <Route path="/teacher/engagement/:sessionId" element={
        <ProtectedRoute role="teacher">
          <OnlineOnlyGuard featureName="Live Engagement Session" reason="is a real-time classroom tool that uses WebSockets and cannot work offline.">
            <TeacherEngagement />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute role="school_admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/academic" element={<ProtectedRoute role="school_admin"><AdminAcademic /></ProtectedRoute>} />
      <Route path="/admin/members" element={<ProtectedRoute role="school_admin"><AdminMembers /></ProtectedRoute>} />
      <Route path="/admin/assignments" element={<ProtectedRoute role="school_admin"><AdminAssignments /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="school_admin"><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/timetable" element={<ProtectedRoute role="school_admin"><AdminTimetable /></ProtectedRoute>} />
      <Route path="/admin/communication" element={
        <ProtectedRoute role="school_admin">
          <OnlineOnlyGuard featureName="Communication" reason="sends messages via WhatsApp and email which require an active internet connection.">
            <AdminCommunication />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />
      <Route path="/admin/profile" element={<ProtectedRoute role="school_admin"><AdminProfile /></ProtectedRoute>} />
      <Route path="/admin/engagement" element={
        <ProtectedRoute role="school_admin">
          <OnlineOnlyGuard featureName="Engagement Monitor" reason="displays live classroom data in real-time and requires an active internet connection.">
            <AdminEngagement />
          </OnlineOnlyGuard>
        </ProtectedRoute>
      } />

      <Route path="/admin/life-coach" element={<ProtectedRoute role="school_admin"><AdminLifeCoachBooks /></ProtectedRoute>} />

      {/* Super Admin Routes */}
      <Route path="/super-admin" element={<ProtectedRoute role="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);
