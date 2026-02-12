import { motion } from "framer-motion";
import {
  Upload,
  Users,
  FileText,
  Bell,
  Calendar,
  TrendingUp,
  BarChart2,
  Mic,
  LogOut,
  CheckSquare,
  AlertCircle,
  MessageSquare,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { getTeacherClasses } from "@/services/academic";
import { FlattenedClass } from "@/schemas/academic";
import NotificationBell from "@/components/NotificationBell";
import { getNotifications, type Notification } from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingSpinner from "@/components/LoadingSpinner";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { logout, profile } = useAuth();

  // Fetch teacher's classes using React Query
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: queryKeys.teacher.classes(profile?.id ?? '', profile?.school_id ?? ''),
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      return await getTeacherClasses(profile.id, profile.school_id);
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch recent notifications using React Query
  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: queryKeys.teacher.notifications(profile?.id ?? '', 5),
    queryFn: async () => {
      if (!profile?.id) return [];
      return await getNotifications(profile.id, 5);
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
    navigate("/login");
  };

  const isInitialLoading = loadingClasses || (profile?.id && loadingNotifications);

  if (isInitialLoading && !classes.length) {
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
              <Skeleton key={i} className="h-24 sm:h-32 glass-card rounded-xl" />
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

  const quickActions = [
    { label: "Post Attendance", icon: Users, color: "text-blue-500", path: "/teacher/attendance" },
    { label: "Upload Files", icon: FileText, color: "text-green-500", path: "/teacher/files" },
    { label: "Send Announcement", icon: Bell, color: "text-blue-500", path: "/teacher/announcements" },
    { label: "Manage Tests", icon: FileText, color: "text-green-500", path: "/teacher/tests" },
    { label: "Analytics", icon: BarChart2, color: "text-blue-500", path: "/teacher/analytics" },
    { label: "Audio Notes", icon: Mic, color: "text-green-500", path: "/teacher/voice-upload" },
    { label: "My Tasks", icon: CheckSquare, color: "text-blue-500", path: "/teacher/tasks" },
    { label: "Communication", icon: MessageSquare, color: "text-green-500", path: "/teacher/communication" },
  ];

  const handleNotificationClick = (notification: Notification) => {
    if (notification.target_url) {
      navigate(notification.target_url);
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-2xl font-bold neon-text mb-1 sm:mb-2 truncate">Welcome, {profile?.name || "Teacher"}!</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your classes and students efficiently</p>
          </div>
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <NotificationBell />
            <Button variant="outline" className="glass hover:neon-glow" onClick={() => navigate("/teacher/profile")}>
              <Users className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">My Profile</span>
            </Button>
            <Button variant="outline" className="glass hover:neon-glow text-destructive hover:text-destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {quickActions.map((action, index) => (
            <motion.div key={action.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}>
              <Button className="w-full h-24 sm:h-32 glass-card hover:neon-glow flex flex-col gap-2 sm:gap-3 text-sm sm:text-lg" variant="outline" onClick={() => navigate(action.path)}>
                <action.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${action.color}`} />
                <span className="truncate px-1">{action.label}</span>
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-xl sm:text-2xl font-semibold">Class Overview</h2>
              </div>
              <div className="space-y-4">
                {loadingClasses && classes.length === 0 ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full bg-primary/5" />
                    <Skeleton className="h-16 w-full bg-primary/5" />
                  </div>
                ) : null}
                {classes.length > 0 ? (
                  <div className="space-y-4">
                    {classes.map((cls) => (
                      <div
                        key={cls.class_id}
                        className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {cls.class_name}
                            </h3>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !loadingClasses && (
                  <p className="text-muted-foreground text-center py-8">
                    No classes assigned yet.
                  </p>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 accent-blue-300 " />
                <h2 className="text-xl sm:text-2xl font-semibold">Recent Activity</h2>
              </div>
              <div className="space-y-4">
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full bg-accent/5" />
                    <Skeleton className="h-20 w-full bg-accent/5" />
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 rounded-lg bg-muted/50 border border-border hover:border-primary transition-colors ${notification.target_url ? 'cursor-pointer' : ''
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{notification.title}</p>
                            {!notification.is_read && (
                              <Badge variant="secondary" className="text-xs h-5">
                                New
                              </Badge>
                            )}
                            {notification.is_urgent && (
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                          {notification.message && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recent notifications
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="glass-card p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Upload marks regularly to keep students updated on their progress</li>
              <li>• Use announcements to communicate important information</li>
              <li>• Check attendance trends to identify students who need attention</li>
              <li>• Share study materials and resources to help students learn better</li>
            </ul>
          </Card>
        </motion.div>

      </div>
    </div>
  );
};

export default TeacherDashboard;
