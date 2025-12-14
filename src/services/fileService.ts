// File upload, download, and management services
import { apiClient } from "@/lib/apiClient";

export interface TeacherFileItem {
  id: string;
  name: string;
  class: string;
  subject: string;
  category: string;
  storageUrl: string;
  storagePath: string;
  downloads: number;
  uploadDate: string;
  size?: string;
  fileType: 'pdf' | 'video';
}

export interface StudentFileItem {
  id: string;
  name: string;
  class: string;
  subject: string;
  category: string;
  storageUrl: string;
  storagePath: string;
  downloads: number;
  uploadDate: string;
  size?: string;
  fileType?: 'pdf' | 'video';
}

export interface UploadTeacherFileParams {
  file: File;
  title: string;
  categoryId: number;
  classId: string;
  gradeSubjectId: string;
  teacherId: string;
  schoolId: string;
  fileType: 'pdf' | 'video';
}

interface TeacherFileRow {
  id: string;
  file_title: string;
  storage_url: string;
  download_count: number | null;
  created_at: string;
  file_type?: string | null;
  file_categories: NamedEntity | NamedEntity[] | null;
  classes: NamedEntity | NamedEntity[] | null;
  grade_subjects:
    | {
        subjects_master: NamedEntity | NamedEntity[] | null;
      }
    | {
        subjects_master: NamedEntity | NamedEntity[] | null;
      }[]
    | null;
}

interface StoragePathRow {
  storage_url: string | null;
}

interface DownloadCountRow {
  download_count: number | null;
}

// Allowed MIME types for videos
const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
];

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB for PDFs

// Removed mapFileRecordToItem - backend API already returns properly formatted data

export const getTeacherFiles = async (
  teacherId: string,
  schoolId: string
): Promise<TeacherFileItem[]> => {
  try {
    const data = await apiClient.get<Array<{
      id: string;
      name: string;
      class: string;
      subject: string;
      category: string;
      storageUrl: string;
      storagePath: string;
      downloads: number;
      uploadDate: string;
      fileType: string;
      size?: string;
    }>>("/file-upload/files");

    return data.map((record) => ({
      id: record.id,
      name: record.name,
      class: record.class,
      subject: record.subject,
      category: record.category,
      storageUrl: record.storageUrl,
      storagePath: record.storagePath,
      downloads: record.downloads,
      uploadDate: record.uploadDate,
      fileType: record.fileType as 'pdf' | 'video',
      size: record.size,
    }));
  } catch (error) {
    console.error("Error fetching teacher files:", error);
    throw new Error("Failed to load uploaded files.");
  }
};

export const uploadTeacherFile = async (
  params: UploadTeacherFileParams
): Promise<TeacherFileItem> => {
  const { file, teacherId, schoolId, classId, gradeSubjectId, categoryId, title, fileType } = params;

  // Create FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("classId", classId);
  formData.append("gradeSubjectId", gradeSubjectId);
  formData.append("fileType", fileType);
  formData.append("teacherId", teacherId);
  formData.append("schoolId", schoolId);
  if (categoryId) {
    formData.append("categoryId", categoryId.toString());
  }

  try {
    const data = await apiClient.uploadFile<{
      id: string;
      name: string;
      class: string;
      subject: string;
      category: string;
      storageUrl: string;
      storagePath: string;
      downloads: number;
      uploadDate: string;
      fileType: string;
      size: string;
    }>("/file-upload/files", formData);

    return {
      id: data.id,
      name: data.name,
      class: data.class,
      subject: data.subject,
      category: data.category,
      storageUrl: data.storageUrl,
      storagePath: data.storagePath,
      downloads: data.downloads,
      uploadDate: data.uploadDate,
      fileType: data.fileType as 'pdf' | 'video',
      size: data.size,
    };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    throw new Error(error.message || "Failed to upload file.");
  }
};

const normalizeStoragePath = (
  rawPath: string | null | undefined
): string | null => {
  if (!rawPath) return null;
  if (!rawPath.startsWith("http")) {
    return rawPath.replace(/^\/+/, "");
  }

  try {
    const url = new URL(rawPath);
    const bucketMarker = `/${FILES_BUCKET}/`;
    const idx = url.pathname.indexOf(bucketMarker);
    if (idx !== -1) {
      return url.pathname
        .substring(idx + bucketMarker.length)
        .replace(/^\/+/, "");
    }
    return url.pathname.replace(/^\/+/, "");
  } catch {
    return rawPath;
  }
};

export const deleteTeacherFile = async (
  fileId: string,
  storagePath: string
): Promise<void> => {
  try {
    await apiClient.delete(`/file-upload/files/${fileId}`);
  } catch (error: any) {
    console.error("Error deleting file:", error);
    throw new Error(error.message || "Failed to delete file.");
  }
};

export const incrementFileDownload = async (
  fileId: string
): Promise<number> => {
  try {
    const data = await apiClient.post<{ downloadCount: number }>(
      `/file-upload/files/${fileId}/download`
    );
    return data.downloadCount;
  } catch (error: any) {
    console.error("Error incrementing download count:", error);
    throw new Error(error.message || "Failed to update download count.");
  }
};

// Get files filtered by class_id for students
export const getStudentFiles = async (
  classId: string,
  schoolId: string
): Promise<StudentFileItem[]> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const data = await apiClient.get<Array<{
      id: string;
      name: string;
      class: string;
      subject: string;
      category: string;
      storageUrl: string;
      storagePath: string;
      downloads: number;
      uploadDate: string;
      fileType: string;
      size?: string;
    }>>(`/file-upload/files/class/${classId}`);

    return data.map((record) => ({
      id: record.id,
      name: record.name,
      class: record.class,
      subject: record.subject,
      category: record.category,
      storageUrl: record.storageUrl,
      storagePath: record.storagePath,
      downloads: record.downloads,
      uploadDate: record.uploadDate,
      size: record.size,
      fileType: record.fileType as 'pdf' | 'video',
    }));
  } catch (error: any) {
    console.error("Error fetching student files:", error);
    throw new Error(error.message || "Failed to load files.");
  }
};
