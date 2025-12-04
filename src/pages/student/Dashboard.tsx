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
import LoadingSpinner from "@/components/LoadingSpinner";
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
        return;
      }

      try {
        // Fetch attendance percentage
        const attendance = await getOverallAttendancePercentage(profile.id);
        setAttendancePercentage(Math.round(attendance * 10) / 10);

        // Fetch average marks percentage
        const marks = await getStudentAverageMarksPercentage(profile.id);
        setAverageMarks(marks);

        // Fetch pending tests count (excluding Internal Assessments)
        const pending = await getStudentPendingTestsCount(profile.id);
        setPendingTests(pending);

        // Fetch pending Internal Assessments count
        const assessments = await getStudentPendingAssessmentsCount(profile.id);
        setPendingAssessments(assessments);

        // Get student data to get class_id
        const studentData = await getStudentData(profile.id);
        if (studentData && studentData.class_id) {
          setStudentClassId(studentData.class_id);
          // Fetch announcements for this class
          const announcementsData = await getStudentAnnouncements(
            studentData.class_id
          );
          setAnnouncements(announcementsData);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      } finally {
        setLoadingAnnouncements(false);
        setLoadingAttendance(false);
        setLoadingMarks(false);
        setLoadingTests(false);
        setLoadingAssessments(false);
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

  const todayClasses = [
    { subject: "Mathematics", time: "9:00 AM - 10:30 AM", room: "Room 301" },
    { subject: "Physics", time: "11:00 AM - 12:30 PM", room: "Lab 2" },
    {
      subject: "Computer Science",
      time: "2:00 PM - 3:30 PM",
      room: "Room 105",
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold neon-text mb-2">
              Welcome back, {profile?.name || "Student"}! 👋
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening today
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="glass hover:neon-glow"
              onClick={() => navigate("/student/profile")}
            >
              <Users className="mr-2 w-4 h-4" />
              My Profile
            </Button>
            <Button
              variant="outline"
              className="glass hover:neon-glow text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 w-4 h-4" />
              Logout
            </Button>
          </div>
        </motion.div>

        {/* Quick Actions Grid - All actions at the top */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="glass-card p-6 hover:neon-glow transition-all duration-300 cursor-pointer"
                onClick={() => navigate(action.path)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{action.label}</p>
                    <p className="text-2xl font-bold mt-2">{action.value}</p>
                  </div>
                  <action.icon className={`w-10 h-10 ${action.color}`} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Today's Classes and Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-semibold">Today's Classes</h2>
              </div>
              <div className="space-y-4">
                {todayClasses.map((cls, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary transition-colors"
                  >
                    <h3 className="font-semibold text-lg">{cls.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {cls.time}
                    </p>
                    <p className="text-xs text-muted-foreground">{cls.room}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="mr-2 h-6 text-yellow-500" />
                <h2 className="text-2xl font-semibold">Announcements</h2>
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
