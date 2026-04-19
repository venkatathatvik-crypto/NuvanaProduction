import axios, { AxiosError } from 'axios';
import { logger } from '@/lib/logger';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface CreateSessionDto {
  school_id: string;
  teacher_id: string;
  class_id: string;
  file_id?: string;
  session_name?: string;
}

export interface SendQuestionDto {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: 'A' | 'B' | 'C' | 'D';
  time_limit_seconds: number;
  points: number;
}

function handleApiError(error: unknown, context: string): never {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message || error.message;
    const status = error.response?.status;
    logger.error(`[EngagementAPI] ${context} failed (${status}): ${message}`);
    throw new Error(`${context}: ${message}`);
  }
  logger.error(`[EngagementAPI] ${context} failed:`, error);
  throw error instanceof Error ? error : new Error(String(error));
}

export const engagementApi = {
  // Create a new session
  createSession: async (data: CreateSessionDto, token: string) => {
    try {
      const response = await axios.post(
        `${API_URL}/engagement/sessions`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Create session');
    }
  },

  // End a session
  endSession: async (sessionId: string, token: string) => {
    try {
      const response = await axios.post(
        `${API_URL}/engagement/sessions/${sessionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'End session');
    }
  },

  // Send a question
  sendQuestion: async (
    sessionId: string,
    data: SendQuestionDto,
    token: string
  ) => {
    try {
      const response = await axios.post(
        `${API_URL}/engagement/sessions/${sessionId}/questions`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Send question');
    }
  },

  // Get session details
  getSession: async (sessionId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/sessions/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get session');
    }
  },

  // Get session analytics
  getSessionAnalytics: async (sessionId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/sessions/${sessionId}/analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get session analytics');
    }
  },

  // Get teacher's sessions
  getTeacherSessions: async (teacherId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/teacher/${teacherId}/sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get teacher sessions');
    }
  },

  // Get student history
  getStudentHistory: async (studentId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/student/${studentId}/history`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get student history');
    }
  },

  // Get active session for class
  getActiveSession: async (classId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/class/${classId}/active`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get active session');
    }
  },

  // Get school-wide analytics
  getSchoolAnalytics: async (schoolId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/school/${schoolId}/analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get school analytics');
    }
  },

  // Get teacher leaderboard
  getTeacherLeaderboard: async (schoolId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/school/${schoolId}/leaderboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get teacher leaderboard');
    }
  },

  // Get student-level details for a specific session
  getSessionStudentDetails: async (sessionId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/sessions/${sessionId}/students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get session student details');
    }
  },

  // Get class and subject engagement analytics for admin
  getClassSubjectAnalytics: async (schoolId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/school/${schoolId}/class-subject-analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get class subject analytics');
    }
  },

  // ── Tiered Dashboard Methods ─────────────────────────────────────────────

  // Admin Dashboard: Grade-level grouping + Top Teacher
  getAdminDashboard: async (schoolId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/admin/${schoolId}/dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get admin dashboard');
    }
  },

  // Teacher Session Dashboard: Topic Health + At-Risk Students
  getTeacherSessionDashboard: async (sessionId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/teacher/sessions/${sessionId}/dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get teacher session dashboard');
    }
  },

  // Student Performance: Recent trends + Rank
  getStudentPerformance: async (studentId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/student/${studentId}/performance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get student performance');
    }
  },

  // Get session leaderboard for student podium
  getSessionLeaderboard: async (sessionId: string, token: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/engagement/sessions/${sessionId}/leaderboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      handleApiError(error, 'Get session leaderboard');
    }
  },
};
