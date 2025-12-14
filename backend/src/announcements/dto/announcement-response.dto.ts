export class AnnouncementResponseDto {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: Date;
  classes: {
    class_id: string;
    class_name: string;
  }[];
  views?: number;
}

export class StudentAnnouncementResponseDto {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: Date;
  class_name: string;
}
