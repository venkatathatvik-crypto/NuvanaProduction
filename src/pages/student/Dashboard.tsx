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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useEffect, useState } from "react";
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, profile, profileLoading } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [attendancePercentage, setAttendancePercentage] = useState<
    number | null
  >(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [averageMarks, setAverageMarks] = useState<number | null>(null);
  const [loadingMarks, setLoadingMarks] = useState(true);
  const [pendingTests, setPendingTests] = useState<number>(0);
  const [loadingTests, setLoadingTests] = useState(true);
  const [pendingAssessments, setPendingAssessments] = useState<number>(0);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [todayClasses, setTodayClasses] = useState<Array<{ subject: string; time: string; room: string }>>([]);
  const [loadingTodayClasses, setLoadingTodayClasses] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      if (profileLoading) return;

      if (!profile) {
        setLoadingAnnouncements(false);
        setLoadingAttendance(false);
        setLoadingMarks(false);
        setLoadingTests(false);
        setLoadingAssessments(false);
        setLoadingTodayClasses(false);
        return;
      }

      try {
        // Fetch all initial data in parallel
        const [attendance, marks, pending, assessments, studentData] = await Promise.all([
          getOverallAttendancePercentage(profile.id),
          getStudentAverageMarksPercentage(profile.id),
          getStudentPendingTestsCount(profile.id),
          getStudentPendingAssessmentsCount(profile.id),
          getStudentData(profile.id),
        ]);

        setAttendancePercentage(Math.round(attendance * 10) / 10);
        setAverageMarks(marks);
        setPendingTests(pending);
        setPendingAssessments(assessments);

        if (studentData && studentData.class_id) {
          setStudentClassId(studentData.class_id);
          
          // Fetch announcements and timetable in parallel (they depend on class_id)
          const [announcementsData, timetableData] = await Promise.all([
            getStudentAnnouncements(studentData.class_id),
            profile.school_id ? getStudentTimetable(studentData.class_id, profile.school_id) : Promise.resolve({}),
          ]);

          setAnnouncements(announcementsData);

          // Get today's classes from timetable
          const jsDay = new Date().getDay();
          const dayName = jsDay === 0 ? null : DAY_NAMES[jsDay - 1];
          
          if (dayName && timetableData[dayName]) {
            setTodayClasses(timetableData[dayName].map((p: any) => ({
              subject: p.subject,
              time: p.time,
              room: p.room,
              teacher: p.teacher,
            })));
          } else {
            setTodayClasses([]);
          }
        }
      } catch (error) {
        // Error fetching student data - silently fail
      } finally {
        setLoadingAnnouncements(false);
        setLoadingAttendance(false);
        setLoadingMarks(false);
        setLoadingTests(false);
        setLoadingAssessments(false);
        setLoadingTodayClasses(false);
      }
    };

    fetchStudentData();
  }, [profile, profileLoading]);

  const quickActions = [
    {
      label: "Attendance",
      value: loadingAttendance ? "..." : `${attendancePercentage}%`,
      icon: Users,
      color: "text-neon-blue",
      path: "/student/attendance",
    },
    {
      label: "Notes",
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
      value: loadingTests ? "..." : (pendingTests > 0 ? `${pendingTests} Pending` : "Take"),
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
      value: loadingAssessments ? "..." : (pendingAssessments > 0 ? `${pendingAssessments} Pending` : "0"),
      icon: FileText,
      color: "text-neon-blue",
      path: "/student/events",
    },
    {
      label: "Average Marks",
      value: loadingMarks ? "..." : `${averageMarks}%`,
      icon: Award,
      color: "text-green-500",
      path: "/student/marks",
    },
  ];

  // Get today's day name for display
  const jsDay = new Date().getDay();
  const todayDayName = jsDay === 0 ? "Sunday" : DAY_NAMES[jsDay - 1];

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
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2 truncate">
              Welcome back, {profile?.name || "Student"}! 👋
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{action.label}</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 truncate">{action.value}</p>
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
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
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
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
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
