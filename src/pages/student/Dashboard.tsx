import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  FileText,
  Bell,
  Award,
  Users,
  StickyNote,
  LogOut,
  BarChart2,
  Brain,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  getStudentData,
  getStudentAnnouncements,
  getOverallAttendancePercentage,
  getStudentAverageMarksPercentage,
  getStudentPendingTestsCount,
  getStudentPendingAssessmentsCount,
} from "@/services/academic";
import { getStudentTimetable, DAY_NAMES } from "@/services/timetableService";
import LoadingSpinner from "@/components/LoadingSpinner";
import NotificationBell from "@/components/NotificationBell";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence } from "framer-motion";

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, profile, profileLoading } = useAuth();

  // 1. Fetch Student Data (to get class_id)
  const { data: studentData, isLoading: loadingStudentData } = useQuery({
    queryKey: ['student-data', profile?.id],
    queryFn: () => getStudentData(profile!.id),
    enabled: !!profile?.id && !profileLoading,
  });

  const studentClassId = studentData?.class_id;

  // 2. Fetch Announcements
  const { data: announcements = [], isLoading: loadingAnnouncements } = useQuery({
    queryKey: ['student-announcements', studentClassId],
    queryFn: async () => {
      const data = await getStudentAnnouncements(studentClassId!);
      // Expiry logic
      const expiryDays = parseInt(import.meta.env.VITE_ANNOUNCEMENT_EXPIRY_DAYS || "7");
      const expiryMs = expiryDays * 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      
      return data.filter(announcement => {
        const createdTime = new Date(announcement.createdAt).getTime();
        return (now - createdTime) < expiryMs;
      });
    },
    enabled: !!studentClassId,
  });

  // 3. Fetch Attendance
  const { data: attendancePercentageRaw, isLoading: loadingAttendance } = useQuery({
    queryKey: ['student-attendance-percent', profile?.id],
    queryFn: () => getOverallAttendancePercentage(profile!.id),
    enabled: !!profile?.id,
  });
  const attendancePercentage = attendancePercentageRaw !== undefined ? Math.round(attendancePercentageRaw * 10) / 10 : null;

  // 4. Fetch Marks
  const { data: averageMarks = 0, isLoading: loadingMarks } = useQuery({
    queryKey: ['student-marks-percent', profile?.id],
    queryFn: () => getStudentAverageMarksPercentage(profile!.id),
    enabled: !!profile?.id,
  });

  // 5. Fetch Pending Tests
  const { data: pendingTests = 0, isLoading: loadingTests } = useQuery({
    queryKey: ['student-pending-tests', profile?.id],
    queryFn: () => getStudentPendingTestsCount(profile!.id),
    enabled: !!profile?.id,
  });

  // 6. Fetch Pending Assessments
  const { data: pendingAssessments = 0, isLoading: loadingAssessments } = useQuery({
    queryKey: ['student-pending-assessments', profile?.id],
    queryFn: () => getStudentPendingAssessmentsCount(profile!.id),
    enabled: !!profile?.id,
  });

  // 7. Fetch Timetable
  const { data: timetableData = {}, isLoading: loadingTodayClasses } = useQuery({
    queryKey: ['student-timetable', studentClassId, profile?.school_id],
    queryFn: () => getStudentTimetable(studentClassId!, profile!.school_id!),
    enabled: !!studentClassId && !!profile?.school_id,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Compute today's classes from timetable
  const todayClasses = (() => {
    const jsDay = new Date().getDay();
    const dayName = jsDay === 0 ? null : DAY_NAMES[jsDay - 1];
    if (dayName && timetableData[dayName]) {
      return timetableData[dayName].map((p: any) => ({
        subject: p.subject,
        time: p.time,
        room: p.room,
        teacher: p.teacher,
      }));
    }
    return [];
  })();

  const quickActions = [
    {
      label: "Attendance",
      value: loadingAttendance ? null : `${attendancePercentage}%`,
      icon: Users,
      color: "text-neon-blue",
      path: "/student/attendance",
    },
    {
      label: "Audio Notes",
      value: "Access",
      icon: StickyNote,
      color: "text-green-500",
      path: "/student/notes"
    },
    {
      label: "Books",
      value: "Library",
      icon: BookOpen,
      color: "text-neon-blue",
      path: "/student/books"
    },
    {
      label: "My Analytics",
      value: "View",
      icon: BarChart2,
      color: "text-green-500",
      path: "/student/analytics",
    },
    {
      label: "My Tests",
      value: loadingTests ? null : (pendingTests > 0 ? `${pendingTests} Pending` : "Take"),
      icon: FileText,
      color: "text-neon-purple",
      path: "/student/tests",
    },
    {
      label: "Timetable",
      value: "View",
      icon: Calendar,
      color: "text-green-500",
      path: "/student/timetable"
    },
    {
      label: "Assignments",
      value: loadingAssessments ? null : (pendingAssessments > 0 ? `${pendingAssessments} Pending` : "0"),
      icon: FileText,
      color: "text-neon-blue",
      path: "/student/events",
    },
    {
      label: "Report Card",
      value: loadingMarks ? null : `${averageMarks}%`,
      icon: Award,
      color: "text-green-500",
      path: "/student/marks",
    },
  ];

  // Critical loading check
  const isInitialLoading = profileLoading || loadingStudentData;

  // Get today's day name for display
  const jsDay = new Date().getDay();
  const todayDayName = jsDay === 0 ? "Sunday" : DAY_NAMES[jsDay - 1];

  if (isInitialLoading) {
    return (
      <div className="min-h-screen p-3 sm:p-6 opacity-60">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-3 shrink-0">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="glass-card p-3 sm:p-6 border-dashed border-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="w-10 h-10 rounded-lg opacity-20" />
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="glass-card p-4 sm:p-6 h-64">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </Card>
            <Card className="glass-card p-4 sm:p-6 h-64">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-2xl font-bold neon-text mb-1 sm:mb-2 truncate">
              Welcome back, {profile?.name || "Student"}!
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Here's what's happening today
            </p>
          </div>
          <div className="flex gap-3 sm:gap-4 shrink-0">
            <NotificationBell />
            <Button
              variant="outline"
              className="glass hover:neon-glow"
              onClick={() => navigate("/student/profile")}
            >
              <Users className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">My Profile</span>
            </Button>
            <Button
              variant="outline"
              className="glass hover:neon-glow text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </motion.div>

        {/* Quick Actions Grid - All actions at the top */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="glass-card p-3 sm:p-6 hover:neon-glow transition-all duration-300 cursor-pointer"
                onClick={() => navigate(action.path)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate font-medium">{action.label}</p>
                    <div className="mt-1">
                      {action.value === null ? (
                        <Skeleton className="h-5 w-16 sm:h-7 sm:w-20 bg-muted/30" />
                      ) : (
                        <p className={`font-bold truncate ${action.value === 'Library' ? 'text-xs sm:text-lg' : 'text-sm sm:text-xl'}`}>
                          {action.value}
                        </p>
                      )}
                    </div>
                  </div>
                  <action.icon className={`w-8 h-8 sm:w-10 sm:h-10 ${action.color} shrink-0 ml-2`} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Today's Classes and Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  <h2 className="text-lg sm:text-2xl font-semibold">Today's Classes</h2>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground bg-primary/10 px-2 sm:px-3 py-1 rounded-full">
                  {todayDayName}
                </span>
              </div>
              {loadingTodayClasses ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full bg-muted/30" />
                  <Skeleton className="h-16 w-full bg-muted/20" />
                </div>
              ) : todayClasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{todayDayName === "Sunday" ? "No classes on Sunday! 🎉" : "No classes scheduled for today"}</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {todayClasses.map((cls: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 sm:p-4 rounded-lg bg-muted/50 border border-border hover:border-primary transition-colors"
                    >
                      <h3 className="font-semibold text-base sm:text-lg">{cls.subject}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {cls.time}
                      </p>
                      <p className="text-xs text-muted-foreground">{cls.room} {cls.teacher && `• ${cls.teacher}`}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
                <h2 className="text-lg sm:text-2xl font-semibold">Announcements</h2>
              </div>
              {loadingAnnouncements ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full bg-muted/30" />
                  <Skeleton className="h-24 w-full bg-muted/20" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No announcements available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`p-4 rounded-lg border transition-colors ${announcement.isUrgent
                        ? "bg-destructive/10 border-destructive"
                        : "bg-muted/50 border-border hover:border-primary"
                        }`}
                    >
                      <h3 className="font-semibold">{announcement.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        {announcement.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(announcement.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;
