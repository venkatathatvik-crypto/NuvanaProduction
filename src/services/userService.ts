import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================
export interface User {
  id: string;
  school_id: string;
  email: string;
  role_id: number;
  name: string;
  avatar_url?: string;
  is_verified: boolean;
  is_first_login: boolean;
  created_at: string;
  user_roles: {
    id: number;
    role: string;
  };
  student_details?: {
    profile_id: string;
    class_id?: string;
    roll_number?: string;
    classes?: {
      id: string;
      name: string;
    };
  };
  teacher_details?: {
    profile_id: string;
    subject?: string;
    qualifications?: string;
  };
}

export interface CreateUserDto {
  email: string;
  name: string;
  role_id: number;
  school_id?: string;
  temporaryPassword: string;
}

export interface UpdateUserDto {
  name?: string;
  avatar_url?: string;
  class_id?: string;
}

// ==================== USER SERVICE ====================
export const userService = {
  // Get all users with optional role filtering
  async getUsers(roleId?: number): Promise<User[]> {
    const params = roleId ? `?role_id=${roleId}` : '';
    return apiClient.get(`/users${params}`);
  },

  // Get teachers (role_id = 3)
  async getTeachers(): Promise<User[]> {
    return this.getUsers(3);
  },

  // Get students (role_id = 4)
  async getStudents(): Promise<User[]> {
    return this.getUsers(4);
  },

  // Get single user
  async getUser(id: string): Promise<User> {
    return apiClient.get(`/users/${id}`);
  },

  // Create user
  async createUser(data: CreateUserDto): Promise<User> {
    return apiClient.post('/auth/register', data);
  },

  // Update user profile
  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    return apiClient.patch(`/users/${id}`, data);
  },

  // Update student details (including class assignment)
  async updateStudentDetails(studentId: string, data: { class_id?: string; roll_number?: string }): Promise<any> {
    return apiClient.post(`/users/${studentId}/student-details`, data);
  },

  // Assign student to class (uses student-details endpoint)
  async assignStudentToClass(studentId: string, classId: string): Promise<any> {
    return this.updateStudentDetails(studentId, { class_id: classId });
  },

  // Delete user
  async deleteUser(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/users/${id}`);
  },
};
