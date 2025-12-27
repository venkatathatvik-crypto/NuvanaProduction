export class StudentAttendanceResponseDto {
  id: string;
  name: string;
  roll_number: string;
  present: boolean;
  status?: string;
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
  [studentId: string]: boolean | string;
}

export class AttendancePercentageResponseDto {
  percentage: number;
  totalDays: number;
  presentDays: number;
}
