import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "./pages/auth/Login";

import Index from "./pages/Index";

import StudentDashboard from "./pages/student/Dashboard";
import StudentAttendance from "./pages/student/Attendance";
import StudentMarks from "./pages/student/Marks";
import StudentBooks from "./pages/student/Books";
import StudentNotes from "./pages/student/Notes";
import StudentEvents from "./pages/student/Events";
import StudentTimetable from "./pages/student/Timetable";

import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherAttendance from "./pages/teacher/Attendance";
import TeacherMarks from "./pages/teacher/Marks";
import TeacherFiles from "./pages/teacher/Files";
import TeacherAnnouncements from "./pages/teacher/Announcements";
import TeacherTests from "./pages/teacher/Tests";
import TestCreate from "./pages/teacher/TestCreate";
import TestDetails from "./pages/teacher/TestDetails";
import AnalyticsDashboard from "./pages/teacher/Analytics";
import VoiceUpload from "./pages/teacher/VoiceUpload";
import AdminPanel from "./pages/teacher/AdminPanel";

import StudentTests from "./pages/student/Tests";
import TestTake from "./pages/student/TestTake";
import StudentProfile from "./pages/student/Profile";
import StudentFeedback from "./pages/student/Feedback";
import StudentAnalytics from "./pages/student/Analytics";
import TeacherProfile from "./pages/teacher/Profile";
import TeacherTasks from "./pages/teacher/Tasks";
import NotFound from "./pages/NotFound";

import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ThemeToggle";
import AuthRedirect from "./components/AuthRedirect";
import { InstallPWA } from "@/components/InstallPWA";

import AppBackgroundLayout from "./layouts/AppBackgroundLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider
        defaultTheme="dark"
        storageKey="vite-ui-theme"
        attribute="class"
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <InstallPWA />

          <BrowserRouter>
            <ThemeToggle />
            <AppBackgroundLayout>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/"
                  element={
                    <AuthRedirect>
                      <Index />
                    </AuthRedirect>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <AuthRedirect>
                      <Login />
                    </AuthRedirect>
                  }
                />


                {/* Student Protected Routes */}
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute role="student">
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/attendance"
                  element={
                    <ProtectedRoute role="student">
                      <StudentAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/marks"
                  element={
                    <ProtectedRoute role="student">
                      <StudentMarks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/books"
                  element={
                    <ProtectedRoute role="student">
                      <StudentBooks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/notes"
                  element={
                    <ProtectedRoute role="student">
                      <StudentNotes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/events"
                  element={
                    <ProtectedRoute role="student">
                      <StudentEvents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/timetable"
                  element={
                    <ProtectedRoute role="student">
                      <StudentTimetable />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/tests"
                  element={
                    <ProtectedRoute role="student">
                      <StudentTests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/tests/take/:testId"
                  element={
                    <ProtectedRoute role="student">
                      <TestTake />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/profile"
                  element={
                    <ProtectedRoute role="student">
                      <StudentProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/feedback"
                  element={
                    <ProtectedRoute role="student">
                      <StudentFeedback />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/analytics"
                  element={
                    <ProtectedRoute role="student">
                      <StudentAnalytics />
                    </ProtectedRoute>
                  }
                />

                {/* Teacher Protected Routes */}
                <Route
                  path="/teacher"
                  element={
                    <ProtectedRoute role="teacher">
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/attendance"
                  element={
                    <ProtectedRoute role="teacher">
                      <TeacherAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/marks"
                  element={
                    <ProtectedRoute role="teacher">
                      <TeacherMarks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/files"
                  element={
                    <ProtectedRoute role="teacher">
                      <TeacherFiles />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/announcements"
                  element={
                    <ProtectedRoute role="teacher">
                      <TeacherAnnouncements />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/tests"
                  element={
                    <ProtectedRoute role="teacher">
                      <TeacherTests />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/tests/create"
                  element={
                    <ProtectedRoute role="teacher">
                      <TestCreate />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/tests/:testId"
                  element={
                    <ProtectedRoute role="teacher">
                      <TestDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/analytics"
                  element={
                    <ProtectedRoute role="teacher">
                      <AnalyticsDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/voice-upload"
                  element={
                    <ProtectedRoute role="teacher">
                      <VoiceUpload />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={<AdminPanel />}
                />
                <Route
                  path="/teacher/profile"
                  element={
                    <ProtectedRoute role="teacher">
                      <TeacherProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher/tasks"
                  element={
                    <ProtectedRoute role="teacher">
                      <TeacherTasks />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppBackgroundLayout>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
