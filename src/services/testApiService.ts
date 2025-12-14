import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================
export type QuestionType = 'MCQ' | 'Essay' | 'Short Answer' | 'Very Short Answer';

export interface TestQuestion {
  id: string;
  question_text: string;
  marks: number;
  chapter?: string;
  topic?: string;
  question_type: QuestionType;
  correct_option_index?: number;
  expected_answer_text?: string;
  options: string[];
}

export interface TeacherTest {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  is_published: boolean;
  class_id: string;
  class_name?: string;
  grade_subject_id: string;
  subject_name?: string;
  exam_type_id: number;
  exam_type_name?: string;
  teacher_id: string;
  created_at: string;
  due_date?: string;
  questions?: TestQuestion[];
  question_count?: number;
  total_marks?: number;
}

export interface StudentTest {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  class_id: string;
  subject_name?: string;
  exam_type_id: number;
  exam_type_name?: string;
  exam_type_category?: 'Internal Assessment' | 'School Exam';
  created_at: string;
  due_date?: string;
  question_count: number;
  total_marks: number;
  submission_status: 'not_started' | 'pending' | 'graded';
  submitted_at?: string;
  marks_obtained?: number;
}

export interface StudentAnswer {
  question_id: string;
  student_selected_option_index?: number;
  subjective_answer_text?: string;
}

export interface CreateTestParams {
  title: string;
  description?: string;
  duration_minutes: number;
  is_published: boolean;
  class_id: string;
  grade_subject_id: string;
  exam_type_id: number;
  teacher_id: string;
  due_date?: string;
  questions: {
    question_text: string;
    marks: number;
    chapter?: string;
    topic?: string;
    question_type: QuestionType;
    correct_option_index?: number;
    expected_answer_text?: string;
    options?: string[];
  }[];
}

// ==================== TEST API SERVICE ====================
export const testApi = {
  // ==================== TEACHER OPERATIONS ====================
  
  async createTest(params: CreateTestParams): Promise<TeacherTest> {
    return apiClient.post('/tests', params);
  },

  async getTeacherTests(teacherId: string): Promise<TeacherTest[]> {
    return apiClient.get(`/tests/teacher/${teacherId}`);
  },

  async getTeacherTest(testId: string, teacherId: string): Promise<TeacherTest> {
    return apiClient.get(`/tests/${testId}/teacher/${teacherId}`);
  },

  async updateTest(
    testId: string,
    teacherId: string,
    data: Partial<Omit<CreateTestParams, 'teacher_id' | 'questions'>>,
  ): Promise<TeacherTest> {
    return apiClient.patch(`/tests/${testId}/teacher/${teacherId}`, data);
  },

  async publishTest(
    testId: string,
    teacherId: string,
    isPublished: boolean,
  ): Promise<{ message: string }> {
    return apiClient.patch(`/tests/${testId}/publish/${teacherId}`, {
      is_published: isPublished,
    });
  },

  async deleteTest(testId: string, teacherId: string): Promise<{ message: string }> {
    return apiClient.delete(`/tests/${testId}/teacher/${teacherId}`);
  },

  async getTestSubmissions(testId: string, teacherId: string): Promise<any[]> {
    return apiClient.get(`/tests/${testId}/submissions/teacher/${teacherId}`);
  },

  async gradeSubmission(
    teacherId: string,
    submissionId: string,
    totalMarksObtained?: number,
  ): Promise<{ message: string }> {
    return apiClient.post(`/tests/submissions/grade/${teacherId}`, {
      submission_id: submissionId,
      total_marks_obtained: totalMarksObtained,
    });
  },

  // ==================== STUDENT OPERATIONS ====================

  async getStudentTests(classId: string, studentId: string): Promise<StudentTest[]> {
    return apiClient.get(`/tests/student/class/${classId}/student/${studentId}`);
  },

  async getStudentTest(testId: string, studentId: string): Promise<any> {
    return apiClient.get(`/tests/${testId}/student/${studentId}`);
  },

  async submitTest(
    testId: string,
    studentId: string,
    answers: StudentAnswer[],
  ): Promise<{ message: string; submission_id: string }> {
    return apiClient.post('/tests/submit', {
      test_id: testId,
      student_id: studentId,
      answers,
    });
  },

  async getStudentSubmission(submissionId: string, studentId: string): Promise<any> {
    return apiClient.get(`/tests/submissions/${submissionId}/student/${studentId}`);
  },
};
