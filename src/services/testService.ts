// Test services - migrated to use backend API
import { testApi } from './testApiService';

export type QuestionType = 'MCQ' | 'Essay' | 'Short Answer' | 'Very Short Answer';

export interface TestQuestion {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex?: number;
  marks: number;
  chapter: string;
  topic: string;
  questionType?: QuestionType;
  expectedAnswerText?: string;
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
  examTypeCategory?: 'Internal Assessment' | 'School Exam';
  createdAt: string;
  dueDate?: string;
  questionCount: number;
  totalMarks: number;
  submissionStatus: 'not_started' | 'pending' | 'graded';
  submittedAt?: string;
  marksObtained?: number;
}

export interface CreateTestParams {
  title: string;
  description?: string;
  durationMinutes: number;
  isPublished: boolean;
  classId: string;
  gradeSubjectId: string;
  examTypeId: number;
  teacherId: string;
  schoolId: string; // Not used in API (comes from JWT)
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

export interface StudentTestQuestion {
  id: string;
  text: string;
  questionType: QuestionType;
  options: string[];
  marks: number;
  chapter?: string;
  topic?: string;
}

// Helper to convert API response to frontend format
const mapTeacherTest = (apiTest: any): TeacherTest => ({
  id: apiTest.id,
  title: apiTest.title,
  description: apiTest.description,
  durationMinutes: apiTest.duration_minutes,
  isPublished: apiTest.is_published,
  classId: apiTest.class_id,
  className: apiTest.class_name,
  gradeSubjectId: apiTest.grade_subject_id,
  subjectName: apiTest.subject_name,
  examTypeId: apiTest.exam_type_id,
  examTypeName: apiTest.exam_type_name,
  teacherId: apiTest.teacher_id,
  createdAt: apiTest.created_at,
  dueDate: apiTest.due_date,
  questions: apiTest.questions?.map((q: any) => ({
    id: q.id,
    text: q.question_text,
    options: q.options || [],
    correctOptionIndex: q.correct_option_index,
    marks: q.marks,
    chapter: q.chapter || '',
    topic: q.topic || '',
    questionType: q.question_type,
    expectedAnswerText: q.expected_answer_text,
  })) || [],
});

const mapStudentTest = (apiTest: any): StudentTest => ({
  id: apiTest.id,
  title: apiTest.title,
  description: apiTest.description,
  durationMinutes: apiTest.duration_minutes,
  classId: apiTest.class_id,
  className: apiTest.class_name,
  subjectName: apiTest.subject_name,
  examTypeId: apiTest.exam_type_id,
  examTypeName: apiTest.exam_type_name,
  examTypeCategory: apiTest.exam_type_category,
  createdAt: apiTest.created_at,
  dueDate: apiTest.due_date,
  questionCount: apiTest.question_count,
  totalMarks: apiTest.total_marks,
  submissionStatus: apiTest.submission_status,
  submittedAt: apiTest.submitted_at,
  marksObtained: apiTest.marks_obtained,
});

// ==================== TEACHER FUNCTIONS ====================

export const createTeacherTest = async (
  params: CreateTestParams,
): Promise<TeacherTest> => {
  const apiTest = await testApi.createTest({
    ...params,
    duration_minutes: params.durationMinutes,
    is_published: params.isPublished,
    class_id: params.classId,
    grade_subject_id: params.gradeSubjectId,
    exam_type_id: params.examTypeId,
    teacher_id: params.teacherId,
    due_date: params.dueDate,
    questions: params.questions.map((q) => ({
      question_text: q.text,
      marks: q.marks,
      chapter: q.chapter,
      topic: q.topic,
      question_type: q.questionType || 'MCQ',
      correct_option_index: q.correctOptionIndex,
      expected_answer_text: q.expectedAnswerText,
      options: q.options,
    })),
  });

  return mapTeacherTest(apiTest);
};

export const getTeacherTest = async (
  testId: string,
  teacherId: string,
): Promise<TeacherTest> => {
  const apiTest = await testApi.getTeacherTest(testId, teacherId);
  return mapTeacherTest(apiTest);
};

export const getTeacherTests = async (teacherId: string): Promise<TeacherTest[]> => {
  const apiTests = await testApi.getTeacherTests(teacherId);
  return apiTests.map(mapTeacherTest);
};

export const updateTeacherTest = async (
  testId: string,
  params: CreateTestParams,
): Promise<TeacherTest> => {
  // Note: Backend doesn't support updating questions yet,
  // so we'll just update metadata
  const apiTest = await testApi.updateTest(testId, params.teacherId, {
    title: params.title,
    description: params.description,
    duration_minutes: params.durationMinutes,
    is_published: params.isPublished,
    class_id: params.classId,
    grade_subject_id: params.gradeSubjectId,
    exam_type_id: params.examTypeId,
    due_date: params.dueDate,
  });
  return mapTeacherTest(apiTest);
};

export const publishTeacherTest = async (
  testId: string,
  teacherId: string,
  isPublished: boolean,
): Promise<void> => {
  await testApi.publishTest(testId, teacherId, isPublished);
};

export const deleteTeacherTest = async (
  testId: string,
  teacherId: string,
): Promise<void> => {
  await testApi.deleteTest(testId, teacherId);
};

// ==================== STUDENT FUNCTIONS ====================

export const getStudentTests = async (
  classId: string,
  studentId: string,
): Promise<StudentTest[]> => {
  const apiTests = await testApi.getStudentTests(classId, studentId);
  return apiTests.map(mapStudentTest);
};

export const getStudentTestForAttempt = async (
  testId: string,
  studentId: string,
): Promise<StudentTestWithQuestions | null> => {
  try {
    const apiTest = await testApi.getStudentTest(testId, studentId);
    return {
      id: apiTest.id,
      title: apiTest.title,
      description: apiTest.description,
      durationMinutes: apiTest.duration_minutes,
      subjectName: apiTest.subject_name,
      examTypeId: apiTest.exam_type_id,
      teacherId: apiTest.teacher_id,
      questions: apiTest.questions.map((q: any) => ({
        id: q.id,
        text: q.question_text,
        questionType: q.question_type,
        options: q.options || [],
        marks: q.marks,
        chapter: q.chapter,
        topic: q.topic,
      })),
    };
  } catch {
    return null;
  }
};

export const submitStudentTest = async (
  testId: string,
  studentId: string,
  answers: {
    questionId: string;
    selectedOptionIndex?: number;
    subjectiveAnswerText?: string;
  }[],
): Promise<{ submissionId: string }> => {
  const result = await testApi.submitTest(
    testId,
    studentId,
    answers.map((a) => ({
      question_id: a.questionId,
      student_selected_option_index: a.selectedOptionIndex,
      subjective_answer_text: a.subjectiveAnswerText,
    })),
  );
  return { submissionId: result.submission_id };
};

// Helper functions
export const getGradeSubjectIdBySubjectName = async (
  classId: string,
  subjectName: string,
): Promise<string | null> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const result = await apiClient.get(`/academic/helper/grade-subject/${classId}/${subjectName}`);
    return result || null;
  } catch {
    return null;
  }
};

export const getExamTypeIdByName = async (
  examTypeName: string,
): Promise<number | null> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const result = await apiClient.get(`/academic/helper/exam-type/${examTypeName}`);
    return result || null;
  } catch {
    return null;
  }
};
