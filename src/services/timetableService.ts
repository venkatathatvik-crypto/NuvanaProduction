import { supabase } from "@/supabase/client";

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
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Get the full weekly timetable for a class
 */
export const getTimetableForClass = async (
  classId: string,
  schoolId: string
): Promise<WeeklyTimetable> => {
  try {
    // Get all days for this class
    const { data: daysData, error: daysError } = await supabase
      .from("timetable_days")
      .select("*")
      .eq("class_id", classId)
      .eq("school_id", schoolId);

    if (daysError) throw daysError;

    // Initialize empty week (days 1-6 for Mon-Sat)
    const weeklyTimetable: WeeklyTimetable = {};
    for (let i = 1; i <= 6; i++) {
      weeklyTimetable[i] = null;
    }

    if (!daysData || daysData.length === 0) {
      return weeklyTimetable;
    }

    // Get all periods for these days
    // Note: subject_id references grade_subjects.id, so we need to join through grade_subjects
    const dayIds = daysData.map((d) => d.id);
    const { data: periodsData, error: periodsError } = await supabase
      .from("timetable_periods")
      .select(`
        *,
        grade_subjects:subject_id (
          id,
          subjects_master (name)
        ),
        profiles:teacher_id (name)
      `)
      .in("timetable_day_id", dayIds)
      .order("period_number", { ascending: true });

    if (periodsError) throw periodsError;

    // Organize by day
    for (const day of daysData) {
      const dayPeriods = (periodsData || [])
        .filter((p) => p.timetable_day_id === day.id)
        .map((p) => ({
          ...p,
          subject_name: p.grade_subjects?.subjects_master?.name,
          teacher_name: p.profiles?.name,
        }));

      weeklyTimetable[day.day_of_week] = {
        day,
        periods: dayPeriods,
      };
    }

    return weeklyTimetable;
  } catch (error) {
    console.error("Error in getTimetableForClass:", error);
    return {};
  }
};

/**
 * Get or create a timetable day for a class
 */
export const getOrCreateTimetableDay = async (
  classId: string,
  dayOfWeek: number,
  schoolId: string
): Promise<TimetableDay | null> => {
  try {
    // Check if day exists - use maybeSingle to avoid error when no row found
    const { data: existingDay, error: checkError } = await supabase
      .from("timetable_days")
      .select("*")
      .eq("class_id", classId)
      .eq("day_of_week", dayOfWeek)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing day:", checkError);
      throw checkError;
    }

    if (existingDay) {
      return existingDay;
    }

    // Create new day
    const { data: newDay, error: insertError } = await supabase
      .from("timetable_days")
      .insert({
        class_id: classId,
        day_of_week: dayOfWeek,
        school_id: schoolId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting new day:", insertError);
      throw insertError;
    }
    return newDay;
  } catch (error) {
    console.error("Error in getOrCreateTimetableDay:", error);
    return null;
  }
};

/**
 * Save (create or update) a timetable period
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
    if (period.id) {
      // Update existing
      const { data, error } = await supabase
        .from("timetable_periods")
        .update({
          period_number: period.period_number,
          subject_id: period.subject_id,
          teacher_id: period.teacher_id,
          start_time: period.start_time,
          end_time: period.end_time,
          room: period.room,
        })
        .eq("id", period.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from("timetable_periods")
        .insert({
          timetable_day_id: period.timetable_day_id,
          period_number: period.period_number,
          subject_id: period.subject_id,
          teacher_id: period.teacher_id,
          start_time: period.start_time,
          end_time: period.end_time,
          room: period.room,
          school_id: period.school_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error("Error in saveTimetablePeriod:", error);
    return null;
  }
};

/**
 * Delete a timetable period
 */
export const deleteTimetablePeriod = async (periodId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("timetable_periods")
      .delete()
      .eq("id", periodId);

    if (error) throw error;
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

    for (let dayOfWeek = 1; dayOfWeek <= 6; dayOfWeek++) {
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
 * Helper to format time from "HH:MM:SS" to "HH:MM AM/PM"
 */
const formatTime = (time: string): string => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};
