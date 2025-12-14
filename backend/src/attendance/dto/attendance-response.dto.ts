export class StudentAttendanceResponseDto {
  id: string;
  name: string;
  roll_number: string;
  present: boolean;
}

export class AttendanceRecordResponseDto {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string;
  taken_by: string;
  recorded_at: Date;
}

export class AttendanceMapResponseDto {
  [studentId: string]: boolean;
}

export class AttendancePercentageResponseDto {
  percentage: number;
  totalDays: number;
  presentDays: number;
}
