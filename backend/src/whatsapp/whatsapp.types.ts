export interface SchoolAnnouncementData {
  parentName: string;
  studentName: string;
  messageText: string;
  schoolName: string;
}

export type TemplateDataMap = {
  school_announcement: SchoolAnnouncementData;
  // Add other templates here as needed
};

export type UseCase = keyof TemplateDataMap;
