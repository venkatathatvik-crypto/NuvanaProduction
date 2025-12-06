import { motion } from "framer-motion";
import { ArrowLeft, Bell, Send, Trash2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getTeacherClasses,
  getTeacherAnnouncements,
  createTeacherAnnouncement,
  deleteTeacherAnnouncement,
  type TeacherAnnouncement,
} from "@/services/academic";
import type { FlattenedClass } from "@/schemas/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/auth/AuthContext";

const TeacherAnnouncements = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [classes, setClasses] = useState<FlattenedClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [announcements, setAnnouncements] = useState<TeacherAnnouncement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load teacher's classes dynamically using teacher_classes mapping
  useEffect(() => {
    const fetchClasses = async () => {
      if (profileLoading) return;

      if (!profile) {
        setClasses([]);
        setLoadingClasses(false);
        return;
      }

      try {
        const classResponse = await getTeacherClasses(profile.id, profile.school_id);
        if (classResponse && classResponse.length > 0) {
          setClasses(classResponse);
        } else {
          setClasses([]);
        }
      } catch (error) {
        console.error("Error fetching classes for announcements:", error);
        toast.error("Failed to load classes for announcements.");
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [profile, profileLoading]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (profileLoading) return;

      if (!profile) {
        setAnnouncements([]);
        setAnnouncementsLoading(false);
        return;
      }

      try {
        const data = await getTeacherAnnouncements(profile.id, profile.school_id);
        setAnnouncements(data);
      } catch (error) {
        console.error("Error fetching announcements:", error);
        toast.error("Failed to load announcements.");
        setAnnouncements([]);
      } finally {
        setAnnouncementsLoading(false);
      }
    };

    fetchAnnouncements();
  }, [profile, profileLoading]);

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
      const newAnnouncement = await createTeacherAnnouncement({
        title,
        message,
        isUrgent,
        classIds,
        teacherId: profile.id,
        schoolId: profile.school_id,
      });
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      toast.success("Announcement sent successfully!");
      setTitle("");
      setMessage("");
      setIsUrgent(false);
      setSelectedClasses([]);
    } catch (error) {
      console.error("Announcement send error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send announcement."
      );
    } finally {
      setSending(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteTeacherAnnouncement(id, selectedClasses[0]);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted successfully.");
    } catch (error) {
      console.error("Delete error:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete announcement.";
      toast.error(message);
    }
  };

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
                <p className="text-3xl font-bold text-secondary">
                  {announcements.reduce((acc, a) => acc + (a.views ?? 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-accent">Today</p>
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
                <Button
                  size="lg"
                  className="neon-glow px-8"
                  onClick={sendAnnouncement}
                  disabled={sending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "Sending..." : "Send Announcement"}
                </Button>
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
                      onClick={() => deleteAnnouncement(announcement.id)}
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
    </div>
  );
};

export default TeacherAnnouncements;
