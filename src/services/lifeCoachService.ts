import { apiClient } from '@/lib/apiClient';

export interface LifeCoachBook {
  id: string;
  title: string;
  category: string;
  categoryId: number;
  uploadedBy: string;
  uploadDate: string;
  ragStatus: string;
  ragError?: string;
  size?: string;
}

export const lifeCoachService = {
  async uploadBook(formData: FormData): Promise<LifeCoachBook> {
    return apiClient.uploadFile('/file-upload/life-coach-books', formData);
  },

  async getBooks(): Promise<LifeCoachBook[]> {
    return apiClient.get('/file-upload/life-coach-books');
  },

  async deleteBook(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/file-upload/life-coach-books/${id}`);
  },

  async getCategoriesWithContent(schoolId: string): Promise<string[]> {
    return apiClient.get(`/rag/life-coach/categories/${schoolId}`);
  },
};
