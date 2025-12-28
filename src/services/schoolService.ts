import { apiClient } from '@/lib/apiClient';

export const schoolService = {
  /**
   * Upload school logo
   */
  async uploadLogo(schoolId: string, file: File): Promise<{ logo_url: string; message: string }> {
    const formData = new FormData();
    formData.append('logo', file);

    // Use apiClient.uploadFile for proper FormData handling
    return apiClient.uploadFile(`/schools/${schoolId}/logo`, formData);
  },

  /**
   * Get school details
   */
  async getSchool(schoolId: string) {
    return apiClient.get(`/schools/${schoolId}`);
  },
};
