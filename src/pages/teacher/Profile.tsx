import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Briefcase,
  BookOpen,
  Users,
  Loader2,
  Calendar,
  Camera,
  ArrowLeft,
  School,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { uploadProfilePhoto } from "@/services/profileService";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { schoolService } from "@/services/schoolService";
import { queryKeys } from "@/lib/queryKeys";

const ProfileSkeleton = () => (
  <div className="min-h-screen p-6 animate-in fade-in duration-500">
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card p-6 flex flex-col items-center space-y-4">
          <Skeleton className="w-32 h-32 rounded-full" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </Card>
        <Card className="glass-card p-6 md:col-span-2 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                <Skeleton className="w-5 h-5 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="glass-card p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-8 w-24 rounded-md" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

const TeacherProfile = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch assigned classes using React Query
  const { data: assignedClasses = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['teacher-classes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const classesData = await academicService.getClassesByTeacher(profile.id);
      return classesData || [];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch subjects using React Query
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['teacher-subjects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const subjectsData = await academicService.getSubjectsByTeacher(profile.id);
      if (subjectsData) {
        // Get unique subject names
        const subjectNames = [
          ...new Set(
            subjectsData
              .map((ts: any) => ts.grade_subjects?.subjects_master?.name)
              .filter(Boolean)
          ),
        ] as string[];
        return subjectNames;
      }
      return [];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch school details
  const { data: schoolData } = useQuery({
    queryKey: queryKeys.school.details(profile?.school_id ?? ""),
    queryFn: async () => {
      if (!profile?.school_id) return null;
      return await schoolService.getSchool(profile.school_id);
    },
    enabled: !!profile?.school_id,
  });

  const loading = loadingClasses || loadingSubjects;

  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size should be less than 2MB");
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await uploadProfilePhoto(profile.id, file);
      if (url) {
        await refreshProfile();
        toast.success("Profile photo updated!");
      } else {
        toast.error("Failed to upload photo");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading || !profile) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/teacher")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <h1 className="text-4xl font-bold neon-text">My Profile</h1>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1"
          >
            <Card className="glass-card p-6 flex flex-col items-center text-center h-full">
              <div
                className="w-32 h-32 rounded-full bg-secondary/50 flex items-center justify-center mb-4 border-2 border-primary/50 relative overflow-hidden group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {profile?.name || "Teacher"}
              </h2>
              <p className="text-muted-foreground text-sm">{profile?.email}</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/20">
                  Teacher
                </span>
                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm border border-accent/20">
                  {assignedClasses.length} Classes
                </span>
              </div>
            </Card>
          </motion.div>

          {/* Details Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2"
          >
            <Card className="glass-card p-6 h-full">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Profile Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile?.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium">{profile?.role || "Teacher"}</p>
                  </div>
                </div>
                {schoolData?.name && (
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                    <School className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">School</p>
                      <p className="font-medium">{schoolData.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Stats & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card p-6 h-full">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-500" /> Subjects Taught
              </h3>
              <div className="flex flex-wrap gap-2">
                {subjects.length > 0 ? (
                  subjects.map((subject) => (
                    <span
                      key={subject}
                      className="px-3 py-1 rounded-md bg-secondary/50 border border-white/10"
                    >
                      {subject}
                    </span>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No subjects assigned yet
                  </p>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card p-6 h-full">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-neon-purple" /> Assigned Classes
              </h3>
              <div className="flex flex-wrap gap-2">
                {assignedClasses.length > 0 ? (
                  assignedClasses.map((tc) => (
                    <span
                      key={tc?.id}
                      className="px-3 py-1 rounded-md bg-secondary/50 border border-white/10"
                    >
                      {tc?.classes?.name}{" "}
                      {(tc?.classes as any)?.grade_levels?.name &&
                        `(${(tc.classes as any).grade_levels.name})`}
                    </span>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No classes assigned yet
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
