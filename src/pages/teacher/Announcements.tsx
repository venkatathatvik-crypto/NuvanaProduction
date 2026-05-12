import { motion } from "framer-motion";
import { ArrowLeft, Bell, Send, Trash2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  getTeacherClasses,
  getTeacherAnnouncements,
  createTeacherAnnouncement,
  deleteTeacherAnnouncement,
  createNotificationsForClass,
  getStudentIdsInClass,
  getStudentEmailsInClass,
  sendAnnouncementEmail,
  type TeacherAnnouncement,
} from "@/services/academic";
import type { FlattenedClass } from "@/schemas/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { OfflineEmptyState, useOfflineLoading } from "@/components/OfflineEmptyState";
import { ConnectivityGuard } from "@/components/ConnectivityGuard";
import { useAuth } from "@/auth/AuthContext";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { logger } from '@/lib/logger';

const TeacherAnnouncements = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<{ id: string; title: string } | null>(null);

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

  // Fetch teacher's announcements using React Query
  const { data: announcements = [], isLoading: announcementsLoading } = useQuery({
    queryKey: queryKeys.teacher.announcements(profile?.id ?? '', profile?.school_id ?? ''),
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      return await getTeacherAnnouncements(profile.id, profile.school_id);
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const classNames = classes.map((c) => c.class_name);

  const toggleClass = (className: string) => {
    setSelectedClasses((prev) =>
      prev.includes(className)
        ? prev.filter((c) => c !== className)
        : [...prev, className]
    );
  };

  const sendAnnouncement = async () => {
    if (!profile) {
      toast.error("You must be logged in to send announcements.");
      return;
    }

    if (!title || !message) {
      toast.error("Please fill in all fields");
      return;
    }
    if (selectedClasses.length === 0) {
      toast.error("Please select at least one class");
      return;
    }

    const classIds = classes
      .filter((cls) => selectedClasses.includes(cls.class_name))
      .map((cls) => cls.class_id);

    if (classIds.length === 0) {
      toast.error("Selected classes could not be matched.");
      return;
    }

    setSending(true);
    try {
      await createTeacherAnnouncement({
        title,
        message,
        isUrgent,
        classIds,
        teacherId: profile.id,
        schoolId: profile.school_id,
      });
      toast.success("Announcement sent successfully!");

      // Send notifications to students in all selected classes
      try {
        const allStudentIds: string[] = [];
        for (const classId of classIds) {
          const studentIds = await getStudentIdsInClass(classId);
          allStudentIds.push(...studentIds);
        }
        const uniqueStudentIds = [...new Set(allStudentIds)];
        await createNotificationsForClass(uniqueStudentIds, {
          school_id: profile.school_id,
          title: isUrgent ? "🚨 Urgent Announcement" : "New Announcement",
          message: `${title}`,
          notification_type: "announcement",
          is_urgent: isUrgent,
          target_url: "/student",
        });
      } catch (notifError) {
        logger.error("Failed to send notifications:", notifError);
      }

      // Send email notifications
      try {
        const allStudentEmails: string[] = [];
        for (const classId of classIds) {
          const emails = await getStudentEmailsInClass(classId);
          allStudentEmails.push(...emails);
        }
        const uniqueEmails = [...new Set(allStudentEmails)];
        await sendAnnouncementEmail(uniqueEmails, title, message, isUrgent);
      } catch (emailError) {
        logger.error("Failed to send emails:", emailError);
      }

      setTitle("");
      setMessage("");
      setIsUrgent(false);
      setSelectedClasses([]);

      // Invalidate caches so students see the announcement immediately
      queryClient.invalidateQueries({ queryKey: ['student-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.teacher.announcements(profile.id, profile.school_id) });
    } catch (error) {
      logger.error("Announcement send error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send announcement."
      );
    } finally {
      setSending(false);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setAnnouncementToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const deleteAnnouncement = async () => {
    if (!announcementToDelete) return;

    try {
      await deleteTeacherAnnouncement(announcementToDelete.id, selectedClasses[0]);
      toast.success("Announcement deleted successfully.");

      // Invalidate caches so students see the update immediately
      queryClient.invalidateQueries({ queryKey: ['student-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.teacher.announcements(profile?.id ?? '', profile?.school_id ?? '') 
      });
      
      // Refetch to update UI immediately
      await queryClient.refetchQueries({ 
        queryKey: queryKeys.teacher.announcements(profile?.id ?? '', profile?.school_id ?? '') 
      });
    } catch (error) {
      logger.error("Delete error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete announcement.";
      toast.error(message);
    } finally {
      setAnnouncementToDelete(null);
    }
  };

  const offlineLoading = useOfflineLoading(loadingClasses || announcementsLoading);

  if (offlineLoading) {
    return <OfflineEmptyState pageName="Announcements" />;
  }

  if (loadingClasses || announcementsLoading) {
    return <LoadingSpinner />;
  }

  if (classes.length === 0) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center text-xl font-semibold text-destructive">
        No classes available or assigned.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold neon-text">Announcements</h1>
            <p className="text-muted-foreground">
              Create and manage announcements
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary">
                  {announcements.length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-destructive">
                  {announcements.filter((a) => a.isUrgent).length}
                </p>
                <p className="text-sm text-muted-foreground">Urgent</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">
                  {announcements.reduce((acc, a) => acc + (a.views ?? 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">
                  {announcements.length > 0 ? (() => {
                    const lastDate = new Date(Math.max(...announcements.map(a => new Date(a.createdAt).getTime())));
                    if (isToday(lastDate)) return "Today";
                    if (isYesterday(lastDate)) return "Yesterday";
                    return formatDistanceToNow(lastDate, { addSuffix: true });
                  })() : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Last Posted</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Create New Announcement
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Title
                </label>
                <Input
                  placeholder="Enter announcement title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Message
                </label>
                <Textarea
                  placeholder="Enter announcement message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="glass min-h-[120px]"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-3 block">
                  Select Classes
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {classNames.map((className) => (
                    <div key={className} className="flex items-center gap-2">
                      <Checkbox
                        id={className}
                        checked={selectedClasses.includes(className)}
                        onCheckedChange={() => toggleClass(className)}
                      />
                      <label
                        htmlFor={className}
                        className="text-sm cursor-pointer"
                      >
                        {className}
                      </label>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="all"
                      checked={
                        classNames.length > 0 &&
                        selectedClasses.length === classNames.length
                      }
                      onCheckedChange={() => {
                        if (
                          classNames.length > 0 &&
                          selectedClasses.length === classNames.length
                        ) {
                          setSelectedClasses([]);
                        } else {
                          setSelectedClasses(classNames);
                        }
                      }}
                    />
                    <label
                      htmlFor="all"
                      className="text-sm cursor-pointer font-semibold"
                    >
                      All Classes
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="urgent"
                  checked={isUrgent}
                  onCheckedChange={(checked) => setIsUrgent(checked as boolean)}
                />
                <label
                  htmlFor="urgent"
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  Mark as urgent
                </label>
              </div>

              <div className="flex justify-end">
                <ConnectivityGuard message="Sending announcements requires an active internet connection.">
                  <Button
                    size="lg"
                    className="neon-glow px-8"
                    onClick={sendAnnouncement}
                    disabled={sending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? "Sending..." : "Send Announcement"}
                  </Button>
                </ConnectivityGuard>
              </div>
            </div>
          </Card>
        </motion.div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Announcements</h2>
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card
                  className={`glass-card p-6 hover:neon-glow transition-all ${
                    announcement.isUrgent ? "border-destructive" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold">
                          {announcement.title}
                        </h3>
                        {announcement.isUrgent && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-3">
                        {announcement.message}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {announcement.classes.map((cls) => (
                          <Badge key={cls.class_id} variant="secondary">
                            {cls.class_name}
                          </Badge>
                        ))}
                        <Badge variant="outline">
                          {(announcement.views ?? 0) + " views"}
                        </Badge>
                        <Badge variant="outline">
                          {
                            new Date(announcement.createdAt)
                              .toISOString()
                              .split("T")[0]
                          }
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDeleteClick(announcement.id, announcement.title)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={deleteAnnouncement}
        title="Delete Announcement"
        description={
          announcementToDelete
            ? `Are you sure you want to delete "${announcementToDelete.title}"? This action cannot be undone and students will no longer see this announcement.`
            : "Are you sure you want to delete this announcement?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default TeacherAnnouncements;
