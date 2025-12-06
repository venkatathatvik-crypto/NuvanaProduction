import { supabase } from "@/supabase/client";

/**
 * Upload a profile photo to Supabase storage and update the profile
 */
export const uploadProfilePhoto = async (
  userId: string,
  file: File
): Promise<string | null> => {
  try {
    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("FILES_BUCKET")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("FILES_BUCKET")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update profile in database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      console.error("Profile update error:", updateError);
      throw updateError;
    }

    return publicUrl;
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    return null;
  }
};

/**
 * Delete the current profile photo
 */
export const deleteProfilePhoto = async (userId: string): Promise<boolean> => {
  try {
    // Update profile to remove avatar_url
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    return false;
  }
};
