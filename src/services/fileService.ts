// File upload, download, and management services
import { supabase, FILES_BUCKET, NamedEntity, resolveName } from "./types";

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

const mapFileRecordToItem = (record: TeacherFileRow): TeacherFileItem => {
  const { data: publicUrlData } = supabase.storage
    .from(FILES_BUCKET)
    .getPublicUrl(record.storage_url);

  const categoryName = resolveName(record.file_categories);
  const className = resolveName(record.classes);

  let subjectName: string | undefined;
  if (Array.isArray(record.grade_subjects)) {
    subjectName = resolveName(record.grade_subjects[0]?.subjects_master);
  } else {
    subjectName = resolveName(record.grade_subjects?.subjects_master);
  }

  return {
    id: record.id,
    name: record.file_title,
    class: className ?? "Unknown Class",
    subject: subjectName ?? "Unknown Subject",
    category: categoryName ?? "Unknown Category",
    storageUrl: publicUrlData.publicUrl,
    storagePath: record.storage_url,
    downloads: record.download_count ?? 0,
    uploadDate: record.created_at,
    fileType: (record.file_type as 'pdf' | 'video') ?? 'pdf',
  };
};

export const getTeacherFiles = async (
  teacherId: string,
  schoolId: string
): Promise<TeacherFileItem[]> => {
  const { data, error } = await supabase
    .from("files")
    .select(
      `
      id,
      file_title,
      storage_url,
      download_count,
      created_at,
      file_type,
      class_id,
      grade_subject_id,
      category_id,
      file_categories ( id, name ),
      classes ( id, name ),
      grade_subjects (
        subjects_master ( name )
      )
    `
    )
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load uploaded files.");
  }

  if (!data) {
    return [];
  }

  return data.map((record) => mapFileRecordToItem(record as TeacherFileRow));
};

export const uploadTeacherFile = async (
  params: UploadTeacherFileParams
): Promise<TeacherFileItem> => {
  const { file, teacherId, classId, gradeSubjectId, categoryId, title, fileType, schoolId } =
    params;

  // Validate file type
  if (fileType === 'pdf') {
    if (file.type !== "application/pdf") {
      throw new Error("Only PDF files are allowed for documents.");
    }
    if (file.size > MAX_PDF_SIZE) {
      throw new Error("PDF file size must be 10MB or less.");
    }
  } else if (fileType === 'video') {
    if (!VIDEO_MIME_TYPES.includes(file.type)) {
      throw new Error("Only video files (MP4, WebM, OGG, MOV, AVI, WMV) are allowed.");
    }
    if (file.size > MAX_VIDEO_SIZE) {
      throw new Error("Video file size must be 100MB or less.");
    }
  }

  const filePath = `${teacherId}/${Date.now()}-${file.name}`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from(FILES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (storageError || !storageData) {
    throw new Error("Failed to upload file.");
  }

  const { data, error } = await supabase
    .from("files")
    .insert({
      file_title: title,
      category_id: categoryId,
      class_id: classId,
      grade_subject_id: gradeSubjectId,
      storage_url: storageData.path,
      teacher_id: teacherId,
      school_id: schoolId,
      file_type: fileType,
    })
    .select(
      `
      id,
      file_title,
      storage_url,
      download_count,
      created_at,
      file_type,
      file_categories ( id, name ),
      classes ( id, name ),
      grade_subjects (
        subjects_master ( name )
      )
    `
    )
    .single();

  if (error || !data) {
    throw new Error("Failed to save file information.");
  }

  const mapped = mapFileRecordToItem(data as TeacherFileRow);
  mapped.size = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  return mapped;
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
  let normalizedPath = normalizeStoragePath(storagePath);

  if (!normalizedPath) {
    const { data, error } = await supabase
      .from("files")
      .select("storage_url")
      .eq("id", fileId)
      .single<StoragePathRow>();

    if (error) {
      throw new Error("Failed to locate file path.");
    }
    normalizedPath = normalizeStoragePath(data?.storage_url);
  }

  if (!normalizedPath) {
    throw new Error("File path missing; cannot delete from storage.");
  }

  const { error: storageError } = await supabase.storage
    .from(FILES_BUCKET)
    .remove([normalizedPath]);

  if (storageError) {
    throw new Error("Failed to delete file from storage.");
  }

  const { error: deleteError } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (deleteError) {
    throw new Error("Failed to delete file record.");
  }
};

export const incrementFileDownload = async (
  fileId: string
): Promise<number> => {
  const { data, error } = await supabase
    .from("files")
    .select("download_count")
    .eq("id", fileId)
    .single<DownloadCountRow>();

  if (error) {
    throw new Error("Failed to fetch download count.");
  }

  const nextCount = (data?.download_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from("files")
    .update({ download_count: nextCount })
    .eq("id", fileId);

  if (updateError) {
    throw new Error("Failed to update download count.");
  }

  return nextCount;
};

// Get files filtered by class_id for students
export const getStudentFiles = async (
  classId: string,
  schoolId: string
): Promise<StudentFileItem[]> => {
  const { data, error } = await supabase
    .from("files")
    .select(
      `
      id,
      file_title,
      storage_url,
      download_count,
      created_at,
      file_type,
      class_id,
      file_categories ( id, name ),
      classes ( id, name ),
      grade_subjects (
        subjects_master ( name )
      )
    `
    )
    .eq("class_id", classId)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load files.");
  }

  if (!data) {
    return [];
  }

  return data.map((record) => mapFileRecordToItem(record as TeacherFileRow));
};
