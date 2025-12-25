import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthRedirect from '@/components/AuthRedirect';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingSpinner';

// Lazy load all page components for code splitting
// Auth pages
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
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'));
const StudentAttendance = lazy(() => import('@/pages/student/Attendance'));
const StudentMarks = lazy(() => import('@/pages/student/Marks'));
const StudentBooks = lazy(() => import('@/pages/student/Books'));
const StudentNotes = lazy(() => import('@/pages/student/Notes'));
const StudentEvents = lazy(() => import('@/pages/student/Events'));
const StudentTimetable = lazy(() => import('@/pages/student/Timetable'));
const StudentTests = lazy(() => import('@/pages/student/Tests'));
const TestTake = lazy(() => import('@/pages/student/TestTake'));
const StudentProfile = lazy(() => import('@/pages/student/Profile'));
const StudentFeedback = lazy(() => import('@/pages/student/Feedback'));
const StudentAnalytics = lazy(() => import('@/pages/student/Analytics'));

// Teacher pages
const TeacherDashboard = lazy(() => import('@/pages/teacher/Dashboard'));
const TeacherAttendance = lazy(() => import('@/pages/teacher/Attendance'));
const TeacherMarks = lazy(() => import('@/pages/teacher/Marks'));
const TeacherFiles = lazy(() => import('@/pages/teacher/Files'));
const TeacherAnnouncements = lazy(() => import('@/pages/teacher/Announcements'));
const TeacherTests = lazy(() => import('@/pages/teacher/Tests'));
const TestCreate = lazy(() => import('@/pages/teacher/TestCreate'));
const TestDetails = lazy(() => import('@/pages/teacher/TestDetails'));
const AnalyticsDashboard = lazy(() => import('@/pages/teacher/Analytics'));
const VoiceUpload = lazy(() => import('@/pages/teacher/VoiceUpload'));
const TeacherCommunication = lazy(() => import('@/pages/teacher/Communication'));
const TeacherProfile = lazy(() => import('@/pages/teacher/Profile'));
const TeacherTasks = lazy(() => import('@/pages/teacher/Tasks'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminAcademic = lazy(() => import('@/pages/admin/Academic'));
const AdminMembers = lazy(() => import('@/pages/admin/Members'));
const AdminAssignments = lazy(() => import('@/pages/admin/Assignments'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminTimetable = lazy(() => import('@/pages/admin/Timetable'));
const AdminProfile = lazy(() => import('@/pages/admin/Profile'));

// Super Admin pages
const SuperAdminDashboard = lazy(() => import('@/pages/superadmin/SuperAdminDashboard'));

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
      <Route path="/ai-tutor" element={<ProtectedRoute><AiTutorPage /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute>} />
      <Route path="/student/marks" element={<ProtectedRoute role="student"><StudentMarks /></ProtectedRoute>} />
      <Route path="/student/books" element={<ProtectedRoute role="student"><StudentBooks /></ProtectedRoute>} />
      <Route path="/student/notes" element={<ProtectedRoute role="student"><StudentNotes /></ProtectedRoute>} />
      <Route path="/student/events" element={<ProtectedRoute role="student"><StudentEvents /></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute role="student"><StudentTimetable /></ProtectedRoute>} />
      <Route path="/student/tests" element={<ProtectedRoute role="student"><StudentTests /></ProtectedRoute>} />
      <Route path="/student/tests/take/:testId" element={<ProtectedRoute role="student"><TestTake /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
      <Route path="/student/feedback" element={<ProtectedRoute role="student"><StudentFeedback /></ProtectedRoute>} />
      <Route path="/student/analytics" element={<ProtectedRoute role="student"><StudentAnalytics /></ProtectedRoute>} />

      {/* Teacher Routes */}
      <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/attendance" element={<ProtectedRoute role="teacher"><TeacherAttendance /></ProtectedRoute>} />
      <Route path="/teacher/marks" element={<ProtectedRoute role="teacher"><TeacherMarks /></ProtectedRoute>} />
      <Route path="/teacher/files" element={<ProtectedRoute role="teacher"><TeacherFiles /></ProtectedRoute>} />
      <Route path="/teacher/announcements" element={<ProtectedRoute role="teacher"><TeacherAnnouncements /></ProtectedRoute>} />
      <Route path="/teacher/tests" element={<ProtectedRoute role="teacher"><TeacherTests /></ProtectedRoute>} />
      <Route path="/teacher/communication" element={<ProtectedRoute role="teacher"><TeacherCommunication /></ProtectedRoute>} />
      <Route path="/teacher/tests/create" element={<ProtectedRoute role="teacher"><TestCreate /></ProtectedRoute>} />
      <Route path="/teacher/tests/:testId" element={<ProtectedRoute role="teacher"><TestDetails /></ProtectedRoute>} />
      <Route path="/teacher/analytics" element={<ProtectedRoute role="teacher"><AnalyticsDashboard /></ProtectedRoute>} />
      <Route path="/teacher/voice-upload" element={<ProtectedRoute role="teacher"><VoiceUpload /></ProtectedRoute>} />
      <Route path="/teacher/profile" element={<ProtectedRoute role="teacher"><TeacherProfile /></ProtectedRoute>} />
      <Route path="/teacher/tasks" element={<ProtectedRoute role="teacher"><TeacherTasks /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute role="school_admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/academic" element={<ProtectedRoute role="school_admin"><AdminAcademic /></ProtectedRoute>} />
      <Route path="/admin/members" element={<ProtectedRoute role="school_admin"><AdminMembers /></ProtectedRoute>} />
      <Route path="/admin/assignments" element={<ProtectedRoute role="school_admin"><AdminAssignments /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="school_admin"><AdminSettings /></ProtectedRoute>} />
      <Route path="/admin/timetable" element={<ProtectedRoute role="school_admin"><AdminTimetable /></ProtectedRoute>} />
      <Route path="/admin/profile" element={<ProtectedRoute role="school_admin"><AdminProfile /></ProtectedRoute>} />

      {/* Super Admin Routes */}
      <Route path="/super-admin" element={<ProtectedRoute role="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);
