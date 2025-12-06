import { supabase } from "@/supabase/client";
import { NestedClass, FlattenedClass } from "@/schemas/academic";
export type { FlattenedClass, NestedClass };

interface RawSubjectData {
  subject_master_id: string;
  subjects_master: { name: string } | { name: string }[];
}

interface TeacherClassRow {
  class_id: string;
  classes: NestedClass | NestedClass[] | null;
}

interface GradeSubjectRow {
  id: string;
  subjects_master:
  | {
    name: string;
  }
  | {
    name: string;
  }[]
  | null;
}

const FILES_BUCKET =
  import.meta.env?.VITE_SUPABASE_FILES_BUCKET?.toString() || "FILES_BUCKET";
const VOICE_NOTES_BUCKET =
  import.meta.env?.VITE_SUPABASE_VOICE_NOTES_BUCKET?.toString() ||
  "FILES_BUCKET";

export interface GradeSubjectOption {
  id: string;
  name: string;
}

export interface FileCategoryOption {
  id: number;
  name: string;
}

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

interface UploadTeacherFileParams {
  file: File;
  title: string;
  categoryId: number;
  classId: string;
  gradeSubjectId: string;
  teacherId: string;
  schoolId: string;
  fileType: 'pdf' | 'video';
}

interface NamedEntity {
  name: string;
}

type NamedClass = {
  id: string;
  name: string;
};

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

export interface TeacherAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: string;
  classes: { class_id: string; class_name: string }[];
  views?: number;
}

interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  is_urgent: boolean;
  created_at: string;
  announcement_classes: {
    class_id: string;
    classes: NamedClass | NamedClass[] | null;
  }[];
}

interface AnnouncementInsertResult {
  id: string;
}

export const getClasses = async (schoolId: string): Promise<FlattenedClass[]> => {
  const { data: rawData, error } = await supabase.from("classes").select(`
    id,
    name,
    grade_levels (
      id,
      name
    )
  `)
  .eq("school_id", schoolId);

  if (error) {
    console.error("Error fetching classes:", error);
    throw new Error("Failed to load class data.");
  }

  if (!rawData) {
    return [];
  }

  // 3. Client-Side Mapping (Transformation)
  const flattenedClasses: FlattenedClass[] = rawData.map(
    (item: NestedClass) => {
      const gradeData = Array.isArray(item.grade_levels)
        ? item.grade_levels[0]
        : item.grade_levels;

      return {
        class_id: item.id,
        class_name: item.name,
        grade_id: gradeData ? gradeData.id : 0,
        grade_name: gradeData ? gradeData.name : "Unknown Grade",
      };
    }
  );

  return flattenedClasses;
};

export const getExamTypes = async (schoolId: string): Promise<string[]> => {
  const { data, error } = await supabase.from("exam_types").select("name")
    .eq("school_id", schoolId);
  if (error) {
    console.error("Error fetching exam types:", error);
    throw new Error("Failed to load exam types.");
  }
  if (!data) {
    return [];
  }
  return data.map((item) => item.name);
};

export const getSubjects = async (gradeLevelId: number): Promise<string[]> => {
  const { data: grade_subjects, error } = await supabase
    .from("grade_subjects")
    .select(
      `
      subject_master_id,
      subjects_master (
        name
      )
    `
    )
    .eq("grade_level_id", gradeLevelId);

  if (error) {
    console.error("Error fetching subjects:", error);
    throw new Error("Failed to load subjects.");
  }
  if (!grade_subjects) {
    return [];
  }

  return grade_subjects
    .map((item: RawSubjectData) => {
      const masterSubject = item.subjects_master;

      if (Array.isArray(masterSubject) && masterSubject.length > 0) {
        return masterSubject[0].name;
      }

      if (
        masterSubject &&
        typeof masterSubject === "object" &&
        "name" in masterSubject
      ) {
        return masterSubject.name;
      }

      return null;
    })
    .filter((name): name is string => name !== null); // Filter out any null values
};

export const getFileCategories = async (schoolId: string): Promise<FileCategoryOption[]> => {
  const { data, error } = await supabase
    .from("file_categories")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");
  if (error) {
    console.error("Error fetching file categories:", error);
    throw new Error("Failed to load file categories.");
  }
  if (!data) {
    return [];
  }
  return data.map((item) => ({
    id: item.id,
    name: item.name,
  }));
};

export const getTeacherClasses = async (
  teacherId: string,
  schoolId: string
): Promise<FlattenedClass[]> => {
  console.log("[getTeacherClasses] Filtering by teacher_id:", teacherId);
  const { data, error } = await supabase
    .from("teacher_classes")
    .select(
      `
      class_id,
      classes (
        id,
        name,
        grade_levels (
          id,
          name
        )
      )
    `
    )
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId);

  if (error) {
    console.error("Error fetching teacher classes:", error);
    throw new Error("Failed to load teacher classes.");
  }

  console.log(
    "[getTeacherClasses] Found",
    data?.length || 0,
    "classes for teacher",
    teacherId
  );
  if (data && data.length > 0) {
    console.log(
      "[getTeacherClasses] Class names:",
      data.map((item: any) => {
        const classData = Array.isArray(item.classes)
          ? item.classes[0]
          : item.classes;
        return classData?.name || "Unknown";
      })
    );
  }

  if (!data) {
    return [];
  }

  const flattenedClasses: FlattenedClass[] = data
    .map((item: TeacherClassRow) => {
      const classData = Array.isArray(item.classes)
        ? item.classes[0]
        : item.classes;

      if (!classData) return null;

      const gradeData = Array.isArray(classData.grade_levels)
        ? classData.grade_levels[0]
        : classData.grade_levels;

      return {
        class_id: classData.id,
        class_name: classData.name,
        grade_id: gradeData ? gradeData.id : 0,
        grade_name: gradeData ? gradeData.name : "Unknown Grade",
      };
    })
    .filter((cls): cls is FlattenedClass => cls !== null);

  return flattenedClasses;
};

export const getGradeSubjectsDetailed = async (
  gradeLevelId: number
): Promise<GradeSubjectOption[]> => {
  const { data, error } = await supabase
    .from("grade_subjects")
    .select(
      `
      id,
      subjects_master (
        name
      )
    `
    )
    .eq("grade_level_id", gradeLevelId);

  if (error) {
    console.error("Error fetching grade subjects:", error);
    throw new Error("Failed to load subjects.");
  }

  if (!data) {
    return [];
  }

  return data
    .map((item: GradeSubjectRow) => {
      let subjectName: string | null = null;
      if (Array.isArray(item.subjects_master)) {
        subjectName =
          item.subjects_master.length > 0 ? item.subjects_master[0].name : null;
      } else if (item.subjects_master) {
        subjectName = item.subjects_master.name;
      }

      if (!subjectName) {
        return null;
      }

      return {
        id: item.id,
        name: subjectName,
      };
    })
    .filter((option): option is GradeSubjectOption => option !== null);
};

const resolveName = (
  entity: NamedEntity | NamedEntity[] | null | undefined
): string | undefined => {
  if (!entity) return undefined;
  if (Array.isArray(entity)) {
    return entity.length > 0 ? entity[0]?.name : undefined;
  }
  return entity.name;
};

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
    console.error("Error fetching teacher files:", error);
    throw new Error("Failed to load uploaded files.");
  }

  if (!data) {
    return [];
  }

  return data.map((record) => mapFileRecordToItem(record as TeacherFileRow));
};

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
const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5MB for PDFs

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
      throw new Error("PDF file size must be 5MB or less.");
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
    console.error("Error uploading file to storage:", storageError);
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
    console.error("Error saving file metadata:", error);
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
      console.error("Error fetching storage path:", error);
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
    console.error("Error deleting from storage:", storageError);
    throw new Error("Failed to delete file from storage.");
  }

  const { error: deleteError } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (deleteError) {
    console.error("Error deleting file record:", deleteError);
    throw new Error("Failed to delete file record.");
  }
};

interface DownloadCountRow {
  download_count: number | null;
}

export const incrementFileDownload = async (
  fileId: string
): Promise<number> => {
  const { data, error } = await supabase
    .from("files")
    .select("download_count")
    .eq("id", fileId)
    .single<DownloadCountRow>();

  if (error) {
    console.error("Error fetching download count:", error);
    throw new Error("Failed to fetch download count.");
  }

  const nextCount = (data?.download_count ?? 0) + 1;
  const { error: updateError } = await supabase
    .from("files")
    .update({ download_count: nextCount })
    .eq("id", fileId);

  if (updateError) {
    console.error("Error updating download count:", updateError);
    throw new Error("Failed to update download count.");
  }

  return nextCount;
};

const mapAnnouncementRecord = (
  record: AnnouncementRow
): TeacherAnnouncement => {
  const classes =
    record.announcement_classes?.map((item) => {
      const classData = Array.isArray(item.classes)
        ? item.classes[0]
        : item.classes;
      return {
        class_id: item.class_id,
        class_name: classData?.name ?? "Unknown Class",
      };
    }) ?? [];

  return {
    id: record.id,
    title: record.title,
    message: record.message,
    isUrgent: record.is_urgent,
    createdAt: record.created_at,
    classes,
    views: 0,
  };
};

export const getTeacherAnnouncements = async (
  teacherId: string,
  schoolId: string
): Promise<TeacherAnnouncement[]> => {
  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      id,
      title,
      message,
      is_urgent,
      created_at,
      announcement_classes (
        class_id,
        classes (
          id,
          name
        )
      )
    `
    )
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching announcements:", error);
    throw new Error("Failed to load announcements.");
  }

  if (!data) {
    return [];
  }

  return data.map((record) => mapAnnouncementRecord(record as AnnouncementRow));
};

interface CreateAnnouncementParams {
  title: string;
  message: string;
  isUrgent: boolean;
  classIds: string[];
  teacherId: string;
  schoolId: string;
}

export const createTeacherAnnouncement = async (
  params: CreateAnnouncementParams
): Promise<TeacherAnnouncement> => {
  const { title, message, isUrgent, classIds, teacherId, schoolId } = params;

  const { data: announcementData, error: announcementError } = await supabase
    .from("announcements")
    .insert({
      title,
      message,
      is_urgent: isUrgent,
      teacher_id: teacherId,
      school_id: schoolId,
    })
    .select("id, created_at")
    .single<AnnouncementInsertResult>();

  if (announcementError || !announcementData) {
    console.error("Error creating announcement:", announcementError);
    throw new Error("Failed to create announcement.");
  }

  if (classIds.length > 0) {
    const rows = classIds.map((classId) => ({
      announcement_id: announcementData.id,
      class_id: classId,
    }));

    const { error: classError } = await supabase
      .from("announcement_classes")
      .insert(rows);

    if (classError) {
      console.error("Error linking announcement classes:", classError);
      throw new Error("Failed to link announcement classes.");
    }
  }

  // Fetch full record for mapping
  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      id,
      title,
      message,
      is_urgent,
      created_at,
      announcement_classes (
        class_id,
        classes (
          id,
          name
        )
      )
    `
    )
    .eq("id", announcementData.id)
    .single<AnnouncementRow>();

  if (error || !data) {
    console.error("Error fetching new announcement:", error);
    throw new Error("Failed to load new announcement.");
  }

  return mapAnnouncementRecord(data);
};

export const deleteTeacherAnnouncement = async (
  announcementId: string,
  classId: string
): Promise<void> => {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId);

  if (error) {
    console.error("Error deleting announcement:", error);
    throw new Error("Failed to delete announcement.");
  }
};

// Student-related interfaces and functions
export interface StudentData {
  id: string;
  class_id: string;
  class_name?: string;
  grade_name?: string;
  roll_number?: string;
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

export interface StudentAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: string;
  class_name: string;
}

// Get student data including class_id
export const getStudentData = async (
  studentId: string
): Promise<StudentData | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      class_id,
      roll_number,
      classes (
        id,
        name,
        grade_levels (
          id,
          name
        )
      )
    `
    )
    .eq("id", studentId)
    .eq("role_id", 4)
    .single();

  if (error) {
    console.error("Error fetching student data:", error);
    throw new Error("Failed to load student data.");
  }

  if (!data) {
    return null;
  }

  const classData = Array.isArray(data.classes)
    ? data.classes[0]
    : data.classes;

  const gradeData = classData?.grade_levels
    ? Array.isArray(classData.grade_levels)
      ? classData.grade_levels[0]
      : classData.grade_levels
    : null;

  return {
    id: data.id,
    class_id: data.class_id,
    class_name: classData?.name,
    grade_name: gradeData?.name,
    roll_number: data.roll_number,
  };
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
    console.error("Error fetching student files:", error);
    throw new Error("Failed to load files.");
  }

  if (!data) {
    return [];
  }

  return data.map((record) => mapFileRecordToItem(record as TeacherFileRow));
};

// Get voice notes by class_id for students
export interface StudentVoiceNote {
  id: string;
  title: string;
  storageUrl: string;
  duration: number;
  fileSize: number;
  subject: string;
  gradeSubjectId: string;
  uploadDate: string;
}

export const getStudentVoiceNotes = async (
  classId: string,
  schoolId: string
): Promise<StudentVoiceNote[]> => {
  const { data, error } = await supabase
    .from("voice_notes")
    .select(
      `
      id,
      title,
      storage_url,
      duration_seconds,
      file_size_bytes,
      grade_subject_id,
      created_at,
      grade_subjects (
        subjects_master ( name )
      )
    `
    )
    .eq("class_id", classId)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching student voice notes:", error);
    throw new Error("Failed to load voice notes.");
  }

  if (!data) {
    return [];
  }

  return data.map((record: any) => {
    const subjectMaster = Array.isArray(record.grade_subjects?.subjects_master)
      ? record.grade_subjects.subjects_master[0]
      : record.grade_subjects?.subjects_master;

    // Generate public URL from storage path
    const { data: publicUrlData } = supabase.storage
      .from(VOICE_NOTES_BUCKET)
      .getPublicUrl(record.storage_url);

    return {
      id: record.id,
      title: record.title,
      storageUrl: publicUrlData.publicUrl,
      duration: record.duration_seconds || 0,
      fileSize: record.file_size_bytes || 0,
      subject: subjectMaster?.name || "General",
      gradeSubjectId: record.grade_subject_id,
      uploadDate: record.created_at,
    };
  });
};

// Get announcements filtered by class_id for students
export const getStudentAnnouncements = async (
  classId: string
): Promise<StudentAnnouncement[]> => {
  const { data, error } = await supabase
    .from("announcement_classes")
    .select(
      `
      announcement_id,
      announcements (
        id,
        title,
        message,
        is_urgent,
        created_at
      ),
      classes (
        id,
        name
      )
    `
    )
    .eq("class_id", classId);

  if (error) {
    console.error("Error fetching student announcements:", error);
    throw new Error("Failed to load announcements.");
  }

  if (!data) {
    return [];
  }

  return data
    .map((item) => {
      const announcement = Array.isArray(item.announcements)
        ? item.announcements[0]
        : item.announcements;
      const classData = Array.isArray(item.classes)
        ? item.classes[0]
        : item.classes;

      if (!announcement) return null;

      return {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        isUrgent: announcement.is_urgent,
        createdAt: announcement.created_at,
        class_name: classData?.name ?? "Unknown Class",
      };
    })
    .filter((ann): ann is StudentAnnouncement => ann !== null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

// Test-related interfaces and functions
export interface TestQuestion {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
  chapter: string;
  topic: string;
}

export interface TeacherTest {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  isPublished: boolean;
  classId: string;
  className?: string;
  gradeSubjectId: string;
  subjectName?: string;
  examTypeId: number;
  examTypeName?: string;
  teacherId: string;
  createdAt: string;
  dueDate?: string;
  questions: TestQuestion[];
}

interface TestRow {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  is_published: boolean;
  class_id: string;
  grade_subject_id: string;
  exam_type_id: number;
  teacher_id: string;
  created_at: string;
  due_date?: string | null;
  classes?: { name: string } | { name: string }[] | null;
  grade_subjects?:
  | {
    subjects_master: { name: string } | { name: string }[] | null;
  }
  | {
    subjects_master: { name: string } | { name: string }[] | null;
  }[]
  | null;
  exam_types?: { name: string } | { name: string }[] | null;
}

// Question types matching the database enum
export type QuestionType = "MCQ" | "Essay" | "Short Answer" | "Very Short Answer";

interface CreateTestParams {
  title: string;
  description?: string;
  durationMinutes: number;
  isPublished: boolean;
  classId: string;
  gradeSubjectId: string;
  examTypeId: number;
  teacherId: string;
  schoolId: string;
  dueDate?: string;
  questions: {
    text: string;
    questionType?: QuestionType;
    options?: string[];
    correctOptionIndex?: number;
    expectedAnswerText?: string;
    marks: number;
    chapter: string;
    topic: string;
  }[];
}

// Get grade_subject_id from class_id and subject name
export const getGradeSubjectIdBySubjectName = async (
  classId: string,
  subjectName: string
): Promise<string | null> => {
  // First get the class to get grade_level_id
  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("grade_level_id")
    .eq("id", classId)
    .single();

  if (classError || !classData) {
    console.error("Error fetching class:", classError);
    return null;
  }

  // Then get grade_subject_id by matching subject name
  const { data: gradeSubjects, error: subjectsError } = await supabase
    .from("grade_subjects")
    .select(
      `
      id,
      subjects_master ( name )
    `
    )
    .eq("grade_level_id", classData.grade_level_id);

  if (subjectsError || !gradeSubjects) {
    console.error("Error fetching grade subjects:", subjectsError);
    return null;
  }

  const matchedSubject = gradeSubjects.find((gs: any) => {
    const master = Array.isArray(gs.subjects_master)
      ? gs.subjects_master[0]
      : gs.subjects_master;
    return master?.name === subjectName;
  });

  return matchedSubject?.id || null;
};

// Get exam_type_id from exam type name
export const getExamTypeIdByName = async (
  examTypeName: string
): Promise<number | null> => {
  const { data, error } = await supabase
    .from("exam_types")
    .select("id")
    .eq("name", examTypeName)
    .single();

  if (error || !data) {
    console.error("Error fetching exam type:", error);
    return null;
  }

  return data.id;
};

// Create test with questions and options
export const createTeacherTest = async (
  params: CreateTestParams
): Promise<TeacherTest> => {
  const {
    title,
    description,
    durationMinutes,
    isPublished,
    classId,
    gradeSubjectId,
    examTypeId,
    teacherId,
    schoolId,
    dueDate,
    questions,
  } = params;

  // Create test
  const { data: testData, error: testError } = await supabase
    .from("tests")
    .insert({
      title,
      description: description || null,
      duration_minutes: durationMinutes,
      is_published: isPublished,
      class_id: classId,
      grade_subject_id: gradeSubjectId,
      exam_type_id: examTypeId,
      teacher_id: teacherId,
      school_id: schoolId,
      due_date: dueDate || null,
    })
    .select("id, created_at")
    .single();

  if (testError || !testData) {
    console.error("Error creating test:", testError);
    throw new Error("Failed to create test.");
  }

  const testId = testData.id;

  // Create questions and options
  for (const question of questions) {
    const questionType = question.questionType || "MCQ";
    const isMCQ = questionType === "MCQ";

    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .insert({
        test_id: testId,
        question_text: question.text,
        marks: question.marks,
        chapter: question.chapter,
        topic: question.topic,
        question_type: questionType,
        correct_option_index: isMCQ ? question.correctOptionIndex : null,
        expected_answer_text: !isMCQ ? (question.expectedAnswerText || null) : null,
      })
      .select("id")
      .single();

    if (questionError || !questionData) {
      console.error("Error creating question:", questionError);
      throw new Error("Failed to create question.");
    }

    const questionId = questionData.id;

    // Create options only for MCQ questions
    if (isMCQ && question.options && Array.isArray(question.options) && question.options.length > 0) {
      const optionsToInsert = question.options
        .map((optionText: string, index: number) => ({
          question_id: questionId,
          option_index: index,
          option_text: optionText || "",
        }))
        .filter((opt) => opt.option_text.trim() !== "");

      if (optionsToInsert.length > 0) {
        const { error: optionsError } = await supabase
          .from("question_options")
          .insert(optionsToInsert);

        if (optionsError) {
          console.error("Error creating options:", optionsError);
          throw new Error("Failed to create question options.");
        }
      }
    }
  }

  // Fetch the complete test
  return getTeacherTest(testId, teacherId);
};

// Get test by ID with questions and options (filtered by teacher_id for security)
export const getTeacherTest = async (
  testId: string,
  teacherId: string
): Promise<TeacherTest> => {
  const { data: testData, error: testError } = await supabase
    .from("tests")
    .select(
      `
      id,
      title,
      description,
      duration_minutes,
      is_published,
      class_id,
      grade_subject_id,
      exam_type_id,
      teacher_id,
      created_at,
      due_date,
      classes ( name ),
      grade_subjects (
        subjects_master ( name )
      ),
      exam_types ( name )
    `
    )
    .eq("id", testId)
    .eq("teacher_id", teacherId)
    .single();

  if (testError || !testData) {
    console.error("Error fetching test:", testError);
    throw new Error("Failed to load test or test not found.");
  }

  const test = testData as TestRow;

  // Fetch questions
  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_text, marks, chapter, topic, correct_option_index")
    .eq("test_id", testId);

  if (questionsError) {
    console.error("Error fetching questions:", questionsError);
    throw new Error("Failed to load questions.");
  }

  const questions: TestQuestion[] = [];

  // Fetch options for each question
  for (const question of questionsData || []) {
    const { data: optionsData, error: optionsError } = await supabase
      .from("question_options")
      .select("option_index, option_text")
      .eq("question_id", question.id)
      .order("option_index", { ascending: true });

    if (optionsError) {
      console.error("Error fetching options:", optionsError);
      continue;
    }

    const options = (optionsData || []).map((opt) => opt.option_text);

    questions.push({
      id: question.id,
      text: question.question_text,
      options,
      correctOptionIndex: question.correct_option_index,
      marks: question.marks,
      chapter: question.chapter,
      topic: question.topic,
    });
  }

  const className = Array.isArray(test.classes)
    ? test.classes[0]?.name
    : test.classes?.name;

  let subjectName: string | undefined;
  if (test.grade_subjects) {
    const gradeSubject = Array.isArray(test.grade_subjects)
      ? test.grade_subjects[0]
      : test.grade_subjects;
    if (gradeSubject) {
      const master = Array.isArray(gradeSubject.subjects_master)
        ? gradeSubject.subjects_master[0]
        : gradeSubject.subjects_master;
      subjectName = master?.name;
    }
  }

  const examTypeName = Array.isArray(test.exam_types)
    ? test.exam_types[0]?.name
    : test.exam_types?.name;

  return {
    id: test.id,
    title: test.title,
    description: test.description || undefined,
    durationMinutes: test.duration_minutes,
    isPublished: test.is_published,
    classId: test.class_id,
    className,
    gradeSubjectId: test.grade_subject_id,
    subjectName,
    examTypeId: test.exam_type_id,
    examTypeName,
    teacherId: test.teacher_id,
    createdAt: test.created_at,
    dueDate: test.due_date || undefined,
    questions,
  };
};

// Get all tests for a teacher
export const getTeacherTests = async (
  teacherId: string
): Promise<TeacherTest[]> => {
  const { data: testsData, error: testsError } = await supabase
    .from("tests")
    .select(
      `
      id,
      title,
      description,
      duration_minutes,
      is_published,
      class_id,
      grade_subject_id,
      exam_type_id,
      teacher_id,
      created_at,
      due_date,
      classes ( name ),
      grade_subjects (
        subjects_master ( name )
      ),
      exam_types ( name )
    `
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (testsError) {
    console.error("Error fetching tests:", testsError);
    throw new Error("Failed to load tests.");
  }

  if (!testsData) {
    return [];
  }

  // Get question counts for each test
  const testsWithCounts = await Promise.all(
    testsData.map(async (test: any) => {
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("test_id", test.id);

      const questionCount = count || 0;

      const className = Array.isArray(test.classes)
        ? test.classes[0]?.name
        : test.classes?.name;

      let subjectName: string | undefined;
      if (test.grade_subjects) {
        const gradeSubject = Array.isArray(test.grade_subjects)
          ? test.grade_subjects[0]
          : test.grade_subjects;
        if (gradeSubject) {
          const master = Array.isArray(gradeSubject.subjects_master)
            ? gradeSubject.subjects_master[0]
            : gradeSubject.subjects_master;
          subjectName = master?.name;
        }
      }

      const examTypeName = Array.isArray(test.exam_types)
        ? test.exam_types[0]?.name
        : test.exam_types?.name;

      return {
        id: test.id,
        title: test.title,
        description: test.description || undefined,
        durationMinutes: test.duration_minutes,
        isPublished: test.is_published,
        classId: test.class_id,
        className,
        gradeSubjectId: test.grade_subject_id,
        subjectName,
        examTypeId: test.exam_type_id,
        examTypeName,
        teacherId: test.teacher_id,
        createdAt: test.created_at,
        dueDate: (test as any).due_date || undefined,
        questions: Array(questionCount)
          .fill(null)
          .map((_, i) => ({
            id: `placeholder-${i}`,
            text: "",
            options: [],
            correctOptionIndex: 0,
            marks: 0,
            chapter: "",
            topic: "",
          })) as TestQuestion[], // Placeholder array for count
      };
    })
  );

  return testsWithCounts;
};

// Update test
export const updateTeacherTest = async (
  testId: string,
  params: CreateTestParams
): Promise<TeacherTest> => {
  const {
    title,
    description,
    durationMinutes,
    isPublished,
    classId,
    gradeSubjectId,
    examTypeId,
    teacherId,
    questions,
  } = params;

  // Update test
  const { error: testError } = await supabase
    .from("tests")
    .update({
      title,
      description: description || null,
      duration_minutes: durationMinutes,
      is_published: isPublished,
      class_id: classId,
      grade_subject_id: gradeSubjectId,
      exam_type_id: examTypeId,
    })
    .eq("id", testId)
    .eq("teacher_id", teacherId);

  if (testError) {
    console.error("Error updating test:", testError);
    throw new Error("Failed to update test.");
  }

  // Delete existing questions (cascade will delete options)
  const { error: deleteError } = await supabase
    .from("questions")
    .delete()
    .eq("test_id", testId);

  if (deleteError) {
    console.error("Error deleting old questions:", deleteError);
    throw new Error("Failed to update questions.");
  }

  // Create new questions and options
  for (const question of questions) {
    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .insert({
        test_id: testId,
        question_text: question.text,
        marks: question.marks,
        chapter: question.chapter,
        topic: question.topic,
        correct_option_index: question.correctOptionIndex,
      })
      .select("id")
      .single();

    if (questionError || !questionData) {
      console.error("Error creating question:", questionError);
      throw new Error("Failed to create question.");
    }

    const questionId = questionData.id;

    // Create options
    const optionsToInsert = question.options
      .map((optionText, index) => ({
        question_id: questionId,
        option_index: index,
        option_text: optionText,
      }))
      .filter((opt) => opt.option_text.trim() !== "");

    if (optionsToInsert.length > 0) {
      const { error: optionsError } = await supabase
        .from("question_options")
        .insert(optionsToInsert);

      if (optionsError) {
        console.error("Error creating options:", optionsError);
        throw new Error("Failed to create question options.");
      }
    }
  }

  // Fetch the complete test
  return getTeacherTest(testId, teacherId);
};

// Publish/Unpublish test
export const publishTeacherTest = async (
  testId: string,
  teacherId: string,
  isPublished: boolean
): Promise<void> => {
  const { error } = await supabase
    .from("tests")
    .update({ is_published: isPublished })
    .eq("id", testId)
    .eq("teacher_id", teacherId);

  if (error) {
    console.error("Error publishing test:", error);
    throw new Error("Failed to update test status.");
  }
};

// Delete test
export const deleteTeacherTest = async (
  testId: string,
  teacherId: string
): Promise<void> => {
  const { error } = await supabase
    .from("tests")
    .delete()
    .eq("id", testId)
    .eq("teacher_id", teacherId);

  if (error) {
    console.error("Error deleting test:", error);
    throw new Error("Failed to delete test.");
  }
};

// Student test interface (simplified version for student view)
export interface StudentTest {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  classId: string;
  className?: string;
  subjectName?: string;
  examTypeId: number;
  examTypeName?: string;
  createdAt: string;
  dueDate?: string;
  questionCount: number;
  totalMarks: number;
  // Submission status
  submissionStatus: "not_started" | "pending" | "graded";
  submittedAt?: string;
  marksObtained?: number;
}

// Get published tests for a student by class_id (with submission status)
export const getStudentTests = async (
  classId: string,
  studentId: string
): Promise<StudentTest[]> => {
  const { data: testsData, error: testsError } = await supabase
    .from("tests")
    .select(
      `
      id,
      title,
      description,
      duration_minutes,
      is_published,
      class_id,
      grade_subject_id,
      exam_type_id,
      created_at,
      due_date,
      classes ( name ),
      grade_subjects (
        subjects_master ( name )
      ),
      exam_types ( name )
    `
    )
    .eq("class_id", classId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (testsError) {
    console.error("Error fetching student tests:", testsError);
    throw new Error("Failed to load tests.");
  }

  if (!testsData) {
    return [];
  }

  // Get question counts, total marks, and submission status for each test
  const testsWithDetails = await Promise.all(
    testsData.map(async (test: any) => {
      // Get questions with marks
      const { data: questionsData } = await supabase
        .from("questions")
        .select("marks")
        .eq("test_id", test.id);

      const questionCount = questionsData?.length || 0;
      const totalMarks = questionsData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

      // Check submission status for this student
      const { data: submissionData } = await supabase
        .from("test_submissions")
        .select("id, is_graded, total_marks_obtained, submitted_at")
        .eq("test_id", test.id)
        .eq("student_id", studentId)
        .single();

      let submissionStatus: "not_started" | "pending" | "graded" = "not_started";
      let submittedAt: string | undefined;
      let marksObtained: number | undefined;

      if (submissionData) {
        submissionStatus = submissionData.is_graded ? "graded" : "pending";
        submittedAt = submissionData.submitted_at;
        marksObtained = submissionData.total_marks_obtained || undefined;
      }

      const className = Array.isArray(test.classes)
        ? test.classes[0]?.name
        : test.classes?.name;

      let subjectName: string | undefined;
      if (test.grade_subjects) {
        const gradeSubject = Array.isArray(test.grade_subjects)
          ? test.grade_subjects[0]
          : test.grade_subjects;
        if (gradeSubject) {
          const master = Array.isArray(gradeSubject.subjects_master)
            ? gradeSubject.subjects_master[0]
            : gradeSubject.subjects_master;
          subjectName = master?.name;
        }
      }

      const examTypeName = Array.isArray(test.exam_types)
        ? test.exam_types[0]?.name
        : test.exam_types?.name;

      return {
        id: test.id,
        title: test.title,
        description: test.description || undefined,
        durationMinutes: test.duration_minutes,
        classId: test.class_id,
        className,
        subjectName,
        examTypeId: test.exam_type_id,
        examTypeName,
        createdAt: test.created_at,
        dueDate: test.due_date || undefined,
        questionCount,
        totalMarks,
        submissionStatus,
        submittedAt,
        marksObtained,
      };
    })
  );

  return testsWithDetails;
};

// Student test with questions for taking test
export interface StudentTestQuestion {
  id: string;
  text: string;
  questionType: QuestionType;
  options: string[]; // Only for MCQ
  marks: number;
  chapter?: string;
  topic?: string;
}

export interface StudentTestWithQuestions {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  subjectName?: string;
  examTypeId: number;
  questions: StudentTestQuestion[];
}

// Get test with questions for student to take (without correct answers)
export const getStudentTestForAttempt = async (
  testId: string,
  studentId: string
): Promise<StudentTestWithQuestions | null> => {
  // First verify the test is published and student has access
  const { data: testData, error: testError } = await supabase
    .from("tests")
    .select(
      `
      id,
      title,
      description,
      duration_minutes,
      is_published,
      class_id,
      exam_type_id,
      grade_subjects (
        subjects_master ( name )
      )
    `
    )
    .eq("id", testId)
    .eq("is_published", true)
    .single();

  if (testError || !testData) {
    console.error("Error fetching test:", testError);
    return null;
  }

  // Verify student belongs to the test's class
  const { data: studentData, error: studentError } = await supabase
    .from("profiles")
    .select("class_id")
    .eq("id", studentId)
    .eq("role_id", 4)
    .single();

  if (studentError || !studentData || studentData.class_id !== testData.class_id) {
    console.error("Student not authorized for this test");
    return null;
  }

  // Fetch questions with options (without correct_option_index for security)
  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_text, question_type, marks, chapter, topic")
    .eq("test_id", testId);

  if (questionsError) {
    console.error("Error fetching questions:", questionsError);
    throw new Error("Failed to load questions.");
  }

  const questions: StudentTestQuestion[] = [];

  for (const question of questionsData || []) {
    const questionType = (question.question_type as QuestionType) || "MCQ";
    const isMCQ = questionType === "MCQ";

    // Only fetch options for MCQ questions
    let options: string[] = [];
    if (isMCQ) {
      const { data: optionsData } = await supabase
        .from("question_options")
        .select("option_index, option_text")
        .eq("question_id", question.id)
        .order("option_index", { ascending: true });
      options = (optionsData || []).map((opt) => opt.option_text);
    }

    questions.push({
      id: question.id,
      text: question.question_text,
      questionType,
      options,
      marks: question.marks,
      chapter: question.chapter,
      topic: question.topic,
    });
  }

  let subjectName: string | undefined;
  if (testData.grade_subjects) {
    const gradeSubject = Array.isArray(testData.grade_subjects)
      ? testData.grade_subjects[0]
      : testData.grade_subjects;
    if (gradeSubject) {
      const master = Array.isArray(gradeSubject.subjects_master)
        ? gradeSubject.subjects_master[0]
        : gradeSubject.subjects_master;
      subjectName = master?.name;
    }
  }

  return {
    id: testData.id,
    title: testData.title,
    description: testData.description || undefined,
    durationMinutes: testData.duration_minutes,
    subjectName,
    examTypeId: testData.exam_type_id,
    questions,
  };
};

// Check if student has already submitted this test
export interface StudentSubmission {
  id: string;
  testId: string;
  studentId: string;
  submittedAt: string;
  isGraded: boolean;
  totalMarksObtained: number;
  answers: {
    questionId: string;
    selectedOptionIndex: number | null;
    marksAwarded: number;
  }[];
}

export const getStudentSubmission = async (
  testId: string,
  studentId: string
): Promise<StudentSubmission | null> => {
  const { data: submissionData, error: submissionError } = await supabase
    .from("test_submissions")
    .select("id, test_id, student_id, submitted_at, is_graded, total_marks_obtained")
    .eq("test_id", testId)
    .eq("student_id", studentId)
    .single();

  if (submissionError || !submissionData) {
    return null;
  }

  // Fetch answers
  const { data: answersData } = await supabase
    .from("student_answers")
    .select("question_id, student_selected_option_index, marks_awarded")
    .eq("submission_id", submissionData.id);

  return {
    id: submissionData.id,
    testId: submissionData.test_id,
    studentId: submissionData.student_id,
    submittedAt: submissionData.submitted_at,
    isGraded: submissionData.is_graded,
    totalMarksObtained: submissionData.total_marks_obtained || 0,
    answers: (answersData || []).map((a) => ({
      questionId: a.question_id,
      selectedOptionIndex: a.student_selected_option_index,
      marksAwarded: a.marks_awarded || 0,
    })),
  };
};

// Submit test answers
export interface SubmitTestParams {
  testId: string;
  studentId: string;
  answers: Record<string, number | string>; // questionId -> selectedOptionIndex (MCQ) or text answer (subjective)
  timeTakenSeconds: number;
}

export const submitStudentTest = async (
  params: SubmitTestParams
): Promise<StudentSubmission> => {
  const { testId, studentId, answers } = params;

  // Fetch questions to save answers (including question_type)
  const { data: questionsData, error: questionsError } = await supabase
    .from("questions")
    .select("id, question_type")
    .eq("test_id", testId);

  if (questionsError || !questionsData) {
    throw new Error("Failed to fetch questions.");
  }

  // Prepare answer records (no marks awarded yet - pending teacher grading)
  const answerRecords: {
    questionId: string;
    selectedOptionIndex: number | null;
    subjectiveAnswerText: string | null;
    marksAwarded: number;
  }[] = [];

  for (const question of questionsData) {
    const questionType = question.question_type || "MCQ";
    const isMCQ = questionType === "MCQ";
    const answerValue = answers[question.id];

    answerRecords.push({
      questionId: question.id,
      selectedOptionIndex: isMCQ ? (typeof answerValue === "number" ? answerValue : null) : null,
      subjectiveAnswerText: !isMCQ ? (typeof answerValue === "string" ? answerValue : null) : null,
      marksAwarded: 0, // Will be set by teacher during grading
    });
  }

  // Create submission (NOT graded - teacher will grade)
  const { data: submissionData, error: submissionError } = await supabase
    .from("test_submissions")
    .insert({
      test_id: testId,
      student_id: studentId,
      is_graded: false, // Pending teacher grading
      total_marks_obtained: 0, // Will be calculated after grading
    })
    .select("id, submitted_at")
    .single();

  if (submissionError || !submissionData) {
    console.error("Error creating submission:", submissionError);
    throw new Error("Failed to submit test.");
  }

  // Insert answers (without marks - pending grading)
  const answersToInsert = answerRecords.map((a) => ({
    submission_id: submissionData.id,
    question_id: a.questionId,
    student_selected_option_index: a.selectedOptionIndex,
    subjective_answer_text: a.subjectiveAnswerText,
    marks_awarded: 0, // Pending grading
  }));

  const { error: answersError } = await supabase
    .from("student_answers")
    .insert(answersToInsert);

  if (answersError) {
    console.error("Error saving answers:", answersError);
    throw new Error("Failed to save answers.");
  }

  return {
    id: submissionData.id,
    testId,
    studentId,
    submittedAt: submissionData.submitted_at,
    isGraded: false,
    totalMarksObtained: 0,
    answers: answerRecords,
  };
};

// Get test results with correct answers (only after submission)
export interface TestResultQuestion {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
  selectedOptionIndex: number | null;
  marksAwarded: number;
}

export interface TestResult {
  test: {
    id: string;
    title: string;
    description?: string;
    durationMinutes: number;
    subjectName?: string;
  };
  submission: {
    id: string;
    submittedAt: string;
    totalMarksObtained: number;
    totalMarks: number;
  };
  questions: TestResultQuestion[];
}

export const getTestResult = async (
  testId: string,
  studentId: string
): Promise<TestResult | null> => {
  // Get submission first
  const submission = await getStudentSubmission(testId, studentId);
  if (!submission) {
    return null;
  }

  // Get test details
  const { data: testData, error: testError } = await supabase
    .from("tests")
    .select(
      `
      id,
      title,
      description,
      duration_minutes,
      grade_subjects (
        subjects_master ( name )
      )
    `
    )
    .eq("id", testId)
    .single();

  if (testError || !testData) {
    return null;
  }

  // Get questions with correct answers
  const { data: questionsData } = await supabase
    .from("questions")
    .select("id, question_text, marks, correct_option_index")
    .eq("test_id", testId);

  const questions: TestResultQuestion[] = [];
  let totalMarks = 0;

  for (const question of questionsData || []) {
    const { data: optionsData } = await supabase
      .from("question_options")
      .select("option_index, option_text")
      .eq("question_id", question.id)
      .order("option_index", { ascending: true });

    const options = (optionsData || []).map((opt) => opt.option_text);
    const answer = submission.answers.find((a) => a.questionId === question.id);

    totalMarks += question.marks;

    questions.push({
      id: question.id,
      text: question.question_text,
      options,
      correctOptionIndex: question.correct_option_index,
      marks: question.marks,
      selectedOptionIndex: answer?.selectedOptionIndex ?? null,
      marksAwarded: answer?.marksAwarded ?? 0,
    });
  }

  let subjectName: string | undefined;
  if (testData.grade_subjects) {
    const gradeSubject = Array.isArray(testData.grade_subjects)
      ? testData.grade_subjects[0]
      : testData.grade_subjects;
    if (gradeSubject) {
      const master = Array.isArray(gradeSubject.subjects_master)
        ? gradeSubject.subjects_master[0]
        : gradeSubject.subjects_master;
      subjectName = master?.name;
    }
  }

  return {
    test: {
      id: testData.id,
      title: testData.title,
      description: testData.description || undefined,
      durationMinutes: testData.duration_minutes,
      subjectName,
    },
    submission: {
      id: submission.id,
      submittedAt: submission.submittedAt,
      totalMarksObtained: submission.totalMarksObtained,
      totalMarks,
    },
    questions,
  };
};

// Get all graded test results for a student (for Marks page)
export interface StudentGradedTest {
  testId: string;
  testTitle: string;
  subjectName?: string;
  examTypeName?: string;
  submittedAt: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
}

export const getStudentGradedTests = async (
  studentId: string
): Promise<StudentGradedTest[]> => {
  // Get all graded submissions for this student
  const { data: submissionsData, error: submissionsError } = await supabase
    .from("test_submissions")
    .select(
      `
      id,
      test_id,
      submitted_at,
      total_marks_obtained,
      is_graded,
      tests (
        id,
        title,
        grade_subjects (
          subjects_master ( name )
        ),
        exam_types ( name )
      )
    `
    )
    .eq("student_id", studentId)
    .eq("is_graded", true)
    .order("submitted_at", { ascending: false });

  if (submissionsError) {
    console.error("Error fetching graded tests:", submissionsError);
    throw new Error("Failed to load graded tests.");
  }

  if (!submissionsData) return [];

  const results: StudentGradedTest[] = [];

  for (const sub of submissionsData) {
    const test = sub.tests as any;
    if (!test) continue;

    // Get total marks for this test
    const { data: questionsData } = await supabase
      .from("questions")
      .select("marks")
      .eq("test_id", sub.test_id);

    const totalMarks = questionsData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

    let subjectName: string | undefined;
    if (test.grade_subjects) {
      const gradeSubject = Array.isArray(test.grade_subjects)
        ? test.grade_subjects[0]
        : test.grade_subjects;
      if (gradeSubject) {
        const master = Array.isArray(gradeSubject.subjects_master)
          ? gradeSubject.subjects_master[0]
          : gradeSubject.subjects_master;
        subjectName = master?.name;
      }
    }

    const examTypeName = Array.isArray(test.exam_types)
      ? test.exam_types[0]?.name
      : test.exam_types?.name;

    const marksObtained = sub.total_marks_obtained || 0;
    const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

    results.push({
      testId: sub.test_id,
      testTitle: test.title,
      subjectName,
      examTypeName,
      submittedAt: sub.submitted_at,
      totalMarks,
      marksObtained,
      percentage,
    });
  }

  return results;
};

// ==================== GET STUDENTS IN CLASS ====================

export interface ClassStudentInfo {
  id: string;
  name: string;
  rollNo: string;
}

export const getStudentsInClass = async (
  classId: string
): Promise<ClassStudentInfo[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, roll_number")
    .eq("class_id", classId)
    .eq("role_id", 4)
    .order("roll_number", { ascending: true });

  if (error) {
    console.error("Error fetching students:", error);
    throw new Error("Failed to load students.");
  }

  if (!data) return [];

  return data.map((student: any) => ({
    id: student.id,
    name: student.name || "Unknown",
    rollNo: student.roll_number || "",
  }));
};

// ==================== TEACHER GRADING ====================

// Interface for grading queue item
export interface GradingQueueItem {
  testId: string;
  testTitle: string;
  className: string;
  subjectName?: string;
  examTypeName?: string;
  totalSubmissions: number;
  gradedCount: number;
  pendingCount: number;
  createdAt: string;
}

// Get grading queue for teacher (tests with pending submissions)
export const getTeacherGradingQueue = async (
  teacherId: string
): Promise<GradingQueueItem[]> => {
  // Get tests created by this teacher
  const { data: testsData, error: testsError } = await supabase
    .from("tests")
    .select(
      `
      id,
      title,
      created_at,
      is_published,
      classes ( name ),
      grade_subjects (
        subjects_master ( name )
      ),
      exam_types ( name )
    `
    )
    .eq("teacher_id", teacherId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (testsError) {
    console.error("Error fetching tests for grading:", testsError);
    throw new Error("Failed to load grading queue.");
  }

  if (!testsData) return [];

  const queueItems: GradingQueueItem[] = [];

  for (const test of testsData) {
    // Get submission counts
    const { data: submissions } = await supabase
      .from("test_submissions")
      .select("id, is_graded")
      .eq("test_id", test.id);

    const totalSubmissions = submissions?.length || 0;
    if (totalSubmissions === 0) continue; // Skip tests with no submissions

    const gradedCount = submissions?.filter((s) => s.is_graded).length || 0;
    const pendingCount = totalSubmissions - gradedCount;

    const className = Array.isArray(test.classes)
      ? test.classes[0]?.name
      : (test.classes as any)?.name;

    let subjectName: string | undefined;
    if (test.grade_subjects) {
      const gradeSubject = Array.isArray(test.grade_subjects)
        ? test.grade_subjects[0]
        : test.grade_subjects;
      if (gradeSubject) {
        const master = Array.isArray((gradeSubject as any).subjects_master)
          ? (gradeSubject as any).subjects_master[0]
          : (gradeSubject as any).subjects_master;
        subjectName = master?.name;
      }
    }

    const examTypeName = Array.isArray(test.exam_types)
      ? test.exam_types[0]?.name
      : (test.exam_types as any)?.name;

    queueItems.push({
      testId: test.id,
      testTitle: test.title,
      className: className || "Unknown",
      subjectName,
      examTypeName,
      totalSubmissions,
      gradedCount,
      pendingCount,
      createdAt: test.created_at,
    });
  }

  return queueItems;
};

// Interface for student submission to grade
export interface SubmissionToGrade {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentRollNo: string;
  submittedAt: string;
  isGraded: boolean;
  totalMarksObtained: number;
  answers: {
    answerId: string;
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    questionMarks: number;
    chapter?: string;
    topic?: string;
    expectedAnswerText?: string;
    // MCQ specific
    options: string[];
    selectedOptionIndex: number | null;
    correctOptionIndex: number | null;
    // Subjective specific
    subjectiveAnswerText?: string;
    marksAwarded: number;
  }[];
}

// Get submissions for a test (for teacher grading)
// Get chapter and topic-wise performance analytics for a class
export const getChapterTopicAnalytics = async (
  classId: string,
  subjectId?: string
): Promise<{
  chapters: { name: string; avgScore: number; totalQuestions: number }[];
  topics: { name: string; avgScore: number; totalQuestions: number; chapters: string[] }[];
}> => {
  try {
    // First get all tests for this class
    const { data: testsData, error: testsError } = await supabase
      .from('tests')
      .select('id, title, grade_subject_id')
      .eq('class_id', classId);

    if (testsError) throw testsError;
    if (!testsData || testsData.length === 0) {
      return { chapters: [], topics: [] };
    }

    // Get test IDs
    const testIds = testsData.map(test => test.id);

    // Get all submissions for these tests
    const { data: submissions, error: submissionsError } = await supabase
      .from('test_submissions')
      .select('id, total_marks_obtained, test_id')
      .in('test_id', testIds)
      .not('total_marks_obtained', 'is', null);

    if (submissionsError) throw submissionsError;
    if (!submissions || submissions.length === 0) {
      return { chapters: [], topics: [] };
    }

    // Fetch questions for all tests
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('id, test_id, chapter, topic, marks')
      .in('test_id', testIds);

    if (questionsError) throw questionsError;

    // Create a map of questions by test_id
    const questionsByTest: Record<string, any[]> = {};
    if (questionsData) {
      questionsData.forEach(question => {
        if (!questionsByTest[question.test_id]) {
          questionsByTest[question.test_id] = [];
        }
        questionsByTest[question.test_id].push(question);
      });
    }

    // Collect all questions with their performance data
    const questionPerformance: Record<string, {
      chapter: string;
      topic: string;
      totalMarks: number;
      obtainedMarks: number;
      count: number;
    }> = {};

    submissions.forEach(submission => {
      const testQuestions = questionsByTest[submission.test_id] || [];
      
      testQuestions.forEach((question: any) => {
        const key = `${question.chapter || 'Unknown'}-${question.topic || 'Unknown'}`;
        
        if (!questionPerformance[key]) {
          questionPerformance[key] = {
            chapter: question.chapter || 'Unknown',
            topic: question.topic || 'Unknown',
            totalMarks: 0,
            obtainedMarks: 0,
            count: 0
          };
        }
        
        questionPerformance[key].totalMarks += question.marks || 0;
        questionPerformance[key].count += 1;
      });
      
      // Distribute obtained marks proportionally across questions
      const totalTestMarks = testQuestions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
      if (totalTestMarks > 0) {
        const marksPerPoint = (submission.total_marks_obtained || 0) / totalTestMarks;
        
        testQuestions.forEach((question: any) => {
          const key = `${question.chapter || 'Unknown'}-${question.topic || 'Unknown'}`;
          if (questionPerformance[key]) {
            questionPerformance[key].obtainedMarks += (question.marks || 0) * marksPerPoint;
          }
        });
      }
    });

    // Aggregate by chapter
    const chapterMap: Record<string, { totalScore: number; totalMarks: number; count: number }> = {};
    
    // Aggregate by topic
    const topicMap: Record<string, { totalScore: number; totalMarks: number; count: number; chapters: Set<string> }> = {};

    Object.values(questionPerformance).forEach(qp => {
      // Chapter aggregation
      if (!chapterMap[qp.chapter]) {
        chapterMap[qp.chapter] = { totalScore: 0, totalMarks: 0, count: 0 };
      }
      chapterMap[qp.chapter].totalScore += qp.obtainedMarks;
      chapterMap[qp.chapter].totalMarks += qp.totalMarks;
      chapterMap[qp.chapter].count += qp.count;

      // Topic aggregation
      if (!topicMap[qp.topic]) {
        topicMap[qp.topic] = { totalScore: 0, totalMarks: 0, count: 0, chapters: new Set() };
      }
      topicMap[qp.topic].totalScore += qp.obtainedMarks;
      topicMap[qp.topic].totalMarks += qp.totalMarks;
      topicMap[qp.topic].count += qp.count;
      topicMap[qp.topic].chapters.add(qp.chapter);
    });

    // Convert to arrays and calculate averages
    const chapters = Object.entries(chapterMap)
      .map(([name, data]) => ({
        name,
        avgScore: data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 100) : 0,
        totalQuestions: data.count
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const topics = Object.entries(topicMap)
      .map(([name, data]) => ({
        name,
        avgScore: data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 100) : 0,
        totalQuestions: data.count,
        chapters: Array.from(data.chapters)
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return { chapters, topics };
  } catch (error) {
    console.error('Error fetching chapter/topic analytics:', error);
    throw new Error('Failed to load analytics data');
  }
};

export const getTestSubmissionsForGrading = async (
  testId: string
): Promise<SubmissionToGrade[]> => {
  // Get all submissions for this test
  const { data: submissionsData, error: submissionsError } = await supabase
    .from("test_submissions")
    .select(
      `
      id,
      student_id,
      submitted_at,
      is_graded,
      total_marks_obtained,
      profiles!student_id (
        id,
        name,
        roll_number
      )
    `
    )
    .eq("test_id", testId)
    .order("submitted_at", { ascending: true });

  if (submissionsError) {
    console.error("Error fetching submissions:", submissionsError);
    throw new Error("Failed to load submissions.");
  }

  if (!submissionsData) return [];

  // Get questions for this test (including question_type and expected_answer_text)
  const { data: questionsData } = await supabase
    .from("questions")
    .select("id, question_text, marks, chapter, topic, question_type, correct_option_index, expected_answer_text")
    .eq("test_id", testId);

  const submissions: SubmissionToGrade[] = [];

  for (const sub of submissionsData) {
    // Get answers for this submission (including subjective_answer_text)
    const { data: answersData } = await supabase
      .from("student_answers")
      .select("id, question_id, student_selected_option_index, subjective_answer_text, marks_awarded")
      .eq("submission_id", sub.id);

    const answers: SubmissionToGrade["answers"] = [];

    for (const question of questionsData || []) {
      const answer = answersData?.find((a) => a.question_id === question.id);
      const questionType = (question.question_type as QuestionType) || "MCQ";
      const isMCQ = questionType === "MCQ";

      // Get options only for MCQ questions
      let options: string[] = [];
      if (isMCQ) {
        const { data: optionsData } = await supabase
          .from("question_options")
          .select("option_index, option_text")
          .eq("question_id", question.id)
          .order("option_index", { ascending: true });
        options = (optionsData || []).map((o) => o.option_text);
      }

      answers.push({
        answerId: answer?.id || "",
        questionId: question.id,
        questionText: question.question_text,
        questionType,
        questionMarks: question.marks,
        chapter: question.chapter,
        topic: question.topic,
        expectedAnswerText: question.expected_answer_text || undefined,
        options,
        selectedOptionIndex: isMCQ ? (answer?.student_selected_option_index ?? null) : null,
        correctOptionIndex: isMCQ ? question.correct_option_index : null,
        subjectiveAnswerText: !isMCQ ? (answer?.subjective_answer_text || undefined) : undefined,
        marksAwarded: answer?.marks_awarded || 0,
      });
    }

    const student = sub.profiles as any;
    const studentName = student?.name || "Unknown";
    const studentRollNo = student?.roll_number || "";

    submissions.push({
      submissionId: sub.id,
      studentId: sub.student_id,
      studentName,
      studentRollNo,
      submittedAt: sub.submitted_at,
      isGraded: sub.is_graded,
      totalMarksObtained: sub.total_marks_obtained || 0,
      answers,
    });
  }

  return submissions;
};

// Grade a single answer
export const gradeStudentAnswer = async (
  answerId: string,
  marksAwarded: number
): Promise<void> => {
  const { error } = await supabase
    .from("student_answers")
    .update({ marks_awarded: marksAwarded })
    .eq("id", answerId);

  if (error) {
    console.error("Error grading answer:", error);
    throw new Error("Failed to save grade.");
  }
};

// Finalize grading for a submission (calculate total and mark as graded)
export const finalizeSubmissionGrading = async (
  submissionId: string
): Promise<void> => {
  // Get all answers for this submission
  const { data: answersData, error: answersError } = await supabase
    .from("student_answers")
    .select("marks_awarded")
    .eq("submission_id", submissionId);

  if (answersError) {
    console.error("Error fetching answers:", answersError);
    throw new Error("Failed to calculate total.");
  }

  const totalMarks = (answersData || []).reduce(
    (sum, a) => sum + (a.marks_awarded || 0),
    0
  );

  // Update submission
  const { error: updateError } = await supabase
    .from("test_submissions")
    .update({
      is_graded: true,
      total_marks_obtained: totalMarks,
    })
    .eq("id", submissionId);

  if (updateError) {
    console.error("Error finalizing submission:", updateError);
    throw new Error("Failed to finalize grading.");
  }
};

// ==================== VOICE NOTES ====================

export interface TeacherVoiceNote {
  id: string;
  title: string;
  storageUrl: string;
  storagePath: string;
  durationSeconds: number;
  fileSizeBytes: number;
  className: string;
  subjectName: string;
  createdAt: string;
  size?: string;
}

interface VoiceNoteRow {
  id: string;
  title: string;
  storage_url: string;
  duration_seconds: number;
  file_size_bytes: number;
  created_at: string;
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

interface UploadVoiceNoteParams {
  file: File | Blob;
  title: string;
  classId: string;
  gradeSubjectId: string;
  teacherId: string;
  schoolId: string;
  durationSeconds: number;
}

const mapVoiceNoteRecord = (record: VoiceNoteRow): TeacherVoiceNote => {
  const { data: publicUrlData } = supabase.storage
    .from(VOICE_NOTES_BUCKET)
    .getPublicUrl(record.storage_url);

  const className = resolveName(record.classes);

  let subjectName: string | undefined;
  if (Array.isArray(record.grade_subjects)) {
    subjectName = resolveName(record.grade_subjects[0]?.subjects_master);
  } else {
    subjectName = resolveName(record.grade_subjects?.subjects_master);
  }

  return {
    id: record.id,
    title: record.title,
    storageUrl: publicUrlData.publicUrl,
    storagePath: record.storage_url,
    durationSeconds: record.duration_seconds,
    fileSizeBytes: record.file_size_bytes,
    className: className ?? "Unknown Class",
    subjectName: subjectName ?? "Unknown Subject",
    createdAt: record.created_at,
    size: `${(record.file_size_bytes / (1024 * 1024)).toFixed(2)} MB`,
  };
};

// Get all voice notes for a teacher
export const getTeacherVoiceNotes = async (
  teacherId: string,
  schoolId: string
): Promise<TeacherVoiceNote[]> => {
  const { data, error } = await supabase
    .from("voice_notes")
    .select(
      `
      id,
      title,
      storage_url,
      duration_seconds,
      file_size_bytes,
      created_at,
      class_id,
      grade_subject_id,
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
    console.error("Error fetching voice notes:", error);
    throw new Error("Failed to load voice notes.");
  }

  if (!data) {
    return [];
  }

  return data.map((record) => mapVoiceNoteRecord(record as VoiceNoteRow));
};

// Upload voice note
export const uploadTeacherVoiceNote = async (
  params: UploadVoiceNoteParams
): Promise<TeacherVoiceNote> => {
  const { file, teacherId, classId, gradeSubjectId, title, durationSeconds, schoolId } =
    params;

  // Validate file type (audio files)
  const validAudioTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/mp4",
  ];
  const isValidAudio =
    file instanceof File
      ? validAudioTypes.includes(file.type) || file.type.startsWith("audio/")
      : true; // Blob from MediaRecorder is usually webm/mp4

  if (!isValidAudio) {
    throw new Error("Only audio files are allowed.");
  }

  // Check file size (max 50MB for audio)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error("File size must be 50MB or less.");
  }

  // Determine file extension and content type
  let fileExtension = "webm";
  let contentType = "audio/webm";
  
  if (file instanceof File) {
    fileExtension = file.name.split(".").pop() || "webm";
    contentType = file.type || "audio/webm";
  } else if (file instanceof Blob) {
    // For recorded blobs, get the actual type
    contentType = file.type || "audio/webm";
    // Map MIME type to extension
    if (contentType.includes("mp4")) {
      fileExtension = "mp4";
    } else if (contentType.includes("ogg")) {
      fileExtension = "ogg";
    } else if (contentType.includes("mpeg") || contentType.includes("mp3")) {
      fileExtension = "mp3";
    } else {
      fileExtension = "webm";
    }
  }
  
  const fileName = `voice-${Date.now()}.${fileExtension}`;
  const filePath = `${teacherId}/${fileName}`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from(VOICE_NOTES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: contentType,
      upsert: false,
    });

  if (storageError || !storageData) {
    console.error("Error uploading voice note to storage:", storageError);
    throw new Error("Failed to upload voice note.");
  }

  const { data, error } = await supabase
    .from("voice_notes")
    .insert({
      title,
      class_id: classId,
      grade_subject_id: gradeSubjectId,
      storage_url: storageData.path,
      duration_seconds: durationSeconds,
      file_size_bytes: file.size,
      teacher_id: teacherId,
      school_id: schoolId,
    })
    .select(
      `
      id,
      title,
      storage_url,
      duration_seconds,
      file_size_bytes,
      created_at,
      classes ( id, name ),
      grade_subjects (
        subjects_master ( name )
      )
    `
    )
    .single();

  if (error || !data) {
    console.error("Error saving voice note metadata:", error);
    // Try to clean up uploaded file if metadata save fails
    await supabase.storage.from(VOICE_NOTES_BUCKET).remove([storageData.path]);
    throw new Error("Failed to save voice note information.");
  }

  return mapVoiceNoteRecord(data as VoiceNoteRow);
};

// Delete voice note
export const deleteTeacherVoiceNote = async (
  voiceNoteId: string,
  storagePath: string,
  teacherId: string
): Promise<void> => {
  // Verify the voice note belongs to the teacher
  const { data: voiceNote, error: verifyError } = await supabase
    .from("voice_notes")
    .select("id, storage_url")
    .eq("id", voiceNoteId)
    .eq("teacher_id", teacherId)
    .single();

  if (verifyError || !voiceNote) {
    throw new Error("Voice note not found or access denied.");
  }

  const normalizedPath = normalizeStoragePath(
    storagePath || voiceNote.storage_url
  );

  if (!normalizedPath) {
    throw new Error("File path missing; cannot delete from storage.");
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from(VOICE_NOTES_BUCKET)
    .remove([normalizedPath]);

  if (storageError) {
    console.error("Error deleting from storage:", storageError);
    throw new Error("Failed to delete voice note from storage.");
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from("voice_notes")
    .delete()
    .eq("id", voiceNoteId)
    .eq("teacher_id", teacherId);

  if (deleteError) {
    console.error("Error deleting voice note record:", deleteError);
    throw new Error("Failed to delete voice note record.");
  }
};

// Attendance-related interfaces and functions
export interface StudentAttendance {
  id: string;
  name: string;
  roll_number: string;
  present: boolean;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string; // "present" or "absent"
  taken_by: string;
  recorded_at: string;
}

// Get students by class_id for attendance marking
export const getStudentsByClass = async (
  classId: string
): Promise<StudentAttendance[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, roll_number")
    .eq("class_id", classId)
    .eq("role_id", 4) // role_id 4 = student
    .order("roll_number", { ascending: true });

  if (error) {
    console.error("Error fetching students by class:", error);
    throw new Error("Failed to load students for attendance.");
  }

  if (!data) {
    return [];
  }

  return data.map((student: any) => ({
    id: student.id,
    name: student.name || "Unknown Student",
    roll_number: student.roll_number || "",
    present: false, // Default to absent, will be updated from attendance records
  }));
};

// Fetch existing attendance records for a specific date and class
export const getAttendanceForDate = async (
  classId: string,
  attendanceDate: string
): Promise<Record<string, boolean>> => {
  const { data, error } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("attendance_date", attendanceDate);

  if (error) {
    console.error("Error fetching attendance records:", error);
    return {};
  }

  if (!data) {
    return {};
  }

  const attendanceMap: Record<string, boolean> = {};
  for (const record of data) {
    attendanceMap[record.student_id] = record.status === "present";
  }

  return attendanceMap;
};

// Save attendance records for a date
export const saveAttendance = async (
  classId: string,
  attendanceDate: string,
  students: StudentAttendance[],
  teacherId: string,
  schoolId: string
): Promise<void> => {
  // Delete existing attendance records for the specific students on this date (to avoid duplicates)
  const studentIds = students.map((s) => s.id);
  const { error: deleteError } = await supabase
    .from("attendance")
    .delete()
    .eq("attendance_date", attendanceDate)
    .in("student_id", studentIds);

  if (deleteError) {
    console.error("Error clearing old attendance:", deleteError);
    throw new Error("Failed to save attendance.");
  }

  // Insert new attendance records
  const attendanceRecords = students.map((student) => ({
    student_id: student.id,
    attendance_date: attendanceDate,
    status: student.present ? "present" : "absent",
    taken_by: teacherId,
    school_id: schoolId,
    recorded_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("attendance")
    .insert(attendanceRecords);

  if (insertError) {
    console.error("Error saving attendance records:", insertError);
    throw new Error("Failed to save attendance records.");
  }
};

// Get student attendance statistics by subject
export const getStudentAttendanceBySubject = async (
  studentId: string
): Promise<
  Array<{
    subject: string;
    present: number;
    total: number;
    percentage: number;
    trend: "up" | "down";
    recentClasses: Array<{ date: string; status: "present" | "absent" }>;
  }>
> => {
  try {
    // First get student's class and grade level
    const { data: studentData, error: studentError } = await supabase
      .from("profiles")
      .select(
        `
        class_id,
        classes (
          grade_level_id
        )
      `
      )
      .eq("id", studentId)
      .eq("role_id", 4)
      .single();

    if (studentError) {
      console.error("Error fetching student info:", studentError);
      return [];
    }

    if (!studentData) {
      return [];
    }

    const classData = Array.isArray(studentData.classes)
      ? studentData.classes[0]
      : studentData.classes;
    const gradeLevel = classData?.grade_level_id;

    // Get all subjects for this grade level
    const { data: gradeSubjects, error: subjectsError } = await supabase
      .from("grade_subjects")
      .select(
        `
        id,
        subjects_master (
          name
        )
      `
      )
      .eq("grade_level_id", gradeLevel);

    if (subjectsError) {
      console.error("Error fetching subjects:", subjectsError);
      return [];
    }

    if (!gradeSubjects) {
      return [];
    }

    // Fetch attendance for all dates for this student
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("attendance_date, status")
      .eq("student_id", studentId)
      .order("attendance_date", { ascending: false });

    if (attendanceError) {
      console.error("Error fetching attendance:", attendanceError);
      return [];
    }

    // Process each subject
    const subjectAttendance = gradeSubjects.map(
      (gs: {
        id: string;
        subjects_master: NamedEntity | NamedEntity[] | null;
      }) => {
        const subjectMaster = Array.isArray(gs.subjects_master)
          ? gs.subjects_master[0]
          : gs.subjects_master;
        const subjectName = subjectMaster?.name || "Unknown Subject";

        const totalRecords = attendanceData?.length || 0;
        const presentRecords =
          attendanceData?.filter((a) => a.status === "present").length || 0;

        const percentage =
          totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

        // Get recent 5 classes
        const recentClasses = (attendanceData || [])
          .slice(0, 5)
          .map((record) => ({
            date: record.attendance_date,
            status: record.status as "present" | "absent",
          }));

        // Determine trend (compare first 50% vs last 50%)
        const midpoint = Math.floor((attendanceData?.length || 0) / 2);
        const firstHalf = (attendanceData || [])
          .slice(0, midpoint)
          .filter((a) => a.status === "present").length;
        const secondHalf = (attendanceData || [])
          .slice(midpoint)
          .filter((a) => a.status === "present").length;

        const firstHalfPercentage =
          midpoint > 0 ? (firstHalf / midpoint) * 100 : 0;
        const secondHalfPercentage =
          attendanceData && attendanceData.length - midpoint > 0
            ? (secondHalf / (attendanceData.length - midpoint)) * 100
            : 0;

        const trend: "up" | "down" =
          secondHalfPercentage >= firstHalfPercentage ? "up" : "down";

        return {
          subject: subjectName,
          present: presentRecords,
          total: totalRecords,
          percentage: Number.isNaN(percentage) ? 0 : percentage,
          trend,
          recentClasses,
        };
      }
    );

    return subjectAttendance;
  } catch (error) {
    console.error("Error in getStudentAttendanceBySubject:", error);
    return [];
  }
};

// Get overall student attendance percentage
export const getOverallAttendancePercentage = async (
  studentId: string
): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("status")
      .eq("student_id", studentId);

    if (error) {
      console.error("Error fetching overall attendance:", error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const presentCount = data.filter((a) => a.status === "present").length;
    const percentage = (presentCount / data.length) * 100;

    return Number.isNaN(percentage) ? 0 : percentage;
  } catch (error) {
    console.error("Error in getOverallAttendancePercentage:", error);
    return 0;
  }
};

// Get count of pending tests for a student (published tests not yet attempted)
export const getStudentPendingTestsCount = async (
  studentId: string
): Promise<number> => {
  try {
    // Get student's class_id
    const { data: studentData, error: studentError } = await supabase
      .from("profiles")
      .select("class_id")
      .eq("id", studentId)
      .eq("role_id", 4)
      .single();

    if (studentError || !studentData) {
      console.error("Error fetching student:", studentError);
      return 0;
    }

    // Get all published tests for this class (excluding Internal Assessments - exam_type_id = 4)
    const { data: testsData, error: testsError } = await supabase
      .from("tests")
      .select("id")
      .eq("class_id", studentData.class_id)
      .eq("is_published", true)
      .neq("exam_type_id", 4);

    if (testsError || !testsData) {
      console.error("Error fetching tests:", testsError);
      return 0;
    }

    if (testsData.length === 0) {
      return 0;
    }

    // Get tests already submitted by this student
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select("test_id")
      .eq("student_id", studentId);

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
      return 0;
    }

    const submittedTestIds = new Set((submissionsData || []).map(s => s.test_id));
    const pendingCount = testsData.filter(t => !submittedTestIds.has(t.id)).length;

    return pendingCount;
  } catch (error) {
    console.error("Error in getStudentPendingTestsCount:", error);
    return 0;
  }
};

// Get count of pending Internal Assessments for a student (exam_type_id = 4)
export const getStudentPendingAssessmentsCount = async (
  studentId: string
): Promise<number> => {
  try {
    // Get student's class_id
    const { data: studentData, error: studentError } = await supabase
      .from("profiles")
      .select("class_id")
      .eq("id", studentId)
      .eq("role_id", 4)
      .single();

    if (studentError || !studentData) {
      console.error("Error fetching student:", studentError);
      return 0;
    }

    // Get all published Internal Assessments (exam_type_id = 4) for this class
    const { data: testsData, error: testsError } = await supabase
      .from("tests")
      .select("id")
      .eq("class_id", studentData.class_id)
      .eq("is_published", true)
      .eq("exam_type_id", 4);

    if (testsError || !testsData) {
      console.error("Error fetching assessments:", testsError);
      return 0;
    }

    if (testsData.length === 0) {
      return 0;
    }

    // Get assessments already submitted by this student
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select("test_id")
      .eq("student_id", studentId);

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
      return 0;
    }

    const submittedTestIds = new Set((submissionsData || []).map(s => s.test_id));
    const pendingCount = testsData.filter(t => !submittedTestIds.has(t.id)).length;

    return pendingCount;
  } catch (error) {
    console.error("Error in getStudentPendingAssessmentsCount:", error);
    return 0;
  }
};

// Get student's average marks percentage across all graded tests
export const getStudentAverageMarksPercentage = async (
  studentId: string
): Promise<number> => {
  try {
    // Get all graded submissions for this student
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select(`
        id,
        total_marks_obtained,
        is_graded,
        tests (
          id
        )
      `)
      .eq("student_id", studentId)
      .eq("is_graded", true);

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
      return 0;
    }

    if (!submissionsData || submissionsData.length === 0) {
      return 0;
    }

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;

    for (const submission of submissionsData) {
      const test = submission.tests as any;
      if (!test) continue;

      // Get total marks for this test
      const { data: questionsData } = await supabase
        .from("questions")
        .select("marks")
        .eq("test_id", test.id);

      if (questionsData) {
        const testMaxMarks = questionsData.reduce((sum, q) => sum + (q.marks || 0), 0);
        totalMaxMarks += testMaxMarks;
        totalMarksObtained += submission.total_marks_obtained || 0;
      }
    }

    if (totalMaxMarks === 0) {
      return 0;
    }

    const percentage = (totalMarksObtained / totalMaxMarks) * 100;
    return Number.isNaN(percentage) ? 0 : Math.round(percentage * 10) / 10;
  } catch (error) {
    console.error("Error in getStudentAverageMarksPercentage:", error);
    return 0;
  }
};

// ==================== STUDENT ANALYTICS ====================

// Interface for student chapter/topic analytics
export interface StudentChapterTopicAnalytics {
  chapters: { name: string; avgScore: number; totalQuestions: number }[];
  topics: { name: string; avgScore: number; totalQuestions: number; chapters: string[] }[];
}

// Get chapter and topic-wise performance analytics for a specific student
export const getStudentChapterTopicAnalytics = async (
  studentId: string
): Promise<StudentChapterTopicAnalytics> => {
  try {
    // Get all graded submissions for this student
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select("id, test_id, total_marks_obtained")
      .eq("student_id", studentId)
      .eq("is_graded", true);

    if (submissionsError) throw submissionsError;
    if (!submissionsData || submissionsData.length === 0) {
      return { chapters: [], topics: [] };
    }

    const testIds = submissionsData.map(s => s.test_id);

    // Get all questions with chapter/topic for these tests
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("id, test_id, chapter, topic, marks")
      .in("test_id", testIds);

    if (questionsError) throw questionsError;

    // Get student answers with marks
    const submissionIds = submissionsData.map(s => s.id);
    const { data: answersData, error: answersError } = await supabase
      .from("student_answers")
      .select("question_id, marks_awarded, submission_id")
      .in("submission_id", submissionIds);

    if (answersError) throw answersError;

    // Create a map of question_id -> marks_awarded
    const answerMarksMap: Record<string, number> = {};
    if (answersData) {
      answersData.forEach(a => {
        answerMarksMap[a.question_id] = a.marks_awarded || 0;
      });
    }

    // Aggregate by chapter and topic
    const chapterMap: Record<string, { totalScore: number; totalMarks: number; count: number }> = {};
    const topicMap: Record<string, { totalScore: number; totalMarks: number; count: number; chapters: Set<string> }> = {};

    if (questionsData) {
      questionsData.forEach(q => {
        const chapter = q.chapter || "Unknown";
        const topic = q.topic || "Unknown";
        const maxMarks = q.marks || 0;
        const obtainedMarks = answerMarksMap[q.id] || 0;

        // Chapter aggregation
        if (!chapterMap[chapter]) {
          chapterMap[chapter] = { totalScore: 0, totalMarks: 0, count: 0 };
        }
        chapterMap[chapter].totalScore += obtainedMarks;
        chapterMap[chapter].totalMarks += maxMarks;
        chapterMap[chapter].count += 1;

        // Topic aggregation
        if (!topicMap[topic]) {
          topicMap[topic] = { totalScore: 0, totalMarks: 0, count: 0, chapters: new Set() };
        }
        topicMap[topic].totalScore += obtainedMarks;
        topicMap[topic].totalMarks += maxMarks;
        topicMap[topic].count += 1;
        topicMap[topic].chapters.add(chapter);
      });
    }

    // Convert to arrays and calculate averages
    const chapters = Object.entries(chapterMap)
      .map(([name, data]) => ({
        name,
        avgScore: data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 100) : 0,
        totalQuestions: data.count
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const topics = Object.entries(topicMap)
      .map(([name, data]) => ({
        name,
        avgScore: data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 100) : 0,
        totalQuestions: data.count,
        chapters: Array.from(data.chapters)
      }))
      .sort((a, b) => b.avgScore - a.avgScore);

    return { chapters, topics };
  } catch (error) {
    console.error("Error in getStudentChapterTopicAnalytics:", error);
    return { chapters: [], topics: [] };
  }
};

// Interface for subject performance data (for radar chart)
export interface SubjectPerformance {
  subject: string;
  score: number;
  fullMark: number;
}

// Get student's subject-wise performance for radar chart
export const getStudentSubjectPerformance = async (
  studentId: string
): Promise<SubjectPerformance[]> => {
  try {
    // Get all graded submissions with subject info
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select(`
        id,
        test_id,
        total_marks_obtained,
        tests (
          id,
          grade_subject_id,
          grade_subjects (
            subjects_master ( name )
          )
        )
      `)
      .eq("student_id", studentId)
      .eq("is_graded", true);

    if (submissionsError) throw submissionsError;
    if (!submissionsData || submissionsData.length === 0) {
      return [];
    }

    // Aggregate by subject
    const subjectMap: Record<string, { totalScore: number; totalMarks: number }> = {};

    for (const sub of submissionsData) {
      const test = sub.tests as any;
      if (!test) continue;

      // Get subject name
      let subjectName = "Unknown";
      if (test.grade_subjects) {
        const gradeSubject = Array.isArray(test.grade_subjects)
          ? test.grade_subjects[0]
          : test.grade_subjects;
        if (gradeSubject?.subjects_master) {
          const master = Array.isArray(gradeSubject.subjects_master)
            ? gradeSubject.subjects_master[0]
            : gradeSubject.subjects_master;
          subjectName = master?.name || "Unknown";
        }
      }

      // Get total marks for this test
      const { data: questionsData } = await supabase
        .from("questions")
        .select("marks")
        .eq("test_id", test.id);

      const testMaxMarks = questionsData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalScore: 0, totalMarks: 0 };
      }
      subjectMap[subjectName].totalScore += sub.total_marks_obtained || 0;
      subjectMap[subjectName].totalMarks += testMaxMarks;
    }

    // Convert to array for radar chart
    return Object.entries(subjectMap)
      .map(([subject, data]) => ({
        subject,
        score: data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 150) : 0, // Scale to 150 for chart
        fullMark: 150
      }))
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("Error in getStudentSubjectPerformance:", error);
    return [];
  }
};

// Interface for progress trend data
export interface ProgressTrendPoint {
  month: string;
  score: number;
}

// Get student's performance trend over time
export const getStudentProgressTrend = async (
  studentId: string
): Promise<ProgressTrendPoint[]> => {
  try {
    // Get all graded submissions ordered by date
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select(`
        id,
        test_id,
        submitted_at,
        total_marks_obtained
      `)
      .eq("student_id", studentId)
      .eq("is_graded", true)
      .order("submitted_at", { ascending: true });

    if (submissionsError) throw submissionsError;
    if (!submissionsData || submissionsData.length === 0) {
      return [];
    }

    // Group by month and calculate average percentage
    const monthlyData: Record<string, { totalScore: number; totalMarks: number; count: number }> = {};

    for (const sub of submissionsData) {
      const date = new Date(sub.submitted_at);
      const monthKey = date.toLocaleString("en-US", { month: "short" });

      // Get total marks for this test
      const { data: questionsData } = await supabase
        .from("questions")
        .select("marks")
        .eq("test_id", sub.test_id);

      const testMaxMarks = questionsData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { totalScore: 0, totalMarks: 0, count: 0 };
      }
      monthlyData[monthKey].totalScore += sub.total_marks_obtained || 0;
      monthlyData[monthKey].totalMarks += testMaxMarks;
      monthlyData[monthKey].count += 1;
    }

    // Convert to array
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        score: data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 100) : 0
      }));
  } catch (error) {
    console.error("Error in getStudentProgressTrend:", error);
    return [];
  }
};

// Interface for strength/weakness item
export interface StrengthWeaknessItem {
  subject: string;
  desc: string;
}

// Get student's strengths and weaknesses based on subject performance
export const getStudentStrengthsWeaknesses = async (
  studentId: string
): Promise<{ strengths: StrengthWeaknessItem[]; weaknesses: StrengthWeaknessItem[] }> => {
  try {
    const subjectData = await getStudentSubjectPerformance(studentId);

    if (subjectData.length === 0) {
      return { strengths: [], weaknesses: [] };
    }

    const strengths: StrengthWeaknessItem[] = [];
    const weaknesses: StrengthWeaknessItem[] = [];

    // Calculate percentage for each subject
    const subjectsWithPercentage = subjectData.map(s => ({
      subject: s.subject,
      percentage: Math.round((s.score / s.fullMark) * 100)
    }));

    // Strengths: subjects with >= 80%
    subjectsWithPercentage
      .filter(s => s.percentage >= 80)
      .slice(0, 3)
      .forEach(s => {
        strengths.push({
          subject: s.subject,
          desc: s.percentage >= 90 
            ? `Excellent performance - ${s.percentage}% average`
            : `Strong understanding - ${s.percentage}% average`
        });
      });

    // Weaknesses: subjects with < 60%
    subjectsWithPercentage
      .filter(s => s.percentage < 60)
      .slice(0, 3)
      .forEach(s => {
        weaknesses.push({
          subject: s.subject,
          desc: s.percentage < 40 
            ? `Needs significant improvement - ${s.percentage}% average`
            : `Room for improvement - ${s.percentage}% average`
        });
      });

    return { strengths, weaknesses };
  } catch (error) {
    console.error("Error in getStudentStrengthsWeaknesses:", error);
    return { strengths: [], weaknesses: [] };
  }
};

// Interface for student stats summary
export interface StudentStatsSummary {
  overallPercentage: number;
  totalTests: number;
  bestSubject: string;
  attendancePercentage: number;
}

// Get student's overall statistics summary
export const getStudentStatsSummary = async (
  studentId: string
): Promise<StudentStatsSummary> => {
  try {
    // Get overall percentage
    const overallPercentage = await getStudentAverageMarksPercentage(studentId);

    // Get total graded tests count
    const { data: testsData, error: testsError } = await supabase
      .from("test_submissions")
      .select("id")
      .eq("student_id", studentId)
      .eq("is_graded", true);

    if (testsError) throw testsError;
    const totalTests = testsData?.length || 0;

    // Get best subject
    const subjectPerformance = await getStudentSubjectPerformance(studentId);
    const bestSubject = subjectPerformance.length > 0 ? subjectPerformance[0].subject : "N/A";

    // Get attendance percentage
    const attendancePercentage = await getOverallAttendancePercentage(studentId);

    return {
      overallPercentage: Math.round(overallPercentage),
      totalTests,
      bestSubject,
      attendancePercentage: Math.round(attendancePercentage)
    };
  } catch (error) {
    console.error("Error in getStudentStatsSummary:", error);
    return {
      overallPercentage: 0,
      totalTests: 0,
      bestSubject: "N/A",
      attendancePercentage: 0
    };
  }
};

// ==================== TEACHER CLASS ANALYTICS ====================

// Interface for class performance trend data
export interface ClassPerformanceTrend {
  month: string;
  avgScore: number;
  attendance: number;
}

// Get class performance trend over time
export const getClassPerformanceTrend = async (
  classId: string
): Promise<ClassPerformanceTrend[]> => {
  try {
    // Get all graded submissions for this class with dates
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select(`
        id,
        test_id,
        submitted_at,
        total_marks_obtained,
        student_id,
        tests!inner (
          class_id
        )
      `)
      .eq("is_graded", true)
      .eq("tests.class_id", classId)
      .order("submitted_at", { ascending: true });

    if (submissionsError) throw submissionsError;
    if (!submissionsData || submissionsData.length === 0) return [];

    // Get attendance data for the class
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("attendance_date, status, student_id")
      .order("attendance_date", { ascending: true });

    // Group submissions by month
    const monthlyScores: Record<string, { totalScore: number; totalMarks: number; count: number }> = {};
    
    for (const sub of submissionsData) {
      const date = new Date(sub.submitted_at);
      const monthKey = date.toLocaleString("en-US", { month: "short" });
      
      // Get total marks for this test
      const { data: questionsData } = await supabase
        .from("questions")
        .select("marks")
        .eq("test_id", sub.test_id);
      
      const testMaxMarks = questionsData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
      
      if (!monthlyScores[monthKey]) {
        monthlyScores[monthKey] = { totalScore: 0, totalMarks: 0, count: 0 };
      }
      monthlyScores[monthKey].totalScore += sub.total_marks_obtained || 0;
      monthlyScores[monthKey].totalMarks += testMaxMarks;
      monthlyScores[monthKey].count += 1;
    }

    // Group attendance by month
    const monthlyAttendance: Record<string, { present: number; total: number }> = {};
    if (attendanceData) {
      attendanceData.forEach(a => {
        const date = new Date(a.attendance_date);
        const monthKey = date.toLocaleString("en-US", { month: "short" });
        
        if (!monthlyAttendance[monthKey]) {
          monthlyAttendance[monthKey] = { present: 0, total: 0 };
        }
        monthlyAttendance[monthKey].total += 1;
        if (a.status === "present") {
          monthlyAttendance[monthKey].present += 1;
        }
      });
    }

    // Combine data
    return Object.entries(monthlyScores).map(([month, data]) => ({
      month,
      avgScore: data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 100) : 0,
      attendance: monthlyAttendance[month]?.total > 0 
        ? Math.round((monthlyAttendance[month].present / monthlyAttendance[month].total) * 100) 
        : 0
    }));
  } catch (error) {
    console.error("Error in getClassPerformanceTrend:", error);
    return [];
  }
};

// Interface for student in class with scores
export interface ClassStudentWithScore {
  id: string;
  name: string;
  avgScore: number;
  attendancePercentage: number;
}

// Get all students in a class with their average scores
export const getClassStudentsWithScores = async (
  classId: string
): Promise<ClassStudentWithScore[]> => {
  try {
    // Get all students in the class
    const { data: studentsData, error: studentsError } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("class_id", classId)
      .eq("role_id", 4);

    if (studentsError) throw studentsError;
    if (!studentsData || studentsData.length === 0) return [];

    const students: ClassStudentWithScore[] = [];

    for (const student of studentsData) {
      // Get student's graded submissions
      const { data: submissionsData } = await supabase
        .from("test_submissions")
        .select(`
          total_marks_obtained,
          test_id
        `)
        .eq("student_id", student.id)
        .eq("is_graded", true);

      let totalScore = 0;
      let totalMarks = 0;

      if (submissionsData) {
        for (const sub of submissionsData) {
          const { data: questionsData } = await supabase
            .from("questions")
            .select("marks")
            .eq("test_id", sub.test_id);
          
          const testMaxMarks = questionsData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
          totalScore += sub.total_marks_obtained || 0;
          totalMarks += testMaxMarks;
        }
      }

      // Get attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("status")
        .eq("student_id", student.id);

      const attendancePercentage = attendanceData && attendanceData.length > 0
        ? Math.round((attendanceData.filter(a => a.status === "present").length / attendanceData.length) * 100)
        : 0;

      students.push({
        id: student.id,
        name: student.name || "Unknown",
        avgScore: totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0,
        attendancePercentage
      });
    }

    return students.sort((a, b) => b.avgScore - a.avgScore);
  } catch (error) {
    console.error("Error in getClassStudentsWithScores:", error);
    return [];
  }
};

// Interface for recent test data
export interface RecentTestMetrics {
  test: string;
  avg: number;
  top: number;
}

// Get recent tests metrics for a class
export const getRecentTestsMetrics = async (
  classId: string
): Promise<RecentTestMetrics[]> => {
  try {
    // Get recent tests for this class
    const { data: testsData, error: testsError } = await supabase
      .from("tests")
      .select("id, title, created_at")
      .eq("class_id", classId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (testsError) throw testsError;
    if (!testsData || testsData.length === 0) return [];

    const results: RecentTestMetrics[] = [];

    for (const test of testsData) {
      // Get submissions for this test
      const { data: submissionsData } = await supabase
        .from("test_submissions")
        .select("total_marks_obtained")
        .eq("test_id", test.id)
        .eq("is_graded", true);

      if (!submissionsData || submissionsData.length === 0) continue;

      // Get total marks for this test
      const { data: questionsData } = await supabase
        .from("questions")
        .select("marks")
        .eq("test_id", test.id);

      const testMaxMarks = questionsData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
      if (testMaxMarks === 0) continue;

      const scores = submissionsData.map(s => 
        Math.round(((s.total_marks_obtained || 0) / testMaxMarks) * 100)
      );

      results.push({
        test: test.title.length > 15 ? test.title.substring(0, 15) + "..." : test.title,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        top: Math.max(...scores)
      });
    }

    return results.reverse(); // Return in chronological order
  } catch (error) {
    console.error("Error in getRecentTestsMetrics:", error);
    return [];
  }
};

// Interface for subject average data
export interface SubjectAverageData {
  subject: string;
  avg: number;
}

// Get subject-wise class averages
export const getClassSubjectAverages = async (
  classId: string
): Promise<SubjectAverageData[]> => {
  try {
    // Get all graded submissions for this class with subject info
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select(`
        total_marks_obtained,
        test_id,
        tests!inner (
          id,
          class_id,
          grade_subjects (
            subjects_master ( name )
          )
        )
      `)
      .eq("is_graded", true)
      .eq("tests.class_id", classId);

    if (submissionsError) throw submissionsError;
    if (!submissionsData || submissionsData.length === 0) return [];

    const subjectMap: Record<string, { totalScore: number; totalMarks: number }> = {};

    for (const sub of submissionsData) {
      const test = sub.tests as any;
      if (!test) continue;

      // Get subject name
      let subjectName = "Unknown";
      if (test.grade_subjects) {
        const gradeSubject = Array.isArray(test.grade_subjects)
          ? test.grade_subjects[0]
          : test.grade_subjects;
        if (gradeSubject?.subjects_master) {
          const master = Array.isArray(gradeSubject.subjects_master)
            ? gradeSubject.subjects_master[0]
            : gradeSubject.subjects_master;
          subjectName = master?.name || "Unknown";
        }
      }

      // Get total marks for this test
      const { data: questionsData } = await supabase
        .from("questions")
        .select("marks")
        .eq("test_id", test.id);

      const testMaxMarks = questionsData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = { totalScore: 0, totalMarks: 0 };
      }
      subjectMap[subjectName].totalScore += sub.total_marks_obtained || 0;
      subjectMap[subjectName].totalMarks += testMaxMarks;
    }

    return Object.entries(subjectMap)
      .map(([subject, data]) => ({
        subject,
        avg: data.totalMarks > 0 ? Math.round((data.totalScore / data.totalMarks) * 100) : 0
      }))
      .sort((a, b) => b.avg - a.avg);
  } catch (error) {
    console.error("Error in getClassSubjectAverages:", error);
    return [];
  }
};

// Interface for attendance vs marks correlation
export interface AttendanceVsMarks {
  attendance: number;
  marks: number;
  student: string;
}

// Get attendance vs marks data for scatter plot
export const getAttendanceVsMarksData = async (
  classId: string
): Promise<AttendanceVsMarks[]> => {
  try {
    const students = await getClassStudentsWithScores(classId);
    
    return students.map((s, idx) => ({
      attendance: s.attendancePercentage,
      marks: s.avgScore,
      student: `S${idx + 1}`
    }));
  } catch (error) {
    console.error("Error in getAttendanceVsMarksData:", error);
    return [];
  }
};

// Interface for question type distribution
export interface QuestionTypeDistribution {
  name: string;
  value: number;
}

// Get question type distribution for a class
export const getQuestionTypeDistribution = async (
  classId: string
): Promise<QuestionTypeDistribution[]> => {
  try {
    // Get all tests for this class
    const { data: testsData, error: testsError } = await supabase
      .from("tests")
      .select("id")
      .eq("class_id", classId);

    if (testsError) throw testsError;
    if (!testsData || testsData.length === 0) return [];

    const testIds = testsData.map(t => t.id);

    // Get all questions for these tests
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select("question_type")
      .in("test_id", testIds);

    if (questionsError) throw questionsError;
    if (!questionsData || questionsData.length === 0) return [];

    // Count by type
    const typeCounts: Record<string, number> = {};
    questionsData.forEach(q => {
      const type = q.question_type || "MCQ";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  } catch (error) {
    console.error("Error in getQuestionTypeDistribution:", error);
    return [];
  }
};

// Interface for individual student analytics (for teacher viewing a student)
export interface StudentAnalyticsForTeacher {
  radar: { subject: string; A: number; B: number; fullMark: number }[];
  strengths: { subject: string; desc: string }[];
  weaknesses: { subject: string; desc: string }[];
}

// Get individual student analytics for teacher view
export const getStudentAnalyticsForTeacher = async (
  studentId: string,
  classId: string
): Promise<StudentAnalyticsForTeacher> => {
  try {
    // Get student's subject performance
    const studentSubjects = await getStudentSubjectPerformance(studentId);
    
    // Get class average for comparison
    const classSubjects = await getClassSubjectAverages(classId);
    const classAvgMap: Record<string, number> = {};
    classSubjects.forEach(s => {
      classAvgMap[s.subject] = Math.round((s.avg / 100) * 150); // Scale to 150
    });

    // Create radar data
    const radar = studentSubjects.map(s => ({
      subject: s.subject,
      A: s.score, // Student score (already scaled to 150)
      B: classAvgMap[s.subject] || 110, // Class average
      fullMark: 150
    }));

    // Get strengths and weaknesses
    const { strengths: strengthItems, weaknesses: weaknessItems } = await getStudentStrengthsWeaknesses(studentId);
    
    const strengths = strengthItems.map(s => ({
      subject: s.subject,
      desc: s.desc
    }));

    const weaknesses = weaknessItems.map(w => ({
      subject: w.subject,
      desc: w.desc
    }));

    return { radar, strengths, weaknesses };
  } catch (error) {
    console.error("Error in getStudentAnalyticsForTeacher:", error);
    return { radar: [], strengths: [], weaknesses: [] };
  }
};
