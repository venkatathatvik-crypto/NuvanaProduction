// Class, grade, subject, and file category services
import { supabase, GradeSubjectOption, FileCategoryOption } from "./types";
import { NestedClass, FlattenedClass } from "@/schemas/academic";

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
    throw new Error("Failed to load class data.");
  }

  if (!rawData) {
    return [];
  }

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
    throw new Error("Failed to load exam types.");
  }
  if (!data) {
    return [];
  }
  return data.map((item) => item.name);
};

// Exam type with category information
export interface ExamTypeWithCategory {
  id: number;
  name: string;
  type: "Internal Assessment" | "School Exam";
}

// Get exam types with their category (type column)
export const getExamTypesWithCategory = async (schoolId: string): Promise<ExamTypeWithCategory[]> => {
  const { data, error } = await supabase
    .from("exam_types")
    .select("id, name, type")
    .eq("school_id", schoolId);
  
  if (error) {
    throw new Error("Failed to load exam types.");
  }
  if (!data) {
    return [];
  }
  return data.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type as "Internal Assessment" | "School Exam",
  }));
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
    .filter((name): name is string => name !== null);
};

export const getFileCategories = async (schoolId: string): Promise<FileCategoryOption[]> => {
  const { data, error } = await supabase
    .from("file_categories")
    .select("id, name")
    .eq("school_id", schoolId)
    .order("name");
  if (error) {
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
    throw new Error("Failed to load teacher classes.");
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

// Re-export types for backward compatibility
export type { FlattenedClass } from "@/schemas/academic";
export type { GradeSubjectOption, FileCategoryOption } from "./types";
