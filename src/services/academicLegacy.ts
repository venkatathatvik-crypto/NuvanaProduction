import { apiClient } from "@/lib/apiClient";
import { NestedClass, FlattenedClass } from "@/schemas/academic";
import { academicService } from "./academicApiService";
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
  classId: string; // Added classId
  subject: string;
  gradeSubjectId: string; // Added gradeSubjectId
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
  try {
    const classes = await academicService.getClasses();

    if (!classes || !Array.isArray(classes)) {
      return [];
    }

    const flattenedClasses: FlattenedClass[] = classes.map((item) => {
      const gradeData = item.grade_levels;

      return {
        class_id: item.id,
        class_name: item.name,
        grade_id: gradeData ? gradeData.id : 0,
        grade_name: gradeData ? gradeData.name : "Unknown Grade",
      };
    });

    return flattenedClasses;
  } catch (error) {
    console.error("Error fetching classes:", error);
    throw new Error("Failed to load class data.");
  }
};

export const getExamTypes = async (schoolId: string): Promise<string[]> => {
  try {
    const examTypes = await academicService.getExamTypes();
    if (!examTypes || !Array.isArray(examTypes)) {
      return [];
    }
    return examTypes.map((item) => item.name);
  } catch (error) {
    console.error("Error fetching exam types:", error);
    throw new Error("Failed to load exam types.");
  }
};

// getSubjects has been migrated to classService.ts using backend APIs
export const getSubjects = async (gradeLevelId: number): Promise<string[]> => {
  const { getSubjects: getSubjectsFromService } = await import('./classService');
  return getSubjectsFromService(gradeLevelId);
};

// getFileCategories has been migrated to classService.ts using backend APIs
export const getFileCategories = async (schoolId: string): Promise<FileCategoryOption[]> => {
  const { getFileCategories: getFileCategoriesFromService } = await import('./classService');
  return getFileCategoriesFromService(schoolId);
};

// getTeacherClasses has been migrated to classService.ts using backend APIs
export const getTeacherClasses = async (
  teacherId: string,
  schoolId: string
): Promise<FlattenedClass[]> => {
  const { getTeacherClasses: getTeacherClassesFromService } = await import('./classService');
  return getTeacherClassesFromService(teacherId, schoolId);
};

// getGradeSubjectsDetailed has been migrated to classService.ts using backend APIs
export const getGradeSubjectsDetailed = async (
  gradeLevelId: number
): Promise<GradeSubjectOption[]> => {
  const { getGradeSubjectsDetailed: getGradeSubjectsDetailedFromService } = await import('./classService');
  return getGradeSubjectsDetailedFromService(gradeLevelId);
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

// getTeacherFiles and uploadTeacherFile are now in fileService.ts using backend APIs

const normalizeStoragePath = (
  rawPath: string | null | undefined
): string | null => {
  if (!rawPath) return null;
  if (!rawPath.startsWith("http")) {
    return rawPath.replace(/^\/+/, "");
  }

  try {
    const url = new URL(rawPath);
    const bucketMarker = `/FILES_BUCKET/`;
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
  // Use backend API for file deletion
  try {
    await apiClient.delete(`/file-upload/files/${fileId}`);
  } catch (error: unknown) {
    console.error("Error deleting file:", error);
    const message = error instanceof Error ? error.message : "Failed to delete file.";
    throw new Error(message);
  }
};

interface DownloadCountRow {
  download_count: number | null;
}

export const incrementFileDownload = async (
  fileId: string
): Promise<number> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const data = await apiClient.post<{ downloadCount: number }>(
      `/file-upload/files/${fileId}/download`
    );
    return data.downloadCount;
  } catch (error: unknown) {
    console.error("Error incrementing download count:", error);
    const message = error instanceof Error ? error.message : "Failed to update download count.";
    throw new Error(message);
  }
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

// getTeacherAnnouncements has been migrated to announcementService.ts using backend APIs
export const getTeacherAnnouncements = async (
  teacherId: string,
  schoolId: string
): Promise<TeacherAnnouncement[]> => {
  const { getTeacherAnnouncements: getTeacherAnnouncementsFromService } = await import('./announcementService');
  return getTeacherAnnouncementsFromService(teacherId, schoolId);
};

interface CreateAnnouncementParams {
  title: string;
  message: string;
  isUrgent: boolean;
  classIds: string[];
  teacherId: string;
  schoolId: string;
}

// createTeacherAnnouncement has been migrated to announcementService.ts using backend APIs
export const createTeacherAnnouncement = async (
  params: CreateAnnouncementParams
): Promise<TeacherAnnouncement> => {
  const { createTeacherAnnouncement: createTeacherAnnouncementFromService } = await import('./announcementService');
  return createTeacherAnnouncementFromService(params);
};

// deleteTeacherAnnouncement has been migrated to announcementService.ts using backend APIs
export const deleteTeacherAnnouncement = async (
  announcementId: string,
  classId: string
): Promise<void> => {
  const { deleteTeacherAnnouncement: deleteTeacherAnnouncementFromService } = await import('./announcementService');
  return deleteTeacherAnnouncementFromService(announcementId, classId);
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
  fileType?: 'pdf' | 'video';
}

export interface StudentAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: string;
  class_name: string;
}

// Get student data including class_id from backend API
export const getStudentData = async (
  studentId: string
): Promise<StudentData | null> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const data = await apiClient.get<{
      id: string;
      student_details: {
        class_id: string | null;
        roll_number: string | null;
        classes: {
          id: string;
          name: string;
          grade_levels: {
            id: number;
            name: string;
          };
        } | null;
      } | null;
    }>(`/users/${studentId}`);

    if (!data) {
      return null;
    }

    // Extract student_details
    const studentDetails = data.student_details;

    if (!studentDetails) {
      console.warn("No student_details found for student:", studentId);
      return null;
    }

    const classData = studentDetails.classes;
    const gradeData = classData?.grade_levels;

    return {
      id: data.id,
      class_id: studentDetails.class_id || null,
      class_name: classData?.name,
      grade_name: gradeData?.name,
      roll_number: studentDetails.roll_number || undefined,
    };
  } catch (error: unknown) {
    console.error("Error fetching student data:", error);
    const message = error instanceof Error ? error.message : "Failed to load student data.";
    throw new Error(message);
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
  } catch (error) {
    console.error("Error fetching student files:", error);
    throw new Error("Failed to load files.");
  }
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
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const data = await apiClient.get<Array<{
      id: string;
      title: string;
      storageUrl: string;
      storagePath: string;
      durationSeconds: number;
      duration: number;
      fileSizeBytes: number;
      fileSize: number;
      subject: string;
      uploadDate: string;
      createdAt: string;
    }>>(`/file-upload/voice-notes/class/${classId}`);

    return data.map((record) => ({
      id: record.id,
      title: record.title,
      storageUrl: record.storageUrl,
      duration: record.durationSeconds || record.duration || 0,
      fileSize: record.fileSizeBytes || record.fileSize || 0,
      subject: record.subject || "General",
      gradeSubjectId: "", // Not needed for student view
      uploadDate: record.uploadDate || record.createdAt,
    }));
  } catch (error) {
    console.error("Error fetching student voice notes:", error);
    throw new Error("Failed to load voice notes.");
  }
};

// getStudentAnnouncements has been migrated to announcementService.ts using backend APIs
export const getStudentAnnouncements = async (
  classId: string
): Promise<StudentAnnouncement[]> => {
  // Use the backend API implementation from announcementService
  const { getStudentAnnouncements: getStudentAnnouncementsFromService } = await import('./announcementService');
  return getStudentAnnouncementsFromService(classId);
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

// getGradeSubjectIdBySubjectName has been migrated to testService.ts using backend APIs
export const getGradeSubjectIdBySubjectName = async (
  classId: string,
  subjectName: string
): Promise<string | null> => {
  const { getGradeSubjectIdBySubjectName: getGradeSubjectIdBySubjectNameFromService } = await import('./testService');
  return getGradeSubjectIdBySubjectNameFromService(classId, subjectName);
};

// getExamTypeIdByName has been migrated to testService.ts using backend APIs
export const getExamTypeIdByName = async (
  examTypeName: string
): Promise<number | null> => {
  const { getExamTypeIdByName: getExamTypeIdByNameFromService } = await import('./testService');
  return getExamTypeIdByNameFromService(examTypeName);
};

// createTeacherTest has been migrated to testService.ts using backend APIs
export const createTeacherTest = async (
  params: CreateTestParams
): Promise<TeacherTest> => {
  const { createTeacherTest: createTeacherTestFromService } = await import('./testService');
  return createTeacherTestFromService(params) as Promise<TeacherTest>;
};

// getTeacherTest has been migrated to testService.ts using backend APIs
export const getTeacherTest = async (
  testId: string,
  teacherId: string
): Promise<TeacherTest> => {
  const { getTeacherTest: getTeacherTestFromService } = await import('./testService');
  return getTeacherTestFromService(testId, teacherId) as Promise<TeacherTest>;
};

// Get all tests for a teacher
// getTeacherTests has been migrated to testService.ts using backend APIs
export const getTeacherTests = async (
  teacherId: string
): Promise<TeacherTest[]> => {
  const { getTeacherTests: getTeacherTestsFromService } = await import('./testService');
  return getTeacherTestsFromService(teacherId) as Promise<TeacherTest[]>;
};


export const updateTeacherTest = async (
  testId: string,
  params: CreateTestParams
): Promise<TeacherTest> => {
  const { updateTeacherTest: updateTeacherTestFromService } = await import('./testService');
  return updateTeacherTestFromService(testId, params) as Promise<TeacherTest>;
};

export const publishTeacherTest = async (
  testId: string,
  teacherId: string,
  isPublished: boolean
): Promise<void> => {
  const { publishTeacherTest: publishTeacherTestFromService } = await import('./testService');
  return publishTeacherTestFromService(testId, teacherId, isPublished);
};

export const deleteTeacherTest = async (
  testId: string,
  teacherId: string
): Promise<void> => {
  const { deleteTeacherTest: deleteTeacherTestFromService } = await import('./testService');
  return deleteTeacherTestFromService(testId, teacherId);
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
  examTypeCategory?: "Internal Assessment" | "School Exam";
  createdAt: string;
  dueDate?: string;
  questionCount: number;
  totalMarks: number;
  // Submission status
  submissionStatus: "not_started" | "pending" | "graded";
  submittedAt?: string;
  marksObtained?: number;
}

export const getStudentTests = async (
  classId: string,
  studentId: string
): Promise<StudentTest[]> => {
  const { getStudentTests: getStudentTestsFromService } = await import('./testService');
  return getStudentTestsFromService(classId, studentId);
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
  teacherId: string;
  questions: StudentTestQuestion[];
}

export const getStudentTestForAttempt = async (
  testId: string,
  studentId: string
): Promise<StudentTestWithQuestions | null> => {
  const { getStudentTestForAttempt: getStudentTestForAttemptFromService } = await import('./testService');
  return getStudentTestForAttemptFromService(testId, studentId);
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
  const { getStudentSubmission: getStudentSubmissionFromService } = await import('./testService');
  return getStudentSubmissionFromService(testId, studentId);
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
  const { submitStudentTest: submitStudentTestFromService } = await import('./testService');
  return submitStudentTestFromService(params);
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
  const { getTestResult: getTestResultFromService } = await import('./testService');
  const result = await getTestResultFromService(testId, studentId);
  if (!result) return null;
  // Map testService TestResult to academicLegacy TestResult format
  return {
    test: {
      id: testId,
      title: result.testTitle,
      durationMinutes: 0, // Not available in testService result
      subjectName: result.subjectName,
    },
    submission: {
      id: '', // Not available in testService result
      submittedAt: result.submittedAt,
      totalMarksObtained: result.marksObtained,
      totalMarks: result.totalMarks,
    },
    questions: result.questions.map(q => ({
      id: q.questionId,
      text: q.questionText,
      options: q.options || [],
      correctOptionIndex: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      marks: q.marks,
      selectedOptionIndex: typeof q.studentAnswer === 'number' ? q.studentAnswer : null,
      marksAwarded: q.marksAwarded,
    })),
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
  const { getStudentGradedTests: getStudentGradedTestsFromService } = await import('./testService');
  return getStudentGradedTestsFromService(studentId);
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
  const { getStudentsByClass: getStudentsByClassFromService } = await import('./attendanceService');
  const students = await getStudentsByClassFromService(classId);
  return students.map((s) => ({
    id: s.id,
    name: s.name,
    rollNo: s.roll_number || "",
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
  const { getTeacherGradingQueue: getTeacherGradingQueueFromService } = await import('./testService');
  return getTeacherGradingQueueFromService(teacherId);
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

// ==================== ANALYTICS FUNCTIONS REMOVED ====================
// All analytics functions have been migrated to backend APIs.
// Use the functions from @/services/academic (which use analyticsApiService)
// =====================================================================

export const getTestSubmissionsForGrading = async (
  testId: string,
  teacherId: string
): Promise<SubmissionToGrade[]> => {
  const { getTestSubmissionsForGrading: getTestSubmissionsForGradingFromService } = await import('./testService');
  return getTestSubmissionsForGradingFromService(testId, teacherId);
};

export const gradeStudentAnswer = async (
  answerId: string,
  marksAwarded: number
): Promise<void> => {
  const { gradeStudentAnswer: gradeStudentAnswerFromService } = await import('./testService');
  return gradeStudentAnswerFromService(answerId, marksAwarded);
};

export const finalizeSubmissionGrading = async (
  submissionId: string,
  teacherId: string,
  answers: { answer_id: string; marks_awarded: number }[]
): Promise<void> => {
  const { finalizeSubmissionGrading: finalizeSubmissionGradingFromService } = await import('./testService');
  return finalizeSubmissionGradingFromService(submissionId, teacherId, answers);
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

// mapVoiceNoteRecord removed - backend API now returns properly formatted data
// This function is no longer needed as getTeacherVoiceNotes uses backend API directly

// Get all voice notes for a teacher
export const getTeacherVoiceNotes = async (
  teacherId: string,
  schoolId: string
): Promise<TeacherVoiceNote[]> => {
  try {
    const data = await apiClient.get<Array<{
      id: string;
      title: string;
      storageUrl: string;
      storagePath: string;
      durationSeconds: number;
      createdAt: string;
      className: string;
      subject: string;
      size: string;
    }>>("/file-upload/voice-notes");

    return data.map((record) => ({
      id: record.id,
      title: record.title,
      storageUrl: record.storageUrl,
      storagePath: record.storagePath,
      durationSeconds: record.durationSeconds,
      fileSizeBytes: 0, // Not returned from backend
      className: record.className,
      subjectName: record.subject,
      createdAt: record.createdAt,
      size: record.size,
    }));
  } catch (error) {
    console.error("Error fetching voice notes:", error);
    throw new Error("Failed to load voice notes.");
  }
};

// Upload voice note
export const uploadTeacherVoiceNote = async (
  params: UploadVoiceNoteParams
): Promise<TeacherVoiceNote> => {
  const { file, teacherId, classId, gradeSubjectId, title, durationSeconds } = params;

  // Convert Blob to File if needed
  let fileToUpload: File;
  if (file instanceof Blob && !(file instanceof File)) {
    // Create a File from Blob
    const fileName = `voice-${Date.now()}.webm`;
    fileToUpload = new File([file], fileName, { type: file.type || "audio/webm" });
  } else {
    fileToUpload = file as File;
  }

  // Create FormData
  const formData = new FormData();
  formData.append("file", fileToUpload);
  formData.append("title", title);
  formData.append("classId", classId);
  formData.append("gradeSubjectId", gradeSubjectId);
  formData.append("durationSeconds", durationSeconds.toString());

  try {
    const data = await apiClient.uploadFile<{
      id: string;
      title: string;
      storageUrl: string;
      storagePath: string;
      durationSeconds: number;
      createdAt: string;
      className: string;
      subject: string;
      size: string;
    }>("/file-upload/voice-notes", formData);

    return {
      id: data.id,
      title: data.title,
      storageUrl: data.storageUrl,
      storagePath: data.storagePath,
      durationSeconds: data.durationSeconds,
      fileSizeBytes: 0, // Not returned from backend
      className: data.className,
      subjectName: data.subject,
      createdAt: data.createdAt,
      size: data.size,
    };
  } catch (error: unknown) {
    console.error("Error uploading voice note:", error);
    const message = error instanceof Error ? error.message : "Failed to upload voice note.";
    throw new Error(message);
  }
};

// Delete voice note
export const deleteTeacherVoiceNote = async (
  voiceNoteId: string,
  storagePath: string,
  teacherId: string
): Promise<void> => {
  try {
    await apiClient.delete(`/file-upload/voice-notes/${voiceNoteId}`);
  } catch (error: unknown) {
    console.error("Error deleting voice note:", error);
    const message = error instanceof Error ? error.message : "Failed to delete voice note.";
    throw new Error(message);
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

export const getStudentsByClass = async (
  classId: string
): Promise<StudentAttendance[]> => {
  const { getStudentsByClass: getStudentsByClassFromService } = await import('./attendanceService');
  return getStudentsByClassFromService(classId);
};

export const getAttendanceForDate = async (
  classId: string,
  attendanceDate: string
): Promise<Record<string, boolean>> => {
  const { getAttendanceForDate: getAttendanceForDateFromService } = await import('./attendanceService');
  const attendance = await getAttendanceForDateFromService(classId, attendanceDate);
  return attendance as Record<string, boolean>;
};

export const saveAttendance = async (
  classId: string,
  attendanceDate: string,
  students: StudentAttendance[],
  teacherId: string,
  schoolId: string
): Promise<void> => {
  const { saveAttendance: saveAttendanceFromService } = await import('./attendanceService');
  return saveAttendanceFromService(classId, attendanceDate, students, teacherId, schoolId);
};

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
  const { getStudentAttendanceBySubject: getStudentAttendanceBySubjectFromService } = await import('./attendanceService');
  return getStudentAttendanceBySubjectFromService(studentId);
};

// All analytics functions have been migrated to backend APIs
// These functions now redirect to analyticsApiService
export const getStudentSubjectPerformance = async (studentId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getStudentSubjectPerformance(studentId);
};

export const getStudentProgressTrend = async (studentId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getStudentProgressTrend(studentId);
};

export const getStudentStrengthsWeaknesses = async (studentId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getStudentStrengthsWeaknesses(studentId);
};

export const getStudentStatsSummary = async (studentId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getStudentStatsSummary(studentId);
};

export const getClassPerformanceTrend = async (classId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getClassPerformanceTrend(classId);
};

export const getClassStudentsWithScores = async (classId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getClassStudentsWithScores(classId);
};

export const getRecentTestsMetrics = async (classId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getRecentTestsMetrics(classId);
};

export const getClassSubjectAverages = async (classId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getClassSubjectAverages(classId);
};

export const getAttendanceVsMarksData = async (classId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getAttendanceVsMarksData(classId);
};

export const getQuestionTypeDistribution = async (classId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getQuestionTypeDistribution(classId);
};

export const getStudentAnalyticsForTeacher = async (studentId: string, classId: string) => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getStudentAnalyticsForTeacher(studentId, classId);
};


export const getOverallAttendancePercentage = async (
  studentId: string
): Promise<number> => {
  const { getStudentAttendanceBySubject: getStudentAttendanceBySubjectFromService } = await import('./attendanceService');
  const attendance = await getStudentAttendanceBySubjectFromService(studentId);
  if (attendance.length === 0) return 0;
  const total = attendance.reduce((sum, a) => sum + a.total, 0);
  const present = attendance.reduce((sum, a) => sum + a.present, 0);
  return total > 0 ? (present / total) * 100 : 0;
};

export const getStudentPendingTestsCount = async (
  studentId: string
): Promise<number> => {
  try {
    const { getStudentTests: getStudentTestsFromService } = await import('./testService');
    const { userService } = await import('./userService');
    const student = await userService.getUser(studentId);
    const classId = student?.student_details?.class_id;
    if (!classId) return 0;
    const tests = await getStudentTestsFromService(classId, studentId);
    return tests.filter(t => t.submissionStatus === "not_started" && t.examTypeCategory !== "Internal Assessment").length;
  } catch (error) {
    console.error("Error in getStudentPendingTestsCount:", error);
    return 0;
  }
};

export const getStudentPendingAssessmentsCount = async (
  studentId: string
): Promise<number> => {
  try {
    const { getStudentTests: getStudentTestsFromService } = await import('./testService');
    const { userService } = await import('./userService');
    const student = await userService.getUser(studentId);
    const classId = student?.student_details?.class_id;
    if (!classId) return 0;
    const tests = await getStudentTestsFromService(classId, studentId);
    return tests.filter(t => t.submissionStatus === "not_started" && t.examTypeCategory === "Internal Assessment").length;
  } catch (error) {
    console.error("Error in getStudentPendingAssessmentsCount:", error);
    return 0;
  }
};

export const getStudentAverageMarksPercentage = async (
  studentId: string
): Promise<number> => {
  try {
    const { analyticsApi } = await import('./analyticsApiService');
    const stats = await analyticsApi.getStudentStatsSummary(studentId);
    return stats.overallPercentage || 0;
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

export const getStudentChapterTopicAnalytics = async (
  studentId: string
): Promise<StudentChapterTopicAnalytics> => {
  const { analyticsApi } = await import('./analyticsApiService');
  return analyticsApi.getStudentChapterTopicAnalytics(studentId);
};

// Interface for subject performance data (for radar chart)
export interface SubjectPerformance {
  subject: string;
  score: number;
  fullMark: number;
}


// Export interfaces for type compatibility
export interface ProgressTrendPoint {
  month: string;
  score: number;
}

export interface StrengthWeaknessItem {
  subject: string;
  desc: string;
  topic?: string;
  mastery?: number;
}

export interface StudentStatsSummary {
  overallPercentage: number;
  totalTests: number;
  bestSubject: string;
  attendancePercentage: number;
}

export interface ClassPerformanceTrend {
  month: string;
  avgScore: number;
  attendance: number;
}

export interface ClassStudentWithScore {
  id: string;
  name: string;
  avgScore: number;
  attendancePercentage: number;
}

export interface RecentTestMetrics {
  test: string;
  avg: number;
  top: number;
}

export interface SubjectAverageData {
  subject: string;
  avg: number;
}

export interface AttendanceVsMarks {
  attendance: number;
  marks: number;
  student: string;
}

export interface QuestionTypeDistribution {
  name: string;
  value: number;
}

export interface StudentAnalyticsForTeacher {
  radar: { subject: string; A: number; B: number; fullMark: number }[];
  strengths: { subject: string; desc: string }[];
  weaknesses: { subject: string; desc: string }[];
  progress?: ProgressTrendPoint[];
  attendance?: { percentage: number; presentDays: number; totalDays: number };
  chapterTopic?: StudentChapterTopicAnalytics;
}
