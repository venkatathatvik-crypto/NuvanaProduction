import axios from 'axios';

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

export const engagementApi = {
  // Create a new session
  createSession: async (data: CreateSessionDto, token: string) => {
    const response = await axios.post(
      `${API_URL}/engagement/sessions`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // End a session
  endSession: async (sessionId: string, token: string) => {
    const response = await axios.post(
      `${API_URL}/engagement/sessions/${sessionId}/end`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Send a question
  sendQuestion: async (
    sessionId: string,
    data: SendQuestionDto,
    token: string
  ) => {
    const response = await axios.post(
      `${API_URL}/engagement/sessions/${sessionId}/questions`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get session details
  getSession: async (sessionId: string, token: string) => {
    const response = await axios.get(
      `${API_URL}/engagement/sessions/${sessionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get session analytics
  getSessionAnalytics: async (sessionId: string, token: string) => {
    const response = await axios.get(
      `${API_URL}/engagement/sessions/${sessionId}/analytics`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get teacher's sessions
  getTeacherSessions: async (teacherId: string, token: string) => {
    const response = await axios.get(
      `${API_URL}/engagement/teacher/${teacherId}/sessions`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get student history
  getStudentHistory: async (studentId: string, token: string) => {
    const response = await axios.get(
      `${API_URL}/engagement/student/${studentId}/history`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get active session for class
  getActiveSession: async (classId: string, token: string) => {
    const response = await axios.get(
      `${API_URL}/engagement/class/${classId}/active`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get school-wide analytics
  getSchoolAnalytics: async (schoolId: string, token: string) => {
    const response = await axios.get(
      `${API_URL}/engagement/school/${schoolId}/analytics`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  // Get teacher leaderboard
  getTeacherLeaderboard: async (schoolId: string, token: string) => {
    const response = await axios.get(
      `${API_URL}/engagement/school/${schoolId}/leaderboard`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
};
