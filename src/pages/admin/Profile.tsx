import { motion } from "framer-motion";
import { User, Mail, Shield, ArrowLeft, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useState, useRef } from "react";
import { schoolService } from "@/services/schoolService";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export default function AdminProfile() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch School Details using React Query
  const { data: schoolData, isLoading: schoolLoading } = useQuery({
    queryKey: queryKeys.school.details(profile?.school_id ?? ""),
    queryFn: async () => {
      if (!profile?.school_id) return null;
      return await schoolService.getSchool(profile.school_id);
    },
    enabled: !!profile?.school_id,
  });

  const logoUrl = schoolData?.logo_url;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files (JPEG, PNG, WebP) are allowed');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!profile?.school_id) {
      toast.error('School ID not found');
      return;
    }

    setUploading(true);
    try {
      await schoolService.uploadLogo(profile.school_id, file);
      // Invalidate school details query to refresh the logo
      queryClient.invalidateQueries({
        queryKey: queryKeys.school.details(profile.school_id),
      });
      toast.success('School logo uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Profile</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your admin profile and school settings</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Admin Profile Card */}
          <Card className="glass-card p-4 sm:p-6 lg:col-span-2">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{profile?.name || "Admin"}</h2>
                  <p className="text-muted-foreground">School Administrator</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-border">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{profile?.email || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <p className="font-medium">School Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* School Logo Card */}
          <Card className="glass-card p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">School Logo</h3>
              </div>

              {/* Logo Preview */}
              <div className="aspect-square w-full max-w-[200px] mx-auto rounded-xl border-2 border-dashed border-border bg-secondary/20 flex items-center justify-center overflow-hidden">
                {schoolLoading ? (
                  <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                ) : logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="School Logo"
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">No logo uploaded</p>
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="w-full"
                  variant="outline"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  JPEG, PNG, or WebP • Max 5MB
                </p>
              </div>

              {/* Info */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 leading-relaxed">
                  <strong>Tip:</strong> Use a square image (e.g., 512x512px) with a transparent background for best results.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
