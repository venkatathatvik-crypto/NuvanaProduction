import { apiClient } from '@/lib/apiClient';

// ==================== TYPES ====================
export interface Grade {
  id: number;
  name: string;
  school_id: string;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  school_id: string;
  grade_level_id: number;
  grade_levels?: {
    id: number;
    name: string;
  };
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  school_id: string;
  created_at: string;
}

export interface GradeSubject {
  id: string;
  grade_level_id: number;
  subject_master_id: string;
  school_id: string;
  subjects_master?: {
    id: string;
    name: string;
  };
  grade_levels?: {
    id: number;
    name: string;
  };
}

export interface TeacherClass {
  id: string;
  teacher_id: string;
  class_id: string;
  school_id: string;
  created_at: string;
  classes?: {
    id: string;
    name: string;
  };
  profiles?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  grade_subject_id: string;
  school_id: string;
  assigned_at: string;
  grade_subjects?: {
    id: string;
    subjects_master?: {
      name: string;
    };
    grade_levels?: {
      name: string;
    };
  };
}

export interface FileCategory {
  id: number;
  name: string;
  school_id: string;
  created_at: string;
}

export interface LifeCoachCategory {
  id: number;
  name: string;
  school_id: string;
  created_at: string;
}

export interface ExamType {
  id: number;
  name: string;
  type: 'Internal Assessment' | 'School Exam';
  school_id: string;
  created_at: string;
}

export interface TimetablePeriod {
  id: string;
  timetable_day_id: string;
  period_number: number;
  subject_id: string;
  teacher_id: string;
  start_time: string;
  end_time: string;
  room?: string;
  grade_subjects?: {
    id: string;
    subjects_master?: {
      name: string;
    };
  };
  profiles?: {
    id: string;
    name: string;
  };
}

export interface TimetableDay {
  id: string;
  class_id: string;
  day_of_week: number;
  school_id: string;
  timetable_periods: TimetablePeriod[];
}

export interface WeeklyTimetable {
  [day: number]: TimetableDay;
}

// ==================== ACADEMIC SERVICE ====================
export const academicService = {
  // ==================== GRADE LEVELS ====================
  async createGrade(name: string): Promise<Grade> {
    return apiClient.post('/academic/grades', { name });
  },

  async getGrades(): Promise<Grade[]> {
    return apiClient.get('/academic/grades');
  },

  async updateGrade(id: number, name: string): Promise<Grade> {
    return apiClient.patch(`/academic/grades/${id}`, { name });
  },

  async deleteGrade(id: number): Promise<{ message: string }> {
    return apiClient.delete(`/academic/grades/${id}`);
  },

  // ==================== CLASSES ====================
  async createClass(name: string, gradeLevelId: number): Promise<Class> {
    return apiClient.post('/academic/classes', {
      name,
      grade_level_id: gradeLevelId,
    });
  },

  async getClasses(): Promise<Class[]> {
    return apiClient.get('/academic/classes');
  },

  async updateClass(
    id: string,
    data: { name?: string; grade_level_id?: number }
  ): Promise<Class> {
    return apiClient.patch(`/academic/classes/${id}`, data);
  },

  async deleteClass(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/academic/classes/${id}`);
  },

  // ==================== MASTER SUBJECTS ====================
  async createSubject(name: string): Promise<Subject> {
    return apiClient.post('/academic/subjects', { name });
  },

  async getSubjects(): Promise<Subject[]> {
    return apiClient.get('/academic/subjects');
  },

  async deleteSubject(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/academic/subjects/${id}`);
  },

  // ==================== GRADE SUBJECTS ====================
  async assignSubjectsToGrade(
    gradeLevelId: number,
    subjectMasterIds: string[]
  ): Promise<{ message: string; count: number }> {
    return apiClient.post('/academic/grade-subjects', {
      grade_level_id: gradeLevelId,
      subject_master_ids: subjectMasterIds,
    });
  },

  async getGradeSubjects(): Promise<GradeSubject[]> {
    return apiClient.get('/academic/grade-subjects');
  },

  async getSubjectsByGrade(gradeId: number): Promise<GradeSubject[]> {
    return apiClient.get(`/academic/grade-subjects/grade/${gradeId}`);
  },

  async deleteGradeSubject(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/academic/grade-subjects/${id}`);
  },

  // ==================== TEACHER-CLASS ASSIGNMENTS ====================
  async assignTeacherToClass(
    teacherId: string,
    classId: string
  ): Promise<TeacherClass> {
    return apiClient.post('/academic/teacher-classes', {
      teacher_id: teacherId,
      class_id: classId,
    });
  },

  async getTeacherClasses(): Promise<TeacherClass[]> {
    return apiClient.get('/academic/teacher-classes');
  },

  async getClassesByTeacher(teacherId: string): Promise<TeacherClass[]> {
    return apiClient.get(`/academic/teacher-classes/teacher/${teacherId}`);
  },

  async getAllTeachingClassesByTeacher(teacherId: string): Promise<any[]> {
    return apiClient.get(`/academic/teacher-classes/teacher/${teacherId}/all`);
  },

  async deleteTeacherClass(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/academic/teacher-classes/${id}`);
  },

  // ==================== TEACHER-SUBJECT ASSIGNMENTS ====================
  async assignSubjectsToTeacher(
    teacherId: string,
    gradeSubjectIds: string[]
  ): Promise<{ message: string; count: number }> {
    return apiClient.post('/academic/teacher-subjects', {
      teacher_id: teacherId,
      grade_subject_ids: gradeSubjectIds,
    });
  },

  async getTeacherSubjects(): Promise<TeacherSubject[]> {
    return apiClient.get('/academic/teacher-subjects');
  },

  async getSubjectsByTeacher(teacherId: string): Promise<TeacherSubject[]> {
    return apiClient.get(`/academic/teacher-subjects/teacher/${teacherId}`);
  },

  async getAllSubjectsByTeacher(teacherId: string): Promise<any[]> {
    return apiClient.get(`/academic/teacher-subjects/teacher/${teacherId}/all`);
  },

  async deleteTeacherSubject(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/academic/teacher-subjects/${id}`);
  },

  // ==================== FILE CATEGORIES ====================
  async createFileCategory(name: string): Promise<FileCategory> {
    return apiClient.post('/academic/file-categories', { name });
  },

  async getFileCategories(): Promise<FileCategory[]> {
    return apiClient.get('/academic/file-categories');
  },

  async updateFileCategory(id: number, name: string): Promise<FileCategory> {
    return apiClient.patch(`/academic/file-categories/${id}`, { name });
  },

  async deleteFileCategory(id: number): Promise<{ message: string }> {
    return apiClient.delete(`/academic/file-categories/${id}`);
  },

  // ==================== LIFE COACH CATEGORIES ====================
  async createLifeCoachCategory(name: string): Promise<LifeCoachCategory> {
    return apiClient.post('/academic/life-coach-categories', { name });
  },
  async getLifeCoachCategories(): Promise<LifeCoachCategory[]> {
    return apiClient.get('/academic/life-coach-categories');
  },
  async updateLifeCoachCategory(id: number, name: string): Promise<LifeCoachCategory> {
    return apiClient.patch(`/academic/life-coach-categories/${id}`, { name });
  },
  async deleteLifeCoachCategory(id: number): Promise<{ message: string }> {
    return apiClient.delete(`/academic/life-coach-categories/${id}`);
  },

  // ==================== EXAM TYPES ====================
  async createExamType(
    name: string,
    type: 'Internal Assessment' | 'School Exam'
  ): Promise<ExamType> {
    return apiClient.post('/academic/exam-types', { name, type });
  },

  async getExamTypes(): Promise<ExamType[]> {
    return apiClient.get('/academic/exam-types');
  },

  async updateExamType(
    id: number,
    data: { name?: string; type?: 'Internal Assessment' | 'School Exam' }
  ): Promise<ExamType> {
    return apiClient.patch(`/academic/exam-types/${id}`, data);
  },

  async deleteExamType(id: number): Promise<{ message: string }> {
    return apiClient.delete(`/academic/exam-types/${id}`);
  },

  // ==================== TIMETABLE ====================
  async getWeeklyTimetable(classId: string): Promise<WeeklyTimetable> {
    return apiClient.get(`/academic/timetable/class/${classId}`);
  },

  async createOrUpdatePeriod(data: {
    class_id: string;
    day_of_week: number;
    period_number: number;
    subject_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    room?: string;
  }): Promise<TimetablePeriod> {
    return apiClient.post('/academic/timetable/periods', data);
  },

  async updatePeriod(
    id: string,
    data: {
      period_number?: number;
      subject_id?: string;
      teacher_id?: string;
      start_time?: string;
      end_time?: string;
      room?: string;
    }
  ): Promise<TimetablePeriod> {
    return apiClient.patch(`/academic/timetable/periods/${id}`, data);
  },

  async deletePeriod(id: string): Promise<{ message: string }> {
    return apiClient.delete(`/academic/timetable/periods/${id}`);
  },
};
