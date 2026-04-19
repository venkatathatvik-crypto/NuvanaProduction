import { motion } from "framer-motion";
import {
  User,
  Mail,
  Award,
  BookOpen,
  Star,
  Calendar,
  Camera,
  Loader2,
  ArrowLeft,
  School,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { useAuth } from "@/auth/AuthContext";
import { uploadProfilePhoto } from "@/services/profileService";
import { apiClient } from "@/lib/apiClient";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { WifiOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { schoolService } from "@/services/schoolService";
import { queryKeys } from "@/lib/queryKeys";
import { logger } from '@/lib/logger';
import { ConnectivityGuard } from "@/components/ConnectivityGuard";

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

const StudentProfile = () => {
  const navigate = useNavigate();
  const { profile, profileLoading, refreshProfile } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock logic for feedback activation (once a year)
  // For demo purposes, we'll toggle this with a state or just set it to true
  const [isFeedbackActive] = useState(true);

  // Fetch student data using React Query
  const { data: studentData, isLoading: loading } = useQuery({
    queryKey: ['student-profile', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const data = await apiClient.get(`/users/${profile.id}`);
      return data;
    },
    enabled: !!profile?.id && !profileLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh for 5 minutes
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

  // Must be called unconditionally — before any early returns
  const { isOnline } = useNetworkStatus();
  const userEmail = profile?.email || "";

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
      logger.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const isInitialLoading = (loading && !studentData) || (profileLoading && !profile);

  if (isInitialLoading) {
    return <ProfileSkeleton />;
  }

  if (!profile || !studentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg bg-zinc-900 border border-zinc-700 text-zinc-100">
          {!isOnline ? (
            <>
              <WifiOff className="h-4 w-4 text-orange-400 shrink-0" />
              <span>You&rsquo;re offline — profile not cached yet</span>
            </>
          ) : (
            <span>Unable to load student profile.</span>
          )}
        </div>
      </div>
    );
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
              onClick={() => navigate("/student")}
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
                ) : profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
                {/* Hover overlay */}
                <ConnectivityGuard message="You need to be online to change your profile photo.">
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </ConnectivityGuard>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {profile.name || "Student"}
              </h2>
              <p className="text-muted-foreground">
                {studentData?.student_details?.roll_number || profile.id}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {studentData?.student_details?.classes?.name && (
                  <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm border border-primary/20">
                    {studentData.student_details.classes.name}
                  </span>
                )}
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
                <User className="w-5 h-5 text-primary" /> Personal Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">
                      {userEmail || "Not available"}
                    </p>
                  </div>
                </div>
                {studentData?.student_details?.classes?.name && (
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Class</p>
                      <p className="font-medium">
                        {studentData.student_details.classes.name}
                      </p>
                    </div>
                  </div>
                )}
                {studentData?.student_details?.roll_number && (
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Roll Number
                      </p>
                      <p className="font-medium">
                        {studentData.student_details.roll_number}
                      </p>
                    </div>
                  </div>
                )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-neon-purple/20 text-neon-purple">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="text-2xl font-bold">
                    {studentData?.student_details?.roll_number ||
                      profile.id.slice(0, 8)}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="glass-card p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-neon-cyan/20 text-neon-cyan">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="text-lg font-bold">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card
              className={`glass-card p-6 border-l-4 ${isFeedbackActive ? "border-l-neon-pink" : "border-l-muted"
                }`}
            >
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Star
                      className={`w-5 h-5 ${isFeedbackActive
                          ? "text-neon-pink fill-neon-pink"
                          : "text-muted"
                        }`}
                    />
                    Annual Feedback
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isFeedbackActive
                      ? "The annual feedback survey is now open. Please share your thoughts."
                      : "Feedback survey is currently closed."}
                  </p>
                </div>
                <Button
                  className={`mt-4 w-full ${isFeedbackActive
                      ? "bg-neon-pink/20 text-neon-pink hover:bg-neon-pink/30"
                      : ""
                    }`}
                  disabled={!isFeedbackActive}
                  onClick={() => navigate("/student/feedback")}
                >
                  {isFeedbackActive ? "Give Feedback" : "Closed"}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
