// Attendance services for teachers and students
import { supabase } from "./types";

export interface StudentAttendance {
  id: string;
  name: string;
  roll_number: string;
  present: boolean;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string;
  taken_by: string;
  recorded_at: string;
}

// Get students by class_id for attendance marking
export const getStudentsByClass = async (
  classId: string
): Promise<StudentAttendance[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, roll_number")
    .eq("class_id", classId)
    .eq("role_id", 4)
    .order("roll_number", { ascending: true });

  if (error) {
    throw new Error("Failed to load students for attendance.");
  }

  if (!data) {
    return [];
  }

  return data.map((student: any) => ({
    id: student.id,
    name: student.name || "Unknown Student",
    roll_number: student.roll_number || "",
    present: false,
  }));
};

// Fetch existing attendance records for a specific date and class
export const getAttendanceForDate = async (
  classId: string,
  attendanceDate: string
): Promise<Record<string, boolean>> => {
  const { data, error } = await supabase
    .from("attendance")
    .select("student_id, status")
    .eq("attendance_date", attendanceDate);

  if (error) {
    return {};
  }

  if (!data) {
    return {};
  }

  const attendanceMap: Record<string, boolean> = {};
  for (const record of data) {
    attendanceMap[record.student_id] = record.status === "present";
  }

  return attendanceMap;
};

// Save attendance records for a date
export const saveAttendance = async (
  classId: string,
  attendanceDate: string,
  students: StudentAttendance[],
  teacherId: string,
  schoolId: string
): Promise<void> => {
  const studentIds = students.map((s) => s.id);
  const { error: deleteError } = await supabase
    .from("attendance")
    .delete()
    .eq("attendance_date", attendanceDate)
    .in("student_id", studentIds);

  if (deleteError) {
    throw new Error("Failed to save attendance.");
  }

  const attendanceRecords = students.map((student) => ({
    student_id: student.id,
    attendance_date: attendanceDate,
    status: student.present ? "present" : "absent",
    taken_by: teacherId,
    school_id: schoolId,
    recorded_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("attendance")
    .insert(attendanceRecords);

  if (insertError) {
    throw new Error("Failed to save attendance records.");
  }
};

// Get overall student attendance percentage
export const getOverallAttendancePercentage = async (
  studentId: string
): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("status")
      .eq("student_id", studentId);

    if (error || !data || data.length === 0) {
      return 0;
    }

    const presentCount = data.filter((a) => a.status === "present").length;
    const percentage = (presentCount / data.length) * 100;

    return Number.isNaN(percentage) ? 0 : percentage;
  } catch {
    return 0;
  }
};

// Get count of pending tests for a student (published tests not yet attempted)
export const getStudentPendingTestsCount = async (
  studentId: string
): Promise<number> => {
  try {
    const { data: studentData, error: studentError } = await supabase
      .from("profiles")
      .select("class_id")
      .eq("id", studentId)
      .eq("role_id", 4)
      .single();

    if (studentError || !studentData) {
      return 0;
    }

    // Fetch tests with exam_types to filter by category
    const { data: testsData, error: testsError } = await supabase
      .from("tests")
      .select("id, exam_types(type)")
      .eq("class_id", studentData.class_id)
      .eq("is_published", true);

    if (testsError || !testsData || testsData.length === 0) {
      return 0;
    }

    // Filter for School Exam type only
    const schoolExamTests = testsData.filter((t: any) => 
      t.exam_types?.type !== 'Internal Assessment'
    );

    const { data: submissionsData } = await supabase
      .from("test_submissions")
      .select("test_id")
      .eq("student_id", studentId);

    const submittedTestIds = new Set((submissionsData || []).map(s => s.test_id));
    return schoolExamTests.filter(t => !submittedTestIds.has(t.id)).length;
  } catch {
    return 0;
  }
};

// Get count of pending Internal Assessments for a student
export const getStudentPendingAssessmentsCount = async (
  studentId: string
): Promise<number> => {
  try {
    const { data: studentData, error: studentError } = await supabase
      .from("profiles")
      .select("class_id")
      .eq("id", studentId)
      .eq("role_id", 4)
      .single();

    if (studentError || !studentData) {
      return 0;
    }

    // Fetch tests with exam_types to filter by category
    const { data: testsData, error: testsError } = await supabase
      .from("tests")
      .select("id, exam_types(type)")
      .eq("class_id", studentData.class_id)
      .eq("is_published", true);

    if (testsError || !testsData || testsData.length === 0) {
      return 0;
    }

    // Filter for Internal Assessment type only
    const internalAssessments = testsData.filter((t: any) => 
      t.exam_types?.type === 'Internal Assessment'
    );

    const { data: submissionsData } = await supabase
      .from("test_submissions")
      .select("test_id")
      .eq("student_id", studentId);

    const submittedTestIds = new Set((submissionsData || []).map(s => s.test_id));
    return internalAssessments.filter(t => !submittedTestIds.has(t.id)).length;
  } catch {
    return 0;
  }
};

// Get student's average marks percentage across all graded tests
export const getStudentAverageMarksPercentage = async (
  studentId: string
): Promise<number> => {
  try {
    const { data: submissionsData, error: submissionsError } = await supabase
      .from("test_submissions")
      .select(`
        id,
        total_marks_obtained,
        is_graded,
        tests (
          id
        )
      `)
      .eq("student_id", studentId)
      .eq("is_graded", true);

    if (submissionsError || !submissionsData || submissionsData.length === 0) {
      return 0;
    }

    let totalMarksObtained = 0;
    let totalMaxMarks = 0;

    for (const submission of submissionsData) {
      const test = submission.tests as any;
      if (!test) continue;

      const { data: questionsData } = await supabase
        .from("questions")
        .select("marks")
        .eq("test_id", test.id);

      if (questionsData) {
        const testMaxMarks = questionsData.reduce((sum, q) => sum + (q.marks || 0), 0);
        totalMaxMarks += testMaxMarks;
        totalMarksObtained += submission.total_marks_obtained || 0;
      }
    }

    if (totalMaxMarks === 0) {
      return 0;
    }

    const percentage = (totalMarksObtained / totalMaxMarks) * 100;
    return Number.isNaN(percentage) ? 0 : Math.round(percentage * 10) / 10;
  } catch {
    return 0;
  }
};
