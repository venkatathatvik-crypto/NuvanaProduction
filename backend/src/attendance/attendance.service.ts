import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MarkAttendanceDto,
  StudentAttendanceResponseDto,
  AttendanceMapResponseDto,
  AttendancePercentageResponseDto,
} from './dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async getStudentsByClass(
    classId: string,
    schoolId: string,
  ): Promise<StudentAttendanceResponseDto[]> {
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4, // Student role
      },
      include: {
        student_details: {
          select: {
            roll_number: true,
          },
        },
      },
    });

    // Sort by roll_number manually to handle null values
    const sortedStudents = students.sort((a, b) => {
      const rollA = a.student_details?.roll_number || '';
      const rollB = b.student_details?.roll_number || '';
      if (rollA && rollB) {
        // Compare as numbers if both are numeric, otherwise as strings
        const numA = parseInt(rollA, 10);
        const numB = parseInt(rollB, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return rollA.localeCompare(rollB);
      }
      if (rollA) return -1;
      if (rollB) return 1;
      return 0;
    });

    const result = sortedStudents.map((student) => ({
      id: student.id,
      name: student.name || 'Unknown Student',
      roll_number: student.student_details?.roll_number || '',
      present: false,
    }));

    console.log(`[Attendance Service] Returning ${result.length} students with roll numbers:`, 
      result.map(s => ({ name: s.name, roll_number: s.roll_number }))
    );

    return result;
  }

  async getAttendanceForDate(
    classId: string,
    attendanceDate: string,
    schoolId: string,
  ): Promise<AttendanceMapResponseDto> {
    // First get all students in the class
    const students = await this.prisma.profiles.findMany({
      where: {
        student_details: {
          class_id: classId,
        },
        school_id: schoolId,
        role_id: 4,
      },
      select: {
        id: true,
      },
    });

    const studentIds = students.map((s) => s.id);

    // Get attendance records for these students on the specified date
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        student_id: { in: studentIds },
        attendance_date: new Date(attendanceDate),
        school_id: schoolId,
      },
    });

    // Create a map of student_id to present/absent
    const attendanceMap: AttendanceMapResponseDto = {};
    attendanceRecords.forEach((record) => {
      attendanceMap[record.student_id] = record.status === 'present';
    });

    return attendanceMap;
  }

  async markAttendance(
    dto: MarkAttendanceDto,
    schoolId: string,
  ): Promise<{ message: string; presentCount: number; totalCount: number }> {
    const studentIds = dto.students.map((s) => s.id);
    const attendanceDate = new Date(dto.attendanceDate);

    // Delete existing attendance records for this date and students
    await this.prisma.attendance.deleteMany({
      where: {
        student_id: { in: studentIds },
        attendance_date: attendanceDate,
        school_id: schoolId,
      },
    });

    // Create new attendance records
    const attendanceRecords = dto.students.map((student) => ({
      student_id: student.id,
      attendance_date: attendanceDate,
      status: student.present ? 'present' : 'absent',
      taken_by: dto.teacherId,
      school_id: schoolId,
      recorded_at: new Date(),
    }));

    await this.prisma.attendance.createMany({
      data: attendanceRecords as any,
    });

    const presentCount = dto.students.filter((s) => s.present).length;

    return {
      message: 'Attendance marked successfully',
      presentCount,
      totalCount: dto.students.length,
    };
  }

  async getStudentAttendancePercentage(
    studentId: string,
    schoolId: string,
  ): Promise<AttendancePercentageResponseDto> {
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        student_id: studentId,
        school_id: schoolId,
      },
    });

    if (attendanceRecords.length === 0) {
      return {
        percentage: 0,
        totalDays: 0,
        presentDays: 0,
      };
    }

    const presentDays = attendanceRecords.filter(
      (record) => record.status === 'present',
    ).length;
    const totalDays = attendanceRecords.length;
    const percentage = (presentDays / totalDays) * 100;

    return {
      percentage: Math.round(percentage * 10) / 10,
      totalDays,
      presentDays,
    };
  }

  async getStudentPendingTestsCount(
    studentId: string,
    schoolId: string,
  ): Promise<number> {
    // Get student's class
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        school_id: schoolId,
        role_id: 4,
      },
      include: {
        student_details: true,
      },
    });

    if (!student || !student.student_details?.class_id) {
      return 0;
    }

    // Get published tests for the class
    const tests = await this.prisma.tests.findMany({
      where: {
        class_id: student.student_details.class_id,
        school_id: schoolId,
        is_published: true,
        exam_types: {
          type: { not: 'Internal_Assessment' as any },
        },
      },
    });

    // Get submitted test IDs
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
      },
      select: {
        test_id: true,
      },
    });

    const submittedTestIds = new Set(submissions.map((s) => s.test_id));
    return tests.filter((t) => !submittedTestIds.has(t.id)).length;
  }

  async getStudentPendingAssessmentsCount(
    studentId: string,
    schoolId: string,
  ): Promise<number> {
    // Get student's class
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        school_id: schoolId,
        role_id: 4,
      },
      include: {
        student_details: true,
      },
    });

    if (!student || !student.student_details?.class_id) {
      return 0;
    }

    // Get published internal assessments for the class
    const tests = await this.prisma.tests.findMany({
      where: {
        class_id: student.student_details.class_id,
        school_id: schoolId,
        is_published: true,
        exam_types: {
          type: 'Internal_Assessment' as any,
        },
      },
    });

    // Get submitted test IDs
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
      },
      select: {
        test_id: true,
      },
    });

    const submittedTestIds = new Set(submissions.map((s) => s.test_id));
    return tests.filter((t) => !submittedTestIds.has(t.id)).length;
  }

  async getStudentAverageMarksPercentage(
    studentId: string,
    schoolId: string,
  ): Promise<number> {
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
        is_graded: true,
        tests: {
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (submissions.length === 0) {
      return 0;
    }

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;

    submissions.forEach((submission) => {
      const testMaxMarks = submission.tests.questions.reduce(
        (sum, q) => sum + (q.marks || 0),
        0,
      );
      totalMaxMarks += testMaxMarks;
      totalMarksObtained += submission.total_marks_obtained || 0;
    });

    if (totalMaxMarks === 0) {
      return 0;
    }

    const percentage = (totalMarksObtained / totalMaxMarks) * 100;
    return Math.round(percentage * 10) / 10;
  }

  async getStudentAttendanceBySubject(studentId: string, schoolId: string) {
    // Get student's class and grade level
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        role_id: 4,
        school_id: schoolId,
      },
      include: {
        student_details: {
          include: {
            classes: {
              select: {
                grade_level_id: true,
              },
            },
          },
        },
      },
    });

    if (!student || !student.student_details?.classes) {
      return [];
    }

    const gradeLevel = student.student_details.classes.grade_level_id;

    // Get all subjects for this grade level
    const gradeSubjects = await this.prisma.grade_subjects.findMany({
      where: {
        grade_level_id: gradeLevel,
        school_id: schoolId,
      },
      include: {
        subjects_master: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!gradeSubjects || gradeSubjects.length === 0) {
      return [];
    }

    // Fetch all attendance records for this student
    const attendanceData = await this.prisma.attendance.findMany({
      where: {
        student_id: studentId,
        school_id: schoolId,
      },
      select: {
        attendance_date: true,
        status: true,
      },
      orderBy: {
        attendance_date: 'desc',
      },
    });

    // Process each subject with attendance data
    const subjectAttendance = gradeSubjects.map((gs) => {
      const subjectName = gs.subjects_master.name || 'Unknown Subject';

      const totalRecords = attendanceData.length;
      const presentRecords = attendanceData.filter(
        (a) => a.status === 'present',
      ).length;

      const percentage =
        totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

      // Get recent 5 classes
      const recentClasses = attendanceData.slice(0, 5).map((record) => ({
        date: record.attendance_date.toISOString().split('T')[0],
        status: record.status === 'present' ? ('present' as const) : ('absent' as const),
      }));

      // Determine trend (compare first 50% vs last 50%)
      const midpoint = Math.floor(attendanceData.length / 2);
      const firstHalf = attendanceData
        .slice(0, midpoint)
        .filter((a) => a.status === 'present').length;
      const secondHalf = attendanceData
        .slice(midpoint)
        .filter((a) => a.status === 'present').length;

      const firstHalfPercentage =
        midpoint > 0 ? (firstHalf / midpoint) * 100 : 0;
      const secondHalfPercentage =
        attendanceData.length - midpoint > 0
          ? (secondHalf / (attendanceData.length - midpoint)) * 100
          : 0;

      const trend: 'up' | 'down' =
        secondHalfPercentage >= firstHalfPercentage ? 'up' : 'down';

      return {
        subject: subjectName,
        present: presentRecords,
        total: totalRecords,
        percentage: Math.round(percentage * 10) / 10,
        trend,
        recentClasses,
      };
    });

    return subjectAttendance;
  }
}
