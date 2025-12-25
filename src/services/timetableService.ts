import { academicService } from "@/services/academicApiService";
import { logger } from '@/lib/logger';

// Types
export interface TimetableDay {
  id: string;
  class_id: string;
  day_of_week: number; // 1=Monday, 2=Tuesday, ..., 6=Saturday
  school_id: string;
}

export interface TimetablePeriod {
  id: string;
  timetable_day_id: string;
  period_number: number;
  subject_id: string;
  teacher_id: string;
  start_time: string;
  end_time: string;
  room: string;
  school_id: string;
  // Joined data
  subject_name?: string;
  teacher_name?: string;
}

export interface TimetablePeriodWithDetails extends TimetablePeriod {
  subjects_master?: { name: string };
  profiles?: { name: string };
}

export interface DaySchedule {
  day: TimetableDay;
  periods: TimetablePeriodWithDetails[];
}

export interface WeeklyTimetable {
  [dayOfWeek: number]: DaySchedule | null;
}

// Day of week mapping
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Get the full weekly timetable for a class
 */
export const getTimetableForClass = async (
  classId: string,
  schoolId: string
): Promise<WeeklyTimetable> => {
  try {
    // Use backend API instead of Supabase
    const weeklyTimetableData = await academicService.getWeeklyTimetable(classId);

    logger.log("📅 Raw timetable data from API:", weeklyTimetableData);

    // Initialize empty week (days 1-7 for Mon-Sun)
    const weeklyTimetable: WeeklyTimetable = {};
    for (let i = 1; i <= 7; i++) {
      weeklyTimetable[i] = null;
    }

    // Transform API response to match expected format
    // Backend returns: { [day: number]: TimetableDay } where TimetableDay has timetable_periods
    Object.keys(weeklyTimetableData).forEach((dayOfWeekStr) => {
      const dayOfWeek = parseInt(dayOfWeekStr);
      const dayData = weeklyTimetableData[dayOfWeek];
      
      logger.log(`📆 Processing day ${dayOfWeek}:`, dayData);
      
      if (dayData) {
        const periods = Array.isArray(dayData.timetable_periods) ? dayData.timetable_periods : [];
        
        // Always add the day structure, even if it has no periods
        weeklyTimetable[dayOfWeek] = {
          day: {
            id: dayData.id,
            class_id: dayData.class_id,
            day_of_week: dayData.day_of_week,
            school_id: dayData.school_id,
          },
          periods: periods.map((period: any) => ({
            id: period.id,
            timetable_day_id: dayData.id,
            period_number: period.period_number,
            subject_id: period.subject_id,
            teacher_id: period.teacher_id,
            start_time: period.start_time,
            end_time: period.end_time,
            room: period.room || "",
            school_id: dayData.school_id,
            subject_name: period.subject_name,
            teacher_name: period.teacher_name,
          })),
        };
        logger.log(`✅ Added day ${dayOfWeek} with ${periods.length} periods`);
      } else {
        logger.log(`⚠️ Day ${dayOfWeek} data is missing or invalid:`, dayData);
      }
    });

    logger.log("📋 Final transformed timetable:", weeklyTimetable);
    return weeklyTimetable;
  } catch (error) {
    console.error("Error in getTimetableForClass:", error);
    return {};
  }
};

/**
 * Get or create a timetable day for a class
 * Note: This function is kept for backward compatibility but should use backend API
 * The backend API handles day creation automatically when creating periods
 */
export const getOrCreateTimetableDay = async (
  classId: string,
  dayOfWeek: number,
  schoolId: string
): Promise<TimetableDay | null> => {
  try {
    // Get the weekly timetable and check if the day exists
    const weeklyTimetable = await getTimetableForClass(classId, schoolId);
    const daySchedule = weeklyTimetable[dayOfWeek];
    
    if (daySchedule) {
      return daySchedule.day;
    }
    
    // Day doesn't exist - backend will create it when a period is added
    // Return a placeholder structure
    return {
      id: '', // Will be created by backend
      class_id: classId,
      day_of_week: dayOfWeek,
      school_id: schoolId,
    };
  } catch (error) {
    console.error("Error in getOrCreateTimetableDay:", error);
    return null;
  }
};

/**
 * Save (create or update) a timetable period
 * Uses backend API instead of Supabase
 */
export const saveTimetablePeriod = async (
  period: {
    id?: string;
    timetable_day_id: string;
    period_number: number;
    subject_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    room: string;
    school_id: string;
  }
): Promise<TimetablePeriod | null> => {
  try {
    // Extract class_id and day_of_week from timetable_day_id if needed
    // For now, we'll use the API which handles this
    if (period.id) {
      // Update existing period
      const updated = await academicService.updatePeriod(period.id, {
        period_number: period.period_number,
        subject_id: period.subject_id,
        teacher_id: period.teacher_id,
        start_time: period.start_time,
        end_time: period.end_time,
        room: period.room,
      });
      return updated as any;
    } else {
      // Create new period - need to get class_id and day_of_week
      // This is a limitation - we need these from the day
      // For now, return null and let the caller use academicService.createOrUpdatePeriod directly
      console.warn("saveTimetablePeriod: Use academicService.createOrUpdatePeriod for creating new periods");
      return null;
    }
  } catch (error) {
    console.error("Error in saveTimetablePeriod:", error);
    return null;
  }
};

/**
 * Delete a timetable period
 * Uses backend API instead of Supabase
 */
export const deleteTimetablePeriod = async (periodId: string): Promise<boolean> => {
  try {
    await academicService.deletePeriod(periodId);
    return true;
  } catch (error) {
    console.error("Error in deleteTimetablePeriod:", error);
    return false;
  }
};

/**
 * Get timetable for a student based on their class
 */
export const getStudentTimetable = async (
  classId: string,
  schoolId: string
): Promise<Record<string, Array<{
  time: string;
  subject: string;
  room: string;
  teacher: string;
  period_number: number;
}>>> => {
  try {
    const weeklyTimetable = await getTimetableForClass(classId, schoolId);

    const formattedTimetable: Record<string, Array<{
      time: string;
      subject: string;
      room: string;
      teacher: string;
      period_number: number;
    }>> = {};

    for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
      const dayName = DAY_NAMES[dayOfWeek - 1]; // Convert 1-based to 0-based for array
      const daySchedule = weeklyTimetable[dayOfWeek];

      if (!daySchedule || daySchedule.periods.length === 0) {
        formattedTimetable[dayName] = [];
        continue;
      }

      formattedTimetable[dayName] = daySchedule.periods.map((p) => ({
        time: `${formatTime(p.start_time)} - ${formatTime(p.end_time)}`,
        subject: p.subject_name || "Unknown Subject",
        room: p.room || "-",
        teacher: p.teacher_name || "TBA",
        period_number: p.period_number,
      }));
    }

    return formattedTimetable;
  } catch (error) {
    console.error("Error in getStudentTimetable:", error);
    return {};
  }
};

/**
 * Helper to format time from "HH:MM" or "HH:MM:SS" to "HH:MM AM/PM"
 */
const formatTime = (time: string): string => {
  if (!time) return "";
  // Handle both "HH:MM" and "HH:MM:SS" formats
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours, 10);
  if (isNaN(h)) return "";
  const m = minutes || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};
