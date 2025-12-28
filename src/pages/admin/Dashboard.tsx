import { motion } from "framer-motion";
import {
  Shield,
  School,
  Users,
  BookOpen,
  FileText,
  Calendar,
  BarChart2,
  UserPlus,
  Settings,
  LogOut,
  ClipboardList,
  MessageSquare,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useEffect, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import {
  getNotifications,
  type Notification,
} from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { logout, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    const fetchRecentNotifications = async () => {
      if (!profile?.id) {
        setLoadingNotifications(false);
        return;
      }

      try {
        const recentNotifications = await getNotifications(profile.id, 5);
        setNotifications(recentNotifications || []);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchRecentNotifications();
  }, [profile?.id]);

  const handleLogout = async () => {
    await logout();
    navigate("/admin-login");
  };

  const quickActions = [
    {
      label: "Academic Setup",
      icon: School,
      color: "text-blue-500",
      path: "/admin/academic",
      description: "Manage grades, classes, and subjects",
    },
    {
      label: "Members",
      icon: UserPlus,
      color: "text-orange-500",
      path: "/admin/members",
      description: "Manage teachers and students",
    },
    {
      label: "Assign Members",
      icon: ClipboardList,
      color: "text-yellow-500",
      path: "/admin/assignments",
      description: "Assign teachers or students to classes",
    },
    {
      label: "Exam & File Settings",
      icon: Settings,
      color: "text-indigo-500",
      path: "/admin/settings",
      description: "Manage exam types and file categories",
    },
    {
      label: "Timetable",
      icon: Calendar,
      color: "text-pink-500",
      path: "/admin/timetable",
      description: "Manage class timetables",
    },
    {
      label: "Communication",
      icon: MessageSquare,
      color: "text-green-500",
      path: "/admin/communication",
      description: "Message teachers and broadcast to parents",
    },
    {
      label: "My Profile",
      icon: User,
      color: "text-gray-500",
      path: "/admin/profile",
      description: "View and edit your profile",
    },
  ];

  const handleNotificationClick = (notification: Notification) => {
    if (notification.target_url) {
      navigate(notification.target_url);
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4"
        >
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2 truncate">
              Admin Dashboard 🛡️
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base truncate">
              Welcome back, {profile?.name || "Admin"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card
                  className="glass-card p-4 sm:p-6 cursor-pointer hover:border-primary/50 transition-all h-full"
                  onClick={() => navigate(action.path)}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div
                      className={`p-3 rounded-full bg-primary/10 ${action.color}`}
                    >
                      <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-sm sm:text-base">
                        {action.label}
                      </h3>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Recent Notifications
              </h2>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          {
                            addSuffix: true,
                          }
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
