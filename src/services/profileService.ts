import { apiClient } from "@/lib/apiClient";

/**
 * Upload a profile photo via the backend API
 * @param userId The ID of the user to upload the photo for
 * @param file The image file to upload
 * @returns The new avatar URL or null if failed
 */
export const uploadProfilePhoto = async (
  userId: string,
  file: File
): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.uploadFile<{ avatar_url: string }>(
      `/users/${userId}/avatar`,
      formData
    );

    return response.avatar_url;
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    return null;
  }
};

/**
 * Delete the current profile photo
 * @param userId The ID of the user to delete the photo for
 * @returns True if successful, false otherwise
 */
export const deleteProfilePhoto = async (userId: string): Promise<boolean> => {
  try {
    // Note: Use a dedicated endpoint if available, but for now we might have to use patch or implement delete endpoint.
    // Since I only implemented POST for upload, and DELETE only for user deletion, 
    // maybe we can skip DELETE photo specifically for this task unless explicitly requested.
    // Or we simply update profile with null avatar_url.

    await apiClient.patch(`/users/${userId}`, { avatar_url: null });
    return true;
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    return false;
  }
};
