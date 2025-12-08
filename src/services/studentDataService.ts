// Student data services - profile, voice notes, basic student info
import { supabase, VOICE_NOTES_BUCKET } from "./types";

export interface StudentData {
  id: string;
  class_id: string;
  class_name?: string;
  grade_name?: string;
  roll_number?: string;
}

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

// Get voice notes by class_id for students
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
