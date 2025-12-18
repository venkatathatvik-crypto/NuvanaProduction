import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateGradeDto,
  UpdateGradeDto,
  CreateClassDto,
  UpdateClassDto,
  CreateSubjectDto,
  AssignSubjectsToGradeDto,
  AssignTeacherToClassDto,
  AssignSubjectsToTeacherDto,
  CreateFileCategoryDto,
  UpdateFileCategoryDto,
  CreateExamTypeDto,
  UpdateExamTypeDto,
  CreatePeriodDto,
  UpdatePeriodDto,
} from "./dto";

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  // ==================== GRADE LEVELS ====================
  async createGrade(dto: CreateGradeDto, schoolId: string) {
    return this.prisma.grade_levels.create({
      data: {
        name: dto.name,
        school_id: schoolId,
      },
    });
  }

  async getGrades(schoolId: string) {
    return this.prisma.grade_levels.findMany({
      where: { school_id: schoolId },
      orderBy: { created_at: "desc" },
    });
  }

  async updateGrade(id: number, dto: UpdateGradeDto, schoolId: string) {
    // Verify grade belongs to school
    const grade = await this.prisma.grade_levels.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!grade) {
      throw new NotFoundException("Grade not found");
    }

    return this.prisma.grade_levels.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async deleteGrade(id: number, schoolId: string) {
    // Verify grade belongs to school
    const grade = await this.prisma.grade_levels.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!grade) {
      throw new NotFoundException("Grade not found");
    }

    await this.prisma.grade_levels.delete({ where: { id } });
    return { message: "Grade deleted successfully" };
  }

  // ==================== CLASSES ====================
  async createClass(dto: CreateClassDto, schoolId: string) {
    // Verify grade exists and belongs to school
    const grade = await this.prisma.grade_levels.findFirst({
      where: { id: dto.grade_level_id, school_id: schoolId },
    });

    if (!grade) {
      throw new NotFoundException("Grade not found");
    }

    return this.prisma.classes.create({
      data: {
        name: dto.name,
        grade_level_id: dto.grade_level_id,
        school_id: schoolId,
      },
      include: {
        grade_levels: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getClasses(schoolId: string) {
    return this.prisma.classes.findMany({
      where: { school_id: schoolId },
      include: {
        grade_levels: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async updateClass(id: string, dto: UpdateClassDto, schoolId: string) {
    // Verify class belongs to school
    const existingClass = await this.prisma.classes.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!existingClass) {
      throw new NotFoundException("Class not found");
    }

    // If updating grade_level_id, verify it exists
    if (dto.grade_level_id) {
      const grade = await this.prisma.grade_levels.findFirst({
        where: { id: dto.grade_level_id, school_id: schoolId },
      });

      if (!grade) {
        throw new NotFoundException("Grade not found");
      }
    }

    return this.prisma.classes.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.grade_level_id && { grade_level_id: dto.grade_level_id }),
      },
      include: {
        grade_levels: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteClass(id: string, schoolId: string) {
    // Verify class belongs to school
    const existingClass = await this.prisma.classes.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!existingClass) {
      throw new NotFoundException("Class not found");
    }

    await this.prisma.classes.delete({ where: { id } });
    return { message: "Class deleted successfully" };
  }

  // ==================== MASTER SUBJECTS ====================
  async createSubject(dto: CreateSubjectDto, schoolId: string) {
    // Check for duplicates
    const existing = await this.prisma.subjects_master.findFirst({
      where: { name: dto.name, school_id: schoolId },
    });

    if (existing) {
      throw new ConflictException("Subject with this name already exists");
    }

    return this.prisma.subjects_master.create({
      data: {
        name: dto.name,
        school_id: schoolId,
      },
    });
  }

  async getSubjects(schoolId: string) {
    return this.prisma.subjects_master.findMany({
      where: { school_id: schoolId },
      orderBy: { name: "asc" },
    });
  }

  async deleteSubject(id: string, schoolId: string) {
    // Verify subject belongs to school
    const subject = await this.prisma.subjects_master.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!subject) {
      throw new NotFoundException("Subject not found");
    }

    await this.prisma.subjects_master.delete({ where: { id } });
    return { message: "Subject deleted successfully" };
  }

  // ==================== GRADE SUBJECTS ====================
  async assignSubjectsToGrade(dto: AssignSubjectsToGradeDto, schoolId: string) {
    // Verify grade exists
    const grade = await this.prisma.grade_levels.findFirst({
      where: { id: dto.grade_level_id, school_id: schoolId },
    });

    if (!grade) {
      throw new NotFoundException("Grade not found");
    }

    // Get already assigned subjects
    const existing = await this.prisma.grade_subjects.findMany({
      where: {
        grade_level_id: dto.grade_level_id,
        school_id: schoolId,
      },
      select: { subject_master_id: true },
    });

    const existingIds = existing.map((e) => e.subject_master_id);
    const newSubjectIds = dto.subject_master_ids.filter(
      (id) => !existingIds.includes(id)
    );

    if (newSubjectIds.length === 0) {
      throw new ConflictException(
        "All subjects are already assigned to this grade"
      );
    }

    // Create all assignments
    const data = newSubjectIds.map((subjectId) => ({
      grade_level_id: dto.grade_level_id,
      subject_master_id: subjectId,
      school_id: schoolId,
    }));

    await this.prisma.grade_subjects.createMany({ data });

    return {
      message: `${newSubjectIds.length} subject(s) assigned to grade`,
      count: newSubjectIds.length,
    };
  }

  async getGradeSubjects(schoolId: string) {
    return this.prisma.grade_subjects.findMany({
      where: { school_id: schoolId },
      include: {
        subjects_master: {
          select: { id: true, name: true },
        },
        grade_levels: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getSubjectsByGrade(gradeId: number, schoolId: string) {
    return this.prisma.grade_subjects.findMany({
      where: {
        grade_level_id: gradeId,
        school_id: schoolId,
      },
      include: {
        subjects_master: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteGradeSubject(id: string, schoolId: string) {
    // Verify grade subject belongs to school
    const gradeSubject = await this.prisma.grade_subjects.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!gradeSubject) {
      throw new NotFoundException("Grade subject mapping not found");
    }

    await this.prisma.grade_subjects.delete({ where: { id } });
    return { message: "Subject removed from grade successfully" };
  }

  // ==================== TEACHER-CLASS ASSIGNMENTS ====================
  async assignTeacherToClass(dto: AssignTeacherToClassDto, schoolId: string) {
    // Verify teacher and class belong to school
    const [teacher, classExists] = await Promise.all([
      this.prisma.profiles.findFirst({
        where: { id: dto.teacher_id, school_id: schoolId, role_id: 3 }, // role_id 3 = teacher
      }),
      this.prisma.classes.findFirst({
        where: { id: dto.class_id, school_id: schoolId },
      }),
    ]);

    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    if (!classExists) {
      throw new NotFoundException("Class not found");
    }

    // Check for existing assignment
    const existing = await this.prisma.teacher_classes.findFirst({
      where: {
        teacher_id: dto.teacher_id,
        class_id: dto.class_id,
        school_id: schoolId,
      },
    });

    if (existing) {
      throw new ConflictException("Teacher is already assigned to this class");
    }

    return this.prisma.teacher_classes.create({
      data: {
        teacher_id: dto.teacher_id,
        class_id: dto.class_id,
        school_id: schoolId,
      },
      include: {
        classes: {
          select: { id: true, name: true },
        },
        profiles: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getTeacherClasses(schoolId: string) {
    return this.prisma.teacher_classes.findMany({
      where: { school_id: schoolId },
      include: {
        classes: {
          select: { id: true, name: true },
        },
        profiles: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getClassesByTeacher(teacherId: string, schoolId: string) {
    return this.prisma.teacher_classes.findMany({
      where: { teacher_id: teacherId, school_id: schoolId },
      include: {
        classes: {
          select: { 
            id: true, 
            name: true,
            grade_level_id: true,
            grade_levels: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async deleteTeacherClass(id: string, schoolId: string) {
    // Verify assignment belongs to school
    const assignment = await this.prisma.teacher_classes.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!assignment) {
      throw new NotFoundException("Teacher-class assignment not found");
    }

    await this.prisma.teacher_classes.delete({ where: { id } });
    return { message: "Teacher removed from class successfully" };
  }

  // ==================== TEACHER-SUBJECT ASSIGNMENTS ====================
  async assignSubjectsToTeacher(
    dto: AssignSubjectsToTeacherDto,
    schoolId: string
  ) {
    // Verify teacher exists
    const teacher = await this.prisma.profiles.findFirst({
      where: { id: dto.teacher_id, school_id: schoolId, role_id: 3 },
    });

    if (!teacher) {
      throw new NotFoundException("Teacher not found");
    }

    // Get already assigned subjects
    const existing = await this.prisma.teacher_subjects.findMany({
      where: {
        teacher_id: dto.teacher_id,
        school_id: schoolId,
      },
      select: { grade_subject_id: true },
    });

    const existingIds = existing.map((e) => e.grade_subject_id);
    const newSubjectIds = dto.grade_subject_ids.filter(
      (id) => !existingIds.includes(id)
    );

    if (newSubjectIds.length === 0) {
      throw new ConflictException(
        "All selected subjects are already assigned to this teacher"
      );
    }

    // Create all assignments
    const data = newSubjectIds.map((gradeSubjectId) => ({
      teacher_id: dto.teacher_id,
      grade_subject_id: gradeSubjectId,
      school_id: schoolId,
    }));

    await this.prisma.teacher_subjects.createMany({ data });

    return {
      message: `${newSubjectIds.length} subject(s) assigned to teacher`,
      count: newSubjectIds.length,
    };
  }

  async getTeacherSubjects(schoolId: string) {
    return this.prisma.teacher_subjects.findMany({
      where: { school_id: schoolId },
      include: {
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
            grade_levels: {
              select: { name: true },
            },
          },
        },
      },
    });
  }

  async getSubjectsByTeacher(teacherId: string, schoolId: string) {
    return this.prisma.teacher_subjects.findMany({
      where: { teacher_id: teacherId, school_id: schoolId },
      include: {
        grade_subjects: {
          include: {
            subjects_master: {
              select: { id: true, name: true },
            },
            grade_levels: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });
  }

  async deleteTeacherSubject(id: string, schoolId: string) {
    // Verify assignment belongs to school
    const assignment = await this.prisma.teacher_subjects.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!assignment) {
      throw new NotFoundException("Teacher-subject assignment not found");
    }

    await this.prisma.teacher_subjects.delete({ where: { id } });
    return { message: "Subject removed from teacher successfully" };
  }

  // ==================== FILE CATEGORIES ====================
  async createFileCategory(dto: CreateFileCategoryDto, schoolId: string) {
    return this.prisma.file_categories.create({
      data: {
        name: dto.name,
        school_id: schoolId,
      },
    });
  }

  async getFileCategories(schoolId: string) {
    return this.prisma.file_categories.findMany({
      where: { school_id: schoolId },
      orderBy: { name: "asc" },
    });
  }

  async updateFileCategory(
    id: number,
    dto: UpdateFileCategoryDto,
    schoolId: string
  ) {
    // Verify category belongs to school
    const category = await this.prisma.file_categories.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!category) {
      throw new NotFoundException("File category not found");
    }

    return this.prisma.file_categories.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async deleteFileCategory(id: number, schoolId: string) {
    // Verify category belongs to school
    const category = await this.prisma.file_categories.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!category) {
      throw new NotFoundException("File category not found");
    }

    await this.prisma.file_categories.delete({ where: { id } });
    return { message: "File category deleted successfully" };
  }

  // ==================== EXAM TYPES ====================
  async createExamType(dto: CreateExamTypeDto, schoolId: string) {
    return this.prisma.exam_types.create({
      data: {
        name: dto.name,
        type: dto.type as any, // Prisma enum
        school_id: schoolId,
      },
    });
  }

  async getExamTypes(schoolId: string) {
    return this.prisma.exam_types.findMany({
      where: { school_id: schoolId },
      orderBy: { name: "asc" },
    });
  }

  async updateExamType(id: number, dto: UpdateExamTypeDto, schoolId: string) {
    // Verify exam type belongs to school
    const examType = await this.prisma.exam_types.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!examType) {
      throw new NotFoundException("Exam type not found");
    }

    return this.prisma.exam_types.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type as any }),
      },
    });
  }

  async deleteExamType(id: number, schoolId: string) {
    // Verify exam type belongs to school
    const examType = await this.prisma.exam_types.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!examType) {
      throw new NotFoundException("Exam type not found");
    }

    await this.prisma.exam_types.delete({ where: { id } });
    return { message: "Exam type deleted successfully" };
  }

  // ==================== TIMETABLE ====================
  async getWeeklyTimetable(classId: string, schoolId: string) {
    // Verify class belongs to school
    const classExists = await this.prisma.classes.findFirst({
      where: { id: classId, school_id: schoolId },
    });

    if (!classExists) {
      throw new NotFoundException("Class not found");
    }

    const days = await this.prisma.timetable_days.findMany({
      where: { class_id: classId, school_id: schoolId },
      include: {
        timetable_periods: {
          include: {
            grade_subjects: {
              include: {
                subjects_master: {
                  select: { name: true },
                },
              },
            },
            profiles: {
              select: { id: true, name: true },
            },
          },
          orderBy: { period_number: "asc" },
        },
      },
      orderBy: { day_of_week: "asc" },
    });

    // Transform the data to flatten the structure for frontend consumption
    const weeklyTimetable: any = {};
    days.forEach((day) => {
      weeklyTimetable[day.day_of_week] = {
        ...day,
        timetable_periods: day.timetable_periods.map((period: any) => ({
          id: period.id,
          period_number: period.period_number,
          subject_id: period.subject_id,
          teacher_id: period.teacher_id,
          subject_name:
            period.grade_subjects?.subjects_master?.name || "Unknown",
          teacher_name: period.profiles?.name || "TBA",
          start_time: this.formatTimeToHHMM(period.start_time),
          end_time: this.formatTimeToHHMM(period.end_time),
          room: period.room,
          // Keep the full objects too in case frontend needs them
          grade_subjects: period.grade_subjects,
          profiles: period.profiles,
        })),
      };
    });

    return weeklyTimetable;
  }

  // Helper function to format Date to HH:MM format
  private formatTimeToHHMM(date: Date): string {
    if (!date) return "";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  // Helper function to convert HH:MM format to ISO-8601 DateTime
  private convertTimeToDateTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  async createOrUpdatePeriod(dto: CreatePeriodDto, schoolId: string) {
    // Verify class exists
    const classExists = await this.prisma.classes.findFirst({
      where: { id: dto.class_id, school_id: schoolId },
    });

    if (!classExists) {
      throw new NotFoundException("Class not found");
    }

    // Get or create timetable_day
    let day = await this.prisma.timetable_days.findFirst({
      where: {
        class_id: dto.class_id,
        day_of_week: dto.day_of_week,
        school_id: schoolId,
      },
    });

    if (!day) {
      day = await this.prisma.timetable_days.create({
        data: {
          class_id: dto.class_id,
          day_of_week: dto.day_of_week,
          school_id: schoolId,
        },
      });
    }

    // Convert time strings to DateTime
    const startTime = this.convertTimeToDateTime(dto.start_time);
    const endTime = this.convertTimeToDateTime(dto.end_time);

    // Check if period already exists for this day and period_number
    const existingPeriod = await this.prisma.timetable_periods.findFirst({
      where: {
        timetable_day_id: day.id,
        period_number: dto.period_number,
      },
    });

    if (existingPeriod) {
      // Update existing period
      return this.prisma.timetable_periods.update({
        where: { id: existingPeriod.id },
        data: {
          subject_id: dto.subject_id,
          teacher_id: dto.teacher_id,
          start_time: startTime,
          end_time: endTime,
          room: dto.room,
        },
        include: {
          grade_subjects: {
            include: {
              subjects_master: {
                select: { name: true },
              },
            },
          },
          profiles: {
            select: { id: true, name: true },
          },
        },
      });
    } else {
      // Create new period
      return this.prisma.timetable_periods.create({
        data: {
          timetable_day_id: day.id,
          period_number: dto.period_number,
          subject_id: dto.subject_id,
          teacher_id: dto.teacher_id,
          start_time: startTime,
          end_time: endTime,
          room: dto.room,
          school_id: schoolId,
        },
        include: {
          grade_subjects: {
            include: {
              subjects_master: {
                select: { name: true },
              },
            },
          },
          profiles: {
            select: { id: true, name: true },
          },
        },
      });
    }
  }

  async updatePeriod(id: string, dto: UpdatePeriodDto, schoolId: string) {
    // Verify period belongs to school
    const period = await this.prisma.timetable_periods.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!period) {
      throw new NotFoundException("Period not found");
    }

    const updateData: any = {
      ...(dto.period_number && { period_number: dto.period_number }),
      ...(dto.subject_id && { subject_id: dto.subject_id }),
      ...(dto.teacher_id && { teacher_id: dto.teacher_id }),
      ...(dto.start_time && {
        start_time: this.convertTimeToDateTime(dto.start_time),
      }),
      ...(dto.end_time && {
        end_time: this.convertTimeToDateTime(dto.end_time),
      }),
      ...(dto.room !== undefined && { room: dto.room }),
    };

    return this.prisma.timetable_periods.update({
      where: { id },
      data: updateData,
      include: {
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
        profiles: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deletePeriod(id: string, schoolId: string) {
    // Verify period belongs to school
    const period = await this.prisma.timetable_periods.findFirst({
      where: { id, school_id: schoolId },
    });

    if (!period) {
      throw new NotFoundException("Period not found");
    }

    await this.prisma.timetable_periods.delete({ where: { id } });
    return { message: "Period deleted successfully" };
  }

  // ==================== HELPER METHODS ====================
  
  async getGradeSubjectIdByDetails(
    classId: string,
    subjectName: string,
    schoolId: string,
  ): Promise<string | null> {
    // Trim and normalize subject name for matching
    console.log("subjectName", subjectName);
    console.log("classId", classId);
    console.log("schoolId", schoolId);
    const normalizedSubjectName = subjectName.trim();
    console.log("normalizedSubjectName", normalizedSubjectName);

    // First get the class to get grade_level_id
    const classData = await this.prisma.classes.findFirst({
      where: { id: classId, school_id: schoolId },
      select: { grade_level_id: true },
    });

    if (!classData) {
      console.error(`[getGradeSubjectIdByDetails] Class not found: classId=${classId}, schoolId=${schoolId}`);
      return null;
    }

    console.log("classData", classData);

    console.log("classData.grade_level_id", classData.grade_level_id);
    console.log("schoolId", schoolId);

    // Get all grade_subjects for this grade level and school
    // Then filter by case-insensitive subject name match
    const gradeSubjects = await this.prisma.grade_subjects.findMany({
      where: {
        grade_level_id: classData.grade_level_id,
        school_id: schoolId,
      },
      include: {
        subjects_master: {
          select: { name: true },
        },
      },
    });

    console.log("gradeSubjects", gradeSubjects);

    // Find matching subject (case-insensitive)
    const gradeSubject = gradeSubjects.find(
      (gs) => gs.subjects_master?.name?.trim().toLowerCase() === normalizedSubjectName.toLowerCase()
    );
    console.log("gradeSubject", gradeSubject);
    if (!gradeSubject) {
      console.error(
        `[getGradeSubjectIdByDetails] Subject not found: subjectName="${normalizedSubjectName}", ` +
        `classId=${classId}, gradeLevelId=${classData.grade_level_id}, schoolId=${schoolId}. ` +
        `Available subjects: ${gradeSubjects.map(gs => gs.subjects_master?.name).filter(Boolean).join(', ')}`
      );
      return null;
    }

    // Ensure we return just the ID string
    const gradeSubjectId = gradeSubject.id;
    console.log(`[getGradeSubjectIdByDetails] Returning gradeSubjectId: ${gradeSubjectId} (type: ${typeof gradeSubjectId})`);
    return gradeSubjectId;
  }

  async getExamTypeIdByName(
    examTypeName: string,
    schoolId: string,
  ): Promise<number | null> {
    // Trim and normalize exam type name for matching
    const normalizedExamTypeName = examTypeName.trim();

    // Get all exam types for this school and find case-insensitive match
    const examTypes = await this.prisma.exam_types.findMany({
      where: {
        school_id: schoolId,
      },
      select: { id: true, name: true },
    });

    // Find matching exam type (case-insensitive)
    const examType = examTypes.find(
      (et) => et.name?.trim().toLowerCase() === normalizedExamTypeName.toLowerCase()
    );

    if (!examType) {
      console.error(
        `[getExamTypeIdByName] Exam type not found: examTypeName="${normalizedExamTypeName}", ` +
        `schoolId=${schoolId}. Available types: ${examTypes.map(et => et.name).filter(Boolean).join(', ')}`
      );
      return null;
    }

    return examType.id;
  }
}
