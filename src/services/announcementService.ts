// Announcement services for teachers and students
import { supabase, NamedClass } from "./types";

export interface TeacherAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: string;
  classes: { class_id: string; class_name: string }[];
  views?: number;
}

export interface StudentAnnouncement {
  id: string;
  title: string;
  message: string;
  isUrgent: boolean;
  createdAt: string;
  class_name: string;
}

export interface CreateAnnouncementParams {
  title: string;
  message: string;
  isUrgent: boolean;
  classIds: string[];
  teacherId: string;
  schoolId: string;
}

interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  is_urgent: boolean;
  created_at: string;
  announcement_classes: {
    class_id: string;
    classes: NamedClass | NamedClass[] | null;
  }[];
}

interface AnnouncementInsertResult {
  id: string;
}

const mapAnnouncementRecord = (
  record: AnnouncementRow
): TeacherAnnouncement => {
  const classes =
    record.announcement_classes?.map((item) => {
      const classData = Array.isArray(item.classes)
        ? item.classes[0]
        : item.classes;
      return {
        class_id: item.class_id,
        class_name: classData?.name ?? "Unknown Class",
      };
    }) ?? [];

  return {
    id: record.id,
    title: record.title,
    message: record.message,
    isUrgent: record.is_urgent,
    createdAt: record.created_at,
    classes,
    views: 0,
  };
};

export const getTeacherAnnouncements = async (
  teacherId: string,
  schoolId: string
): Promise<TeacherAnnouncement[]> => {
  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      id,
      title,
      message,
      is_urgent,
      created_at,
      announcement_classes (
        class_id,
        classes (
          id,
          name
        )
      )
    `
    )
    .eq("teacher_id", teacherId)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Failed to load announcements.");
  }

  if (!data) {
    return [];
  }

  return data.map((record) => mapAnnouncementRecord(record as AnnouncementRow));
};

export const createTeacherAnnouncement = async (
  params: CreateAnnouncementParams
): Promise<TeacherAnnouncement> => {
  const { title, message, isUrgent, classIds, teacherId, schoolId } = params;

  const { data: announcementData, error: announcementError } = await supabase
    .from("announcements")
    .insert({
      title,
      message,
      is_urgent: isUrgent,
      teacher_id: teacherId,
      school_id: schoolId,
    })
    .select("id, created_at")
    .single<AnnouncementInsertResult>();

  if (announcementError || !announcementData) {
    throw new Error("Failed to create announcement.");
  }

  if (classIds.length > 0) {
    const rows = classIds.map((classId) => ({
      announcement_id: announcementData.id,
      class_id: classId,
    }));

    const { error: classError } = await supabase
      .from("announcement_classes")
      .insert(rows);

    if (classError) {
      throw new Error("Failed to link announcement classes.");
    }
  }

  // Fetch full record for mapping
  const { data, error } = await supabase
    .from("announcements")
    .select(
      `
      id,
      title,
      message,
      is_urgent,
      created_at,
      announcement_classes (
        class_id,
        classes (
          id,
          name
        )
      )
    `
    )
    .eq("id", announcementData.id)
    .single<AnnouncementRow>();

  if (error || !data) {
    throw new Error("Failed to load new announcement.");
  }

  return mapAnnouncementRecord(data);
};

export const deleteTeacherAnnouncement = async (
  announcementId: string,
  classId: string
): Promise<void> => {
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId);

  if (error) {
    throw new Error("Failed to delete announcement.");
  }
};

// Get announcements filtered by class_id for students
export const getStudentAnnouncements = async (
  classId: string
): Promise<StudentAnnouncement[]> => {
  const { data, error } = await supabase
    .from("announcement_classes")
    .select(
      `
      announcement_id,
      announcements (
        id,
        title,
        message,
        is_urgent,
        created_at
      ),
      classes (
        id,
        name
      )
    `
    )
    .eq("class_id", classId);

  if (error) {
    throw new Error("Failed to load announcements.");
  }

  if (!data) {
    return [];
  }

  return data
    .filter((item: any) => item.announcements)
    .map((item: any) => {
      const announcement = Array.isArray(item.announcements)
        ? item.announcements[0]
        : item.announcements;
      const classData = Array.isArray(item.classes)
        ? item.classes[0]
        : item.classes;

      return {
        id: announcement.id,
        title: announcement.title,
        message: announcement.message,
        isUrgent: announcement.is_urgent,
        createdAt: announcement.created_at,
        class_name: classData?.name ?? "Unknown Class",
      };
    });
};
