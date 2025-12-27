import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    // Create a map of student_id to status
    const attendanceMap: Record<string, string> = {};
    attendanceRecords.forEach((record) => {
      attendanceMap[record.student_id] = record.status;
    });

    return attendanceMap;
  }

  async markAttendance(
    dto: MarkAttendanceDto,
    schoolId: string,
  ): Promise<{ message: string; presentCount: number; totalCount: number }> {
    const studentIds = dto.students.map((s) => s.id);
    const attendanceDate = new Date(dto.attendanceDate);

    // Validate that the date is not a Sunday (0)
    if (attendanceDate.getDay() === 0) {
      throw new BadRequestException('Attendance cannot be marked for Sundays');
    }

    // Delete existing attendance records for this date and students
    // NOTE: period_id logic is prepared but commented out as per user request to avoid DB issues
    await this.prisma.attendance.deleteMany({
      where: {
        student_id: { in: studentIds },
        attendance_date: attendanceDate,
        school_id: schoolId,
        // ...(dto.periodId && { period_id: dto.periodId }),
      },
    });

    // Create new attendance records
    const attendanceRecords = dto.students.map((student) => {
      let status: any = 'absent';
      
      if (student.status) {
        status = student.status;
      } else if (student.present !== undefined) {
        status = student.present ? 'present' : 'absent';
      }

      const record: any = {
        student_id: student.id,
        attendance_date: attendanceDate,
        status,
        taken_by: dto.teacherId,
        school_id: schoolId,
        recorded_at: new Date(),
      };

      // if (dto.periodId) record.period_id = dto.periodId;

      return record;
    });

    await this.prisma.attendance.createMany({
      data: attendanceRecords,
    });

    const presentCount = dto.students.filter((s) => 
      s.status === 'present' || s.status === 'late' || s.present
    ).length;

    return {
      message: 'Attendance marked successfully',
      presentCount,
      totalCount: dto.students.length,
    };
  }

  async markBulkAttendance(
    dto: any,
    schoolId: string,
  ): Promise<{ 
    message: string; 
    totalRecordsCreated: number; 
    datesUpdated: number;
    studentsAffected: number;
  }> {
    const studentIds = dto.students.map((s: any) => s.id);
    const attendanceDates = dto.attendanceDates.map(
      (dateStr: string) => {
        const date = new Date(dateStr);
        if (date.getDay() === 0) {
          throw new BadRequestException(`Attendance cannot be marked for Sunday: ${dateStr}`);
        }
        return date;
      }
    );

    // Delete existing attendance records for all date-student combinations
    await this.prisma.attendance.deleteMany({
      where: {
        student_id: { in: studentIds },
        attendance_date: { in: attendanceDates },
        school_id: schoolId,
      },
    });

    // Create new attendance records for each date
    const allRecords: any[] = [];
    attendanceDates.forEach((date) => {
      dto.students.forEach((student: any) => {
        allRecords.push({
          student_id: student.id,
          attendance_date: date,
          status: student.status || (student.present ? 'present' : 'absent'),
          taken_by: dto.teacherId,
          school_id: schoolId,
          recorded_at: new Date(),
        });
      });
    });

    await this.prisma.attendance.createMany({
      data: allRecords,
    });

    return {
      message: 'Bulk attendance marked successfully',
      totalRecordsCreated: allRecords.length,
      datesUpdated: attendanceDates.length,
      studentsAffected: studentIds.length,
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
    // Get student's class
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
                id: true,
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

    const classId = student.student_details.classes.id;

    // Get timetable for this class to find which subjects are actually taught
    const timetableDays = await this.prisma.timetable_days.findMany({
      where: {
        class_id: classId,
        school_id: schoolId,
      },
      include: {
        timetable_periods: {
          include: {
            grade_subjects: {
              include: {
                subjects_master: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Extract unique subjects from timetable
    const subjectMap = new Map<
      string,
      { subjectId: string; subjectName: string; dayOfWeek: number }
    >();

    timetableDays.forEach((day) => {
      day.timetable_periods.forEach((period) => {
        const subjectId = period.subject_id;
        const subjectName =
          period.grade_subjects?.subjects_master?.name || 'Unknown Subject';
        if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subjectId,
            subjectName,
            dayOfWeek: day.day_of_week,
          });
        }
      });
    });

    if (subjectMap.size === 0) {
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

    // Create a map of attendance by date for quick lookup
    const attendanceByDate = new Map<string, boolean>();
    attendanceData.forEach((record) => {
      const dateKey = record.attendance_date.toISOString().split('T')[0];
      attendanceByDate.set(dateKey, record.status === 'present');
    });

    // Process each subject from timetable
    const subjectAttendance = Array.from(subjectMap.values()).map((subject) => {
      const subjectName = subject.subjectName;

      // Find all days this subject has classes (from timetable)
      const daysWithSubject = timetableDays
        .filter((day) =>
          day.timetable_periods.some((p) => p.subject_id === subject.subjectId),
        )
        .map((day) => day.day_of_week);

      // Calculate attendance for this subject
      // Count total days with this subject (based on attendance records that fall on those days of week)
      let totalDaysWithSubject = 0;
      let presentDaysForSubject = 0;

      attendanceData.forEach((record) => {
        const recordDate = new Date(record.attendance_date);
        const dayOfWeek = recordDate.getDay(); // 0=Sunday, 1=Monday, etc.
        // Convert to our format: 1=Monday, 2=Tuesday, etc.
        const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

        // Check if this day of week has classes for this subject
        if (daysWithSubject.includes(normalizedDayOfWeek)) {
          totalDaysWithSubject++;
          if (record.status === 'present') {
            presentDaysForSubject++;
          }
        }
      });

      const percentage =
        totalDaysWithSubject > 0
          ? (presentDaysForSubject / totalDaysWithSubject) * 100
          : 0;

      // Get recent 5 attendance records for days when this subject had classes
      const recentClassesForSubject = attendanceData
        .filter((record) => {
          const recordDate = new Date(record.attendance_date);
          const dayOfWeek = recordDate.getDay();
          const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
          return daysWithSubject.includes(normalizedDayOfWeek);
        })
        .slice(0, 5)
        .map((record) => ({
          date: record.attendance_date.toISOString().split('T')[0],
          status: record.status === 'present' ? ('present' as const) : ('absent' as const),
        }));

      // Determine trend (compare first 50% vs last 50% of subject-specific records)
      const subjectRecords = attendanceData.filter((record) => {
        const recordDate = new Date(record.attendance_date);
        const dayOfWeek = recordDate.getDay();
        const normalizedDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
        return daysWithSubject.includes(normalizedDayOfWeek);
      });

      const midpoint = Math.floor(subjectRecords.length / 2);
      const firstHalf = subjectRecords
        .slice(0, midpoint)
        .filter((a) => a.status === 'present').length;
      const secondHalf = subjectRecords
        .slice(midpoint)
        .filter((a) => a.status === 'present').length;

      const firstHalfPercentage =
        midpoint > 0 ? (firstHalf / midpoint) * 100 : 0;
      const secondHalfPercentage =
        subjectRecords.length - midpoint > 0
          ? (secondHalf / (subjectRecords.length - midpoint)) * 100
          : 0;

      const trend: 'up' | 'down' =
        secondHalfPercentage >= firstHalfPercentage ? 'up' : 'down';

      return {
        subject: subjectName,
        present: presentDaysForSubject,
        total: totalDaysWithSubject,
        percentage: Math.round(percentage * 10) / 10,
        trend,
        recentClasses: recentClassesForSubject,
      };
    });

    // Sort by subject name for consistent display
    subjectAttendance.sort((a, b) => a.subject.localeCompare(b.subject));

    return subjectAttendance;
  }

  async getStudentMonthlyAttendance(
    studentId: string,
    schoolId: string,
    year: number,
    month: number,
  ) {
    // Verify student exists
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        school_id: schoolId,
        role_id: 4,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all attendance records for this student in the specified month
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        student_id: studentId,
        school_id: schoolId,
        attendance_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        attendance_date: true,
        status: true,
      },
      orderBy: {
        attendance_date: 'asc',
      },
    });

    // Create a map of date to status
    const attendanceMap = new Map<string, 'present' | 'absent'>();
    attendanceRecords.forEach((record) => {
      const dateKey = record.attendance_date.toISOString().split('T')[0];
      attendanceMap.set(dateKey, record.status === 'present' ? 'present' : 'absent');
    });

    // Check if this is the current month
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    const todayDate = today.getDate();
    const tomorrowDate = todayDate + 1;
    
    // Generate data for all days in the month
    const daysInMonth = endDate.getDate();
    const monthlyData = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek];
      
      // Check if it's a Sunday
      const isSunday = dayOfWeek === 0;
      
      // For current month: show up to today, and include tomorrow
      if (isCurrentMonth) {
        if (day > tomorrowDate) {
          continue; // Skip future days beyond tomorrow
        }
      } else {
        // For older months: skip Sundays only
        if (isSunday) {
          continue;
        }
      }
      
      const status = attendanceMap.get(dateKey);
      
      monthlyData.push({
        date: dateKey,
        day: day,
        dayName: dayName,
        status: status || null, // null means no attendance record
        isWeekend: dayOfWeek === 0, // Only Sunday is "weekend" for exclusion logic
        isSaturday: dayOfWeek === 6,
        present: status === 'present' ? 1 : 0,
        absent: status === 'absent' ? 1 : 0,
      });
    }

    // Calculate monthly summary
    const presentDays = attendanceRecords.filter((r) => r.status === 'present').length;
    const absentDays = attendanceRecords.filter((r) => r.status === 'absent').length;
    const totalDays = presentDays + absentDays;
    const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      year,
      month,
      monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }),
      dailyData: monthlyData,
      summary: {
        presentDays,
        absentDays,
        totalDays,
        percentage: Math.round(percentage * 10) / 10,
      },
    };
  }

  async getStudentMonthlyAttendanceSummary(
    studentId: string,
    schoolId: string,
  ) {
    // Verify student exists
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        school_id: schoolId,
        role_id: 4,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get all attendance records
    const attendanceRecords = await this.prisma.attendance.findMany({
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

    // Group by month
    const monthlyMap = new Map<string, { present: number; absent: number }>();

    attendanceRecords.forEach((record) => {
      const date = new Date(record.attendance_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { present: 0, absent: 0 });
      }

      const monthData = monthlyMap.get(monthKey)!;
      if (record.status === 'present') {
        monthData.present++;
      } else {
        monthData.absent++;
      }
    });

    // Convert to array and format
    const monthlySummary = Array.from(monthlyMap.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-').map(Number);
        const total = data.present + data.absent;
        const percentage = total > 0 ? (data.present / total) * 100 : 0;

        return {
          year,
          month,
          monthKey,
          monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
          present: data.present,
          absent: data.absent,
          total,
          percentage: Math.round(percentage * 10) / 10,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    return monthlySummary;
  }
}
