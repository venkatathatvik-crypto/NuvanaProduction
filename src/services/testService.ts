// Test services - migrated to use backend API
import { testApi } from './testApiService';
import { logger } from '@/lib/logger';

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
  examTypeCategory?: 'Internal Assessment' | 'School Exam';
  teacherId: string;
  createdAt: string;
  dueDate?: string;
  questions: TestQuestion[];
  questionCount?: number; // For list view when questions array is not included
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
    id?: string; // Optional ID for updates (undefined for new questions)
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
  examTypeCategory: apiTest.exam_type_category as 'Internal Assessment' | 'School Exam' | undefined,
  teacherId: apiTest.teacher_id,
  createdAt: apiTest.created_at,
  dueDate: apiTest.due_date,
  // For list view, questions array might not be included, so use question_count if available
  // For detail view, questions array will be present
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
  })) || (apiTest.question_count ? Array(apiTest.question_count).fill(null) : []),
  questionCount: apiTest.question_count || apiTest.questions?.length || 0,
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
  // Map camelCase params to snake_case API format
  // Don't spread params to avoid sending camelCase properties
  const apiTest = await testApi.createTest({
    title: params.title,
    description: params.description,
    duration_minutes: params.durationMinutes,
    is_published: params.isPublished,
    class_id: params.classId,
    grade_subject_id: params.gradeSubjectId,
    exam_type_id: params.examTypeId,
    teacher_id: params.teacherId,
    due_date: params.dueDate,
    questions: params.questions.map((q) => {
      // Map display values to enum keys for Prisma
      // Frontend sends: "Short Answer" -> Backend needs: "Short_Answer"
      let questionType = q.questionType || 'MCQ';
      if (questionType === 'Short Answer') {
        questionType = 'Short_Answer' as any;
      } else if (questionType === 'Very Short Answer') {
        questionType = 'Very_Short_Answer' as any;
      }
      
      return {
        question_text: q.text,
        marks: q.marks,
        chapter: q.chapter,
        topic: q.topic,
        question_type: questionType,
        correct_option_index: q.correctOptionIndex,
        expected_answer_text: q.expectedAnswerText,
        options: q.options,
      };
    }),
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
  // Normalize dueDate to proper ISO-8601 format if provided
  let normalizedDueDate: string | undefined = undefined;
  if (params.dueDate && params.dueDate.trim()) {
    try {
      let dateString = params.dueDate.trim();
      // Check if it's missing seconds (format: YYYY-MM-DDTHH:MM)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateString)) {
        // Add seconds and timezone
        dateString = `${dateString}:00.000Z`;
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateString)) {
        // Has seconds but no timezone, add timezone
        dateString = `${dateString}.000Z`;
      }
      // Validate the date is valid
      const testDate = new Date(dateString);
      if (!isNaN(testDate.getTime())) {
        normalizedDueDate = dateString;
      }
    } catch (error) {
      logger.warn('[updateTeacherTest] Error normalizing dueDate, ignoring:', error);
    }
  }

  // Map camelCase params to snake_case API format and include questions
  const apiTest = await testApi.updateTest(testId, params.teacherId, {
    title: params.title,
    description: params.description,
    duration_minutes: params.durationMinutes,
    is_published: params.isPublished,
    class_id: params.classId,
    grade_subject_id: params.gradeSubjectId,
    exam_type_id: params.examTypeId,
    due_date: normalizedDueDate,
    questions: params.questions?.map((q) => ({
      id: q.id, // Include question ID for updates (undefined for new questions)
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

export interface SubmitTestParams {
  testId: string;
  studentId: string;
  answers: Record<string, number | string>; // questionId -> selectedOptionIndex (MCQ) or text answer (subjective)
  timeTakenSeconds: number;
}

export const submitStudentTest = async (
  params: SubmitTestParams,
): Promise<StudentSubmission> => {
  const { testId, studentId, answers } = params;

  // Get test questions to determine question types
  const test = await testApi.getStudentTest(testId, studentId);
  if (!test || !test.questions) {
    throw new Error('Test not found or has no questions');
  }

  // Convert answers Record to array format expected by API
  logger.log('[submitStudentTest] Raw answers object:', answers);
  logger.log('[submitStudentTest] Test questions:', test.questions.map(q => ({ 
    id: q.id, 
    type: q.question_type || q.questionType,
    rawQuestion: q 
  })));
  
  const answerArray = test.questions.map((q: any) => {
    const answerValue = answers[q.id]; // This will be undefined if question wasn't answered
    // API returns question_type (snake_case), handle both formats
    const questionType = q.question_type || q.questionType;
    const isMCQ = questionType === 'MCQ';
    
    logger.log('[submitStudentTest] Processing question:', {
      question_id: q.id,
      question_type_raw: q.question_type,
      questionType_camel: q.questionType,
      questionType_resolved: questionType,
      answerValue,
      answerValueType: typeof answerValue,
      isMCQ,
    });
    
    // Explicitly handle the answer value
    // For MCQ: always include student_selected_option_index (null if not answered, number if answered)
    // For subjective: include subjective_answer_text
    const answerObj: any = {
      question_id: q.id,
    };
    
    if (isMCQ) {
      // For MCQ questions - check if answerValue exists and is a number
      if (answerValue !== undefined && answerValue !== null && typeof answerValue === 'number') {
        // Student selected an option (including 0)
        answerObj.student_selected_option_index = answerValue;
        logger.log('[submitStudentTest] MCQ answer found:', answerValue);
      } else {
        // Student didn't answer - explicitly set to null
        answerObj.student_selected_option_index = null;
        logger.log('[submitStudentTest] MCQ answer not found, setting to null');
      }
      // Don't include subjective_answer_text for MCQ
    } else {
      // For subjective questions
      if (answerValue !== undefined && answerValue !== null && typeof answerValue === 'string' && answerValue.trim() !== '') {
        answerObj.subjective_answer_text = answerValue;
      } else {
        answerObj.subjective_answer_text = null;
      }
      // Don't include student_selected_option_index for subjective
    }
    
    return answerObj;
  });
  
  logger.log('[submitStudentTest] Final answer array to send:', JSON.stringify(answerArray, null, 2));

  // Submit test
  const result = await testApi.submitTest(testId, studentId, answerArray);

  // Return submission object matching the old interface
  return {
    id: result.submission_id,
    testId,
    studentId,
    submittedAt: new Date().toISOString(),
    isGraded: false, // Will be false until teacher grades
    totalMarksObtained: 0, // Will be set after grading
    answers: test.questions.map((q) => {
      const answerValue = answers[q.id];
      const isMCQ = q.questionType === 'MCQ';
      
      return {
        questionId: q.id,
        selectedOptionIndex: isMCQ && typeof answerValue === 'number' ? answerValue : null,
        subjectiveAnswerText: !isMCQ && typeof answerValue === 'string' ? answerValue : null,
        marksAwarded: 0, // Will be set by teacher during grading
      };
    }),
  };
};

// Helper functions
export const getGradeSubjectIdBySubjectName = async (
  classId: string,
  subjectName: string,
): Promise<string | null> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const result = await apiClient.get(`/academic/helper/grade-subject/${classId}/${encodeURIComponent(subjectName)}`);
    logger.log('[getGradeSubjectIdBySubjectName] API response:', result);
    logger.log('[getGradeSubjectIdBySubjectName] Response type:', typeof result);
    
    // Handle if result is an object with id property
    if (result && typeof result === 'object' && result !== null && 'id' in result) {
      const id = result.id;
      if (id === null || id === undefined) {
        logger.warn('[getGradeSubjectIdBySubjectName] ID is null or undefined');
        return null;
      }
      logger.log('[getGradeSubjectIdBySubjectName] Extracting ID from object:', id);
      return String(id);
    }
    
    // Handle if result is already a string ID
    if (typeof result === 'string') {
      logger.log('[getGradeSubjectIdBySubjectName] Using string ID directly:', result);
      return result;
    }
    
    logger.warn('[getGradeSubjectIdBySubjectName] Unexpected response format:', result);
    return null;
  } catch (error) {
    logger.error('[getGradeSubjectIdBySubjectName] Error:', error);
    if (error instanceof Error) {
      logger.error('[getGradeSubjectIdBySubjectName] Error message:', error.message);
      logger.error('[getGradeSubjectIdBySubjectName] Error stack:', error.stack);
    }
    return null;
  }
};

export const getExamTypeIdByName = async (
  examTypeName: string,
): Promise<number | null> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const result = await apiClient.get(`/academic/helper/exam-type/${examTypeName}`);
    logger.log('[getExamTypeIdByName] API response:', result);
    logger.log('[getExamTypeIdByName] Response type:', typeof result);
    
    // Handle if result is an object with id property
    if (result && typeof result === 'object' && 'id' in result) {
      logger.log('[getExamTypeIdByName] Extracting ID from object:', result.id);
      return result.id as number | null;
    }
    
    // Handle if result is already a number
    if (typeof result === 'number') {
      logger.log('[getExamTypeIdByName] Using number ID directly:', result);
      return result;
    }
    
    logger.warn('[getExamTypeIdByName] Unexpected response format:', result);
    return null;
  } catch (error) {
    logger.error('[getExamTypeIdByName] Error:', error);
    return null;
  }
};

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
    subjectiveAnswerText: string | null;
    marksAwarded: number;
  }[];
}

export const getStudentSubmission = async (
  testId: string,
  studentId: string,
): Promise<StudentSubmission | null> => {
  try {
    const submission = await testApi.getSubmissionByTestAndStudent(testId, studentId);
    return {
      id: submission.id,
      testId: submission.test_id,
      studentId: submission.student_id,
      submittedAt: submission.submitted_at,
      isGraded: submission.is_graded,
      totalMarksObtained: submission.total_marks_obtained ?? 0,
      answers: submission.answers.map((a: any) => ({
        questionId: a.question_id,
        selectedOptionIndex: a.student_selected_option_index,
        subjectiveAnswerText: a.subjective_answer_text,
        marksAwarded: a.marks_awarded ?? 0,
      })),
    };
  } catch (error) {
    logger.error('[getStudentSubmission] Error:', error);
    return null;
  }
};

export interface TestResult {
  testId: string;
  testTitle: string;
  subjectName: string;
  submittedAt: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  questions: {
    questionId: string;
    questionText: string;
    questionType: string;
    marks: number;
    studentAnswer: string | number | null;
    correctAnswer: string | number | null;
    marksAwarded: number;
    options?: string[];
  }[];
}

export const getTestResult = async (
  testId: string,
  studentId: string,
): Promise<TestResult | null> => {
  try {
    // Get submission details (includes test info and answers)
    const submissionData = await testApi.getSubmissionByTestAndStudent(testId, studentId);
    if (!submissionData || !submissionData.is_graded) {
      return null;
    }

    // Get test details for title and subject
    const test = await testApi.getStudentTest(testId, studentId);
    if (!test) return null;

    // Calculate total marks and percentage
    const totalMarks = submissionData.answers.reduce((sum: number, a: any) => sum + a.marks, 0);
    const marksObtained = submissionData.total_marks_obtained ?? 0;
    const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

    // Map questions with answers
    const questions = submissionData.answers.map((a: any) => ({
      questionId: a.question_id,
      questionText: a.question_text,
      questionType: a.question_type,
      marks: a.marks,
      studentAnswer: a.student_selected_option_index ?? a.subjective_answer_text ?? null,
      correctAnswer: a.correct_option_index ?? a.expected_answer_text ?? null,
      marksAwarded: a.marks_awarded ?? 0,
      options: a.options || [],
    }));

    return {
      testId,
      testTitle: test.title,
      subjectName: test.subject_name || '',
      submittedAt: submissionData.submitted_at,
      totalMarks,
      marksObtained,
      percentage,
      questions,
    };
  } catch (error) {
    logger.error('[getTestResult] Error:', error);
    return null;
  }
};

export interface StudentGradedTest {
  id: string;
  testId: string;
  testTitle: string;
  subjectName: string;
  examTypeName: string;
  submittedAt: string;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
}

export const getStudentGradedTests = async (
  studentId: string,
): Promise<StudentGradedTest[]> => {
  try {
    const tests = await testApi.getStudentGradedTests(studentId);
    return tests.map((t: any) => ({
      id: t.id,
      testId: t.testId,
      testTitle: t.testTitle,
      subjectName: t.subjectName,
      examTypeName: t.examTypeName,
      submittedAt: t.submittedAt,
      totalMarks: t.totalMarks,
      marksObtained: t.marksObtained,
      percentage: t.percentage,
    }));
  } catch (error) {
    logger.error('[getStudentGradedTests] Error:', error);
    return [];
  }
};

// ==================== TEACHER GRADING ====================

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

export const getTeacherGradingQueue = async (
  teacherId: string,
): Promise<GradingQueueItem[]> => {
  try {
    const queue = await testApi.getTeacherGradingQueue(teacherId);
    return queue.map((item: any) => ({
      testId: item.test_id,
      testTitle: item.test_title,
      className: item.class_name,
      subjectName: item.subject_name,
      examTypeName: item.exam_type_name,
      totalSubmissions: item.total_submissions,
      gradedCount: item.graded_count,
      pendingCount: item.pending_count,
      createdAt: item.created_at,
    }));
  } catch (error) {
    logger.error('[getTeacherGradingQueue] Error:', error);
    return [];
  }
};

export interface SubmissionToGrade {
  submissionId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
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
    options: string[];
    selectedOptionIndex: number | null;
    correctOptionIndex: number | null;
    subjectiveAnswerText?: string;
    marksAwarded: number;
  }[];
}

export const getTestSubmissionsForGrading = async (
  testId: string,
  teacherId: string,
): Promise<SubmissionToGrade[]> => {
  try {
    const submissions = await testApi.getTestSubmissions(testId, teacherId);
    return submissions.map((sub: any) => ({
      submissionId: sub.submission_id,
      studentId: sub.student_id,
      studentName: sub.student_name,
      studentEmail: sub.student_email,
      studentRollNo: sub.student_roll_no,
      submittedAt: sub.submitted_at,
      isGraded: sub.is_graded,
      totalMarksObtained: sub.total_marks_obtained,
      answers: sub.answers.map((a: any) => ({
        answerId: a.answer_id,
        questionId: a.question_id,
        questionText: a.question_text,
        questionType: a.question_type as QuestionType,
        questionMarks: a.question_marks,
        chapter: a.chapter,
        topic: a.topic,
        expectedAnswerText: a.expected_answer_text,
        options: a.options || [],
        selectedOptionIndex: a.selected_option_index,
        correctOptionIndex: a.correct_option_index,
        subjectiveAnswerText: a.subjective_answer_text,
        marksAwarded: a.marks_awarded,
      })),
    }));
  } catch (error) {
    logger.error('[getTestSubmissionsForGrading] Error:', error);
    return [];
  }
};

export const gradeStudentAnswer = async (
  answerId: string,
  marksAwarded: number,
): Promise<void> => {
  // This is handled by gradeSubmission endpoint which grades all answers at once
  // Keeping for compatibility but it's a no-op
  // The actual grading happens in handleSaveGrades via gradeSubmission
};

export const finalizeSubmissionGrading = async (
  submissionId: string,
  teacherId: string,
  answers: { answer_id: string; marks_awarded: number }[],
): Promise<void> => {
  try {
    await testApi.gradeSubmission(teacherId, submissionId, answers);
  } catch (error) {
    logger.error('[finalizeSubmissionGrading] Error:', error);
    throw error;
  }
};

// ==================== MANUAL MARKS ====================

export interface ManualMarkEntry {
  student_id: string;
  marks_obtained: number;
}

export interface SaveManualMarksParams {
  title: string;
  classId: string;
  gradeSubjectId: string;
  examTypeId: number;
  maxMarks: number;
  marks: ManualMarkEntry[];
  description?: string;
}

export const saveManualMarks = async (params: SaveManualMarksParams): Promise<any> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    return await apiClient.post('/academic/manual-marks', {
      title: params.title,
      class_id: params.classId,
      grade_subject_id: params.gradeSubjectId,
      exam_type_id: params.examTypeId,
      max_marks: params.maxMarks,
      marks: params.marks,
      description: params.description,
    });
  } catch (error) {
    logger.error('[saveManualMarks] Error:', error);
    throw error;
  }
};

export const getClassStudents = async (classId: string): Promise<any[]> => {
  try {
    const { apiClient } = await import('@/lib/apiClient');
    const students = await apiClient.get<any[]>(`/academic/classes/${classId}/students`);
    return students.map(s => ({
      id: s.id,
      name: s.name,
      rollNo: s.student_details?.roll_number,
    }));
  } catch (error) {
    logger.error('[getClassStudents] Error:', error);
    throw error;
  }
};
