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
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const examTypes = await apiClient.get<Array<{
      id: number;
      name: string;
      type: string;
    }>>('/academic/exam-types');
    
    if (!examTypes || !Array.isArray(examTypes)) {
      return [];
    }

    return examTypes.map((item) => {
      // Handle both enum format and mapped format
      let typeValue: "Internal Assessment" | "School Exam";
      if (item.type === "Internal_Assessment" || item.type === "Internal Assessment") {
        typeValue = "Internal Assessment";
      } else {
        typeValue = "School Exam";
      }
      
      return {
        id: item.id,
        name: item.name,
        type: typeValue,
      };
    });
  } catch (error) {
    console.error('Error fetching exam types:', error);
    throw new Error("Failed to load exam types.");
  }
};

export const getSubjects = async (gradeLevelId: number): Promise<string[]> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const gradeSubjects = await apiClient.get<any[]>(`/academic/grade-subjects/grade/${gradeLevelId}`);
    
    console.log('getSubjects: Raw response for grade', gradeLevelId, gradeSubjects);
    
    if (!gradeSubjects || !Array.isArray(gradeSubjects)) {
      console.warn('getSubjects: Invalid response format', gradeSubjects);
      return [];
    }

    if (gradeSubjects.length === 0) {
      console.warn('getSubjects: No subjects found for grade', gradeLevelId);
      return [];
    }

    // Backend returns: { id, grade_level_id, subject_master_id, school_id, subjects_master: { id, name } }
    const subjectNames = gradeSubjects
      .map((item: any) => {
        const name = item.subjects_master?.name;
        if (!name) {
          console.warn('getSubjects: Missing subject name in item', item);
        }
        return name;
      })
      .filter((name: any): name is string => typeof name === 'string' && name.length > 0);

    console.log('getSubjects: Extracted', subjectNames.length, 'subject names:', subjectNames);
    return subjectNames;
  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    console.error('Error details:', error.message, error.response?.data || error.data);
    return [];
  }
};

export const getFileCategories = async (schoolId: string): Promise<FileCategoryOption[]> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const categories = await apiClient.get<Array<{ id: number; name: string }>>('/academic/file-categories');
    
    if (!categories || !Array.isArray(categories)) {
      return [];
    }

    return categories.map((item) => ({
      id: item.id,
      name: item.name,
    }));
  } catch (error) {
    console.error('Error fetching file categories:', error);
    throw new Error("Failed to load file categories.");
  }
};

export const getTeacherClasses = async (
  teacherId: string,
  schoolId: string
): Promise<FlattenedClass[]> => {
  // Use backend API through academicApiService
  const { academicService } = await import('./academicApiService');
  const teacherClasses = await academicService.getClassesByTeacher(teacherId);
  
  console.log('getTeacherClasses: Raw response', teacherClasses);
  
  // Transform to FlattenedClass format
  const flattenedClasses: FlattenedClass[] = teacherClasses.map((tc: any) => {
    // Backend now returns: classes: { id, name, grade_level_id, grade_levels: { id, name } }
    const gradeId = tc.classes?.grade_level_id || tc.classes?.grade_levels?.id || 0;
    const gradeName = tc.classes?.grade_levels?.name || 'Unknown Grade';
    
    if (!gradeId || gradeId === 0) {
      console.warn('getTeacherClasses: Missing grade_id for class', tc.classes);
    }
    
    return {
      class_id: tc.classes?.id || '',
      class_name: tc.classes?.name || 'Unknown Class',
      grade_id: gradeId,
      grade_name: gradeName,
    };
  });

  console.log('getTeacherClasses: Mapped classes', flattenedClasses);
  return flattenedClasses;
};

/**
 * Get subjects assigned to a teacher for a specific class
 * This follows the admin panel logic exactly:
 * 1. Get all grade_subjects for the class's grade level (from grade_subjects table)
 * 2. Filter to only include subjects assigned to the teacher (from teacher_subjects table)
 */
export const getTeacherSubjectsForClass = async (
  teacherId: string,
  classId: string,
  gradeId: number
): Promise<GradeSubjectOption[]> => {
  try {
    const { academicService } = await import('./academicApiService');
    
    // Step 1: Get all grade_subjects for this grade level (like admin panel timetable does)
    // This uses the same endpoint as admin panel: /academic/grade-subjects/grade/:gradeId
    const gradeSubjectsForGrade = await academicService.getSubjectsByGrade(gradeId);
    
    if (!gradeSubjectsForGrade || !Array.isArray(gradeSubjectsForGrade)) {
      console.warn('getTeacherSubjectsForClass: Invalid grade subjects response', gradeSubjectsForGrade);
      return [];
    }

    console.log(`getTeacherSubjectsForClass: Found ${gradeSubjectsForGrade.length} grade subjects for grade ${gradeId}`);

    // Step 2: Get teacher's assigned subjects
    const teacherSubjects = await academicService.getSubjectsByTeacher(teacherId);
    
    if (!teacherSubjects || !Array.isArray(teacherSubjects)) {
      console.warn('getTeacherSubjectsForClass: Invalid teacher subjects response', teacherSubjects);
      return [];
    }

    // Step 3: Get the grade_subject_ids that the teacher is assigned to
    const teacherGradeSubjectIds = new Set(
      teacherSubjects.map((ts: any) => ts.grade_subject_id)
    );

    console.log(`getTeacherSubjectsForClass: Teacher has ${teacherGradeSubjectIds.size} assigned grade subjects`);

    // Step 4: Filter grade_subjects to only include those assigned to the teacher
    // This matches admin panel logic: filter by grade_level_id, then check teacher assignment
    const filteredSubjects = gradeSubjectsForGrade
      .filter((gs: any) => teacherGradeSubjectIds.has(gs.id))
      .map((gs: any) => {
        // Backend returns: { id, grade_level_id, subject_master_id, subjects_master: { name } }
        const subjectName = gs.subjects_master?.name;
        const gradeSubjectId = gs.id;

        if (!subjectName) {
          console.warn('getTeacherSubjectsForClass: Missing subject name in grade subject', gs);
          return null;
        }

        return {
          id: gradeSubjectId,
          name: subjectName,
        };
      })
      .filter((option): option is GradeSubjectOption => option !== null);

    console.log(`getTeacherSubjectsForClass: Final result - ${filteredSubjects.length} subjects for teacher ${teacherId}, class ${classId}, grade ${gradeId}`);
    return filteredSubjects;
  } catch (error: any) {
    console.error('Error fetching teacher subjects for class:', error);
    console.error('Error details:', error.message, error.response?.data || error.data);
    throw new Error(error.message || "Failed to load subjects.");
  }
};

export const getGradeSubjectsDetailed = async (
  gradeLevelId: number
): Promise<GradeSubjectOption[]> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const gradeSubjects = await apiClient.get<any[]>(`/academic/grade-subjects/grade/${gradeLevelId}`);
    
    console.log('getGradeSubjectsDetailed: Raw response for grade', gradeLevelId, gradeSubjects);
    
    if (!gradeSubjects || !Array.isArray(gradeSubjects)) {
      console.warn('getGradeSubjectsDetailed: Invalid response format', gradeSubjects);
      return [];
    }

    if (gradeSubjects.length === 0) {
      console.warn('getGradeSubjectsDetailed: No subjects found for grade', gradeLevelId);
      return [];
    }

    const mapped = gradeSubjects
      .map((item: any) => {
        // Backend returns: { id, grade_level_id, subject_master_id, school_id, subjects_master: { id, name } }
        const subjectName = item.subjects_master?.name;
        const subjectId = item.id;

        if (!subjectName) {
          console.warn('getGradeSubjectsDetailed: Missing subject name in item', item);
          return null;
        }

        if (!subjectId) {
          console.warn('getGradeSubjectsDetailed: Missing subject id in item', item);
          return null;
        }

        return {
          id: subjectId,
          name: subjectName,
        };
      })
      .filter((option): option is GradeSubjectOption => option !== null);

    console.log('getGradeSubjectsDetailed: Successfully mapped', mapped.length, 'subjects');
    return mapped;
  } catch (error: any) {
    console.error('Error fetching grade subjects:', error);
    console.error('Error details:', error.message, error.response?.data || error.data);
    throw new Error(error.message || "Failed to load subjects.");
  }
};

// Re-export types for backward compatibility
export type { FlattenedClass } from "@/schemas/academic";
export type { GradeSubjectOption, FileCategoryOption } from "./types";
