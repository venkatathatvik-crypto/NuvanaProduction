import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Plus, Save, Trash2, Edit, Loader2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { academicService, type WeeklyTimetable } from "@/services/academicApiService";
import { userService } from "@/services/userService";
import { DAY_NAMES } from "@/services/timetableService";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { logger } from '@/lib/logger';
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTimetable() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTimetableClass, setSelectedTimetableClass] = useState<string>("");
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<number>(1);
  const [timetableData, setTimetableData] = useState<WeeklyTimetable>({});
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [periodForm, setPeriodForm] = useState<{
    id?: string;
    period_number: number;
    subject_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    room: string;
  }>({
    period_number: 1,
    subject_id: "",
    teacher_id: "",
    start_time: "09:00",
    end_time: "10:30",
    room: "",
  });
  const [isEditingPeriod, setIsEditingPeriod] = useState(false);
  const [addingPeriod, setAddingPeriod] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "quick" | "csv">("manual");
  const [quickAddPeriods, setQuickAddPeriods] = useState<Array<{
    period_number: number;
    subject_id: string;
    teacher_id: string;
    start_time: string;
    end_time: string;
    room: string;
  }>>([]);
  const [copyFromDay, setCopyFromDay] = useState<number>(0);
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);

  // Timetable CSV Import states
  const [isImportingTimetable, setIsImportingTimetable] = useState(false);
  const [timetableImportProgress, setTimetableImportProgress] = useState<{
    total: number;
    current: number;
    success: number;
    failed: number;
    errors: Array<{ row: number; class_name: string; error: string }>;
  } | null>(null);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['timetable-classes'],
    queryFn: () => academicService.getClasses(),
    enabled: !!profile?.school_id,
  });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['timetable-teachers'],
    queryFn: () => userService.getTeachers(),
    enabled: !!profile?.school_id,
  });

  const { data: gradeSubjects = [], isLoading: gradeSubjectsLoading } = useQuery({
    queryKey: ['timetable-gradeSubjects'],
    queryFn: () => academicService.getGradeSubjects(),
    enabled: !!profile?.school_id,
  });

  const loading = classesLoading || teachersLoading || gradeSubjectsLoading;

  const fetchTimetable = async (classId: string) => {
    if (!classId || !profile?.school_id) return;
    setTimetableLoading(true);
    try {
      const data = await academicService.getWeeklyTimetable(classId);
      setTimetableData(data);
    } catch (error) {
      logger.error("Error fetching timetable:", error);
      toast.error("Failed to load timetable");
    } finally {
      setTimetableLoading(false);
    }
  };

  const handleAddPeriod = async () => {
    if (!selectedTimetableClass || !profile?.school_id) {
      toast.error("Please select a class first");
      return;
    }
    if (!periodForm.subject_id || !periodForm.teacher_id) {
      toast.error("Please fill all required fields");
      return;
    }
    setAddingPeriod(true);
    try {
      await academicService.createOrUpdatePeriod({
        class_id: selectedTimetableClass,
        day_of_week: selectedTimetableDay,
        period_number: periodForm.period_number,
        subject_id: periodForm.subject_id,
        teacher_id: periodForm.teacher_id,
        start_time: periodForm.start_time,
        end_time: periodForm.end_time,
        room: periodForm.room,
      });
      toast.success(isEditingPeriod ? "Period updated" : "Period added");
      resetPeriodForm();
      fetchTimetable(selectedTimetableClass);
    } catch (error: any) {
      logger.error("Error saving period:", error);
      toast.error(error.message || "Failed to save period");
    } finally {
      setAddingPeriod(false);
    }
  };

  const handleEditPeriod = (period: any) => {
    setPeriodForm({
      id: period.id,
      period_number: period.period_number,
      subject_id: period.subject_id || period.grade_subject_id,
      teacher_id: period.teacher_id,
      start_time: period.start_time,
      end_time: period.end_time,
      room: period.room || "",
    });
    setIsEditingPeriod(true);
  };

  const handleDeletePeriod = (periodId: string) => {
    setPeriodToDelete(periodId);
    setShowDeleteDialog(true);
  };

  const confirmDeletePeriod = async () => {
    if (!periodToDelete) return;
    try {
      await academicService.deletePeriod(periodToDelete);
      toast.success("Period deleted");
      fetchTimetable(selectedTimetableClass);
    } catch (error: any) {
      logger.error("Error deleting period:", error);
      toast.error(error.message || "Failed to delete period");
    } finally {
      setShowDeleteDialog(false);
      setPeriodToDelete(null);
    }
  };

  const resetPeriodForm = () => {
    setPeriodForm({
      period_number: 1,
      subject_id: "",
      teacher_id: "",
      start_time: "09:00",
      end_time: "10:30",
      room: "",
    });
    setIsEditingPeriod(false);
  };

  // Initialize Quick Add periods with default time slots
  const initializeQuickAddPeriods = () => {
    const timeSlots = [
      { start: "09:00", end: "09:45" },
      { start: "09:50", end: "10:35" },
      { start: "10:40", end: "11:25" },
      { start: "11:45", end: "12:30" },
      { start: "13:15", end: "14:00" },
      { start: "14:05", end: "14:50" },
    ];
    
    setQuickAddPeriods(
      timeSlots.map((slot, index) => ({
        period_number: index + 1,
        subject_id: "",
        teacher_id: "",
        start_time: slot.start,
        end_time: slot.end,
        room: "",
      }))
    );
  };

  // Copy periods from another day
  const handleCopyFromDay = async () => {
    if (!copyFromDay || !selectedTimetableClass) return;
    
    const dayPeriods = timetableData[copyFromDay]?.timetable_periods || [];
    if (dayPeriods.length === 0) {
      toast.error("No periods found for the selected day");
      return;
    }

    const copiedPeriods = dayPeriods.map((period: any) => ({
      period_number: period.period_number,
      subject_id: period.subject_id || period.grade_subject_id,
      teacher_id: period.teacher_id,
      start_time: period.start_time,
      end_time: period.end_time,
      room: period.room || "",
    }));

    setQuickAddPeriods(copiedPeriods);
    toast.success(`Copied ${copiedPeriods.length} periods from ${DAY_NAMES[copyFromDay - 1]}`);
    setCopyFromDay(0);
  };

  // Save all quick add periods
  const handleSaveQuickAddPeriods = async () => {
    if (!selectedTimetableClass) {
      toast.error("Please select a class first");
      return;
    }

    const validPeriods = quickAddPeriods.filter(
      (p) => p.subject_id && p.teacher_id
    );

    if (validPeriods.length === 0) {
      toast.error("Please fill at least one period");
      return;
    }

    setSavingQuickAdd(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const period of validPeriods) {
        try {
          await academicService.createOrUpdatePeriod({
            class_id: selectedTimetableClass,
            day_of_week: selectedTimetableDay,
            period_number: period.period_number,
            subject_id: period.subject_id,
            teacher_id: period.teacher_id,
            start_time: period.start_time,
            end_time: period.end_time,
            room: period.room,
          });
          successCount++;
        } catch (error) {
          failCount++;
          logger.error(`Failed to save period ${period.period_number}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully saved ${successCount} period(s)`);
        initializeQuickAddPeriods();
        fetchTimetable(selectedTimetableClass);
      }
      if (failCount > 0) {
        toast.error(`Failed to save ${failCount} period(s)`);
      }
    } catch (error: any) {
      toast.error("Failed to save periods");
    } finally {
      setSavingQuickAdd(false);
    }
  };

  // Update a specific quick add period
  const updateQuickAddPeriod = (index: number, field: string, value: any) => {
    const updated = [...quickAddPeriods];
    updated[index] = { ...updated[index], [field]: value };
    setQuickAddPeriods(updated);
  };

  // Helper function to map day name to number
  const getDayOfWeekNumber = (dayInput: string): number | null => {
    const dayLower = dayInput.trim().toLowerCase();
    const dayMap: Record<string, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 7,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
      sun: 7,
    };
    
    if (dayMap[dayLower]) {
      return dayMap[dayLower];
    }
    
    const dayNum = parseInt(dayInput);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 7) {
      return dayNum;
    }
    
    return null;
  };

  // Helper function to find teacher by email or name
  const findTeacherId = (teacherInput: string): string | null => {
    const teacherLower = teacherInput.trim().toLowerCase();
    const teacher = teachers.find(
      (t) =>
        t.email?.toLowerCase() === teacherLower ||
        t.name?.toLowerCase() === teacherLower
    );
    return teacher?.id || null;
  };

  // Helper function to find class by name
  const findClassId = (className: string): string | null => {
    const classLower = className.trim().toLowerCase();
    const classItem = classes.find(
      (c) => c.name?.toLowerCase() === classLower
    );
    return classItem?.id || null;
  };

  // Helper function to get grade subject ID by class and subject name
  const getGradeSubjectIdBySubjectName = async (
    classId: string,
    subjectName: string
  ): Promise<string | null> => {
    try {
      const { apiClient } = await import("@/lib/apiClient");
      const result = await apiClient.get(
        `/academic/helper/grade-subject/${classId}/${encodeURIComponent(
          subjectName
        )}`
      );

      if (result && typeof result === "object" && result !== null && "id" in result) {
        const id = result.id;
        if (id === null || id === undefined) {
          return null;
        }
        return String(id);
      }

      if (typeof result === "string") {
        return result;
      }

      return null;
    } catch (error) {
      logger.error("Error getting grade subject ID:", error);
      return null;
    }
  };

  const handleTimetableCsvImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsImportingTimetable(true);
    setTimetableImportProgress(null);

    try {
      const text = await file.text();
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);

      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows");
        setIsImportingTimetable(false);
        return;
      }

      // Parse header
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const classNameIndex = header.findIndex(
        (h) => h === "class_name" || h === "class" || h === "classname"
      );
      const dayIndex = header.findIndex(
        (h) =>
          h === "day_of_week" ||
          h === "day" ||
          h === "dayofweek" ||
          h === "weekday"
      );
      const periodNumberIndex = header.findIndex(
        (h) =>
          h === "period_number" ||
          h === "period" ||
          h === "periodnumber" ||
          h === "period_num"
      );
      const subjectNameIndex = header.findIndex(
        (h) =>
          h === "subject_name" ||
          h === "subject" ||
          h === "subjectname"
      );
      const teacherIndex = header.findIndex(
        (h) =>
          h === "teacher_email" ||
          h === "teacher_name" ||
          h === "teacher" ||
          h === "teacheremail" ||
          h === "teachername"
      );
      const startTimeIndex = header.findIndex(
        (h) =>
          h === "start_time" ||
          h === "starttime" ||
          h === "start" ||
          h === "from"
      );
      const endTimeIndex = header.findIndex(
        (h) =>
          h === "end_time" ||
          h === "endtime" ||
          h === "end" ||
          h === "to"
      );
      const roomIndex = header.findIndex(
        (h) => h === "room" || h === "room_number" || h === "roomnumber"
      );

      // Validate required columns
      if (
        classNameIndex === -1 ||
        dayIndex === -1 ||
        periodNumberIndex === -1 ||
        subjectNameIndex === -1 ||
        teacherIndex === -1 ||
        startTimeIndex === -1 ||
        endTimeIndex === -1
      ) {
        toast.error(
          "CSV must have: class_name, day_of_week, period_number, subject_name, teacher_email/name, start_time, end_time"
        );
        setIsImportingTimetable(false);
        return;
      }

      // Parse data rows
      const periods = lines.slice(1).map((line, index) => {
        const values = line.split(",").map((v) => v.trim());
        return {
          row: index + 2,
          class_name: values[classNameIndex] || "",
          day_of_week: values[dayIndex] || "",
          period_number: values[periodNumberIndex] || "",
          subject_name: values[subjectNameIndex] || "",
          teacher: values[teacherIndex] || "",
          start_time: values[startTimeIndex] || "",
          end_time: values[endTimeIndex] || "",
          room: roomIndex !== -1 ? values[roomIndex] : "",
        };
      });

      // Filter out empty rows
      const validPeriods = periods.filter(
        (p) =>
          p.class_name &&
          p.day_of_week &&
          p.period_number &&
          p.subject_name &&
          p.teacher &&
          p.start_time &&
          p.end_time
      );

      if (validPeriods.length === 0) {
        toast.error("No valid timetable data found in CSV");
        setIsImportingTimetable(false);
        return;
      }

      // Initialize progress
      setTimetableImportProgress({
        total: validPeriods.length,
        current: 0,
        success: 0,
        failed: 0,
        errors: [],
      });

      let successCount = 0;
      let failedCount = 0;
      const errors: Array<{
        row: number;
        class_name: string;
        error: string;
      }> = [];

      // Process periods one by one
      for (let i = 0; i < validPeriods.length; i++) {
        const period = validPeriods[i];
        try {
          // Find class ID
          const classId = findClassId(period.class_name);
          if (!classId) {
            throw new Error(`Class "${period.class_name}" not found`);
          }

          // Convert day to number
          const dayOfWeek = getDayOfWeekNumber(period.day_of_week);
          if (!dayOfWeek) {
            throw new Error(
              `Invalid day_of_week: "${period.day_of_week}". Use 1-7 or day name (Monday, Tuesday, etc.)`
            );
          }

          // Parse period number
          const periodNumber = parseInt(period.period_number);
          if (isNaN(periodNumber) || periodNumber < 1) {
            throw new Error(`Invalid period_number: "${period.period_number}"`);
          }

          // Find teacher ID
          const teacherId = findTeacherId(period.teacher);
          if (!teacherId) {
            throw new Error(`Teacher "${period.teacher}" not found`);
          }

          // Get subject ID using helper endpoint
          const subjectId = await getGradeSubjectIdBySubjectName(
            classId,
            period.subject_name
          );
          if (!subjectId) {
            throw new Error(
              `Subject "${period.subject_name}" not found for this class`
            );
          }

          // Validate time format (HH:MM)
          const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(period.start_time)) {
            throw new Error(
              `Invalid start_time format: "${period.start_time}". Use HH:MM format`
            );
          }
          if (!timeRegex.test(period.end_time)) {
            throw new Error(
              `Invalid end_time format: "${period.end_time}". Use HH:MM format`
            );
          }

          // Create or update period
          await academicService.createOrUpdatePeriod({
            class_id: classId,
            day_of_week: dayOfWeek,
            period_number: periodNumber,
            subject_id: subjectId,
            teacher_id: teacherId,
            start_time: period.start_time,
            end_time: period.end_time,
            room: period.room || undefined,
          });

          successCount++;
        } catch (error: any) {
          failedCount++;
          errors.push({
            row: period.row,
            class_name: period.class_name,
            error: error.message || "Unknown error",
          });
        }

        // Update progress
        setTimetableImportProgress({
          total: validPeriods.length,
          current: i + 1,
          success: successCount,
          failed: failedCount,
          errors,
        });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Show final results
      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} timetable period(s)`
        );
        // Refresh timetable if a class is selected
        if (selectedTimetableClass) {
          fetchTimetable(selectedTimetableClass);
        }
        // Refresh data to update classes list
        queryClient.invalidateQueries({ queryKey: ['timetable-classes'] });
      }
      if (failedCount > 0) {
        toast.error(
          `Failed to import ${failedCount} period(s). Check details below.`
        );
      }
    } catch (error: any) {
      logger.error("Timetable CSV Import Error:", error);
      toast.error("Failed to process CSV file");
    } finally {
      setIsImportingTimetable(false);
    }
  };

  const selectedClassData = classes.find((c) => c.id === selectedTimetableClass);
  const filteredSubjectsForClass = selectedClassData
    ? gradeSubjects
        .filter((gs) => gs.grade_level_id === selectedClassData.grade_level_id)
        .map((gs) => ({ id: gs.id, name: gs.subjects_master?.name }))
        .filter((s) => s.name)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen p-3 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-sm rounded" />
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage Timetable</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage class timetables</p>
          </motion.div>
        </div>

        <Card className="glass-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> Class Timetable
            </h2>
            <div className="flex gap-2">
              <select
                className="bg-muted border border-border rounded-md h-10 px-3 text-sm flex-1 sm:flex-none"
                value={selectedTimetableClass}
                onChange={(e) => {
                  setSelectedTimetableClass(e.target.value);
                  if (e.target.value) fetchTimetable(e.target.value);
                }}
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as "manual" | "quick" | "csv");
            if (value === "quick" && quickAddPeriods.length === 0) {
              initializeQuickAddPeriods();
            }
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="quick">Quick Add</TabsTrigger>
              <TabsTrigger value="csv">CSV Import</TabsTrigger>
            </TabsList>

            {/* Manual Tab */}
            <TabsContent value="manual" className="space-y-6 mt-6">
              {!selectedTimetableClass ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a class to manage its timetable</p>
                </div>
              ) : timetableLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex gap-2 flex-wrap">
                    {DAY_NAMES.map((day, index) => (
                      <Button
                        key={day}
                        variant={selectedTimetableDay === index + 1 ? "default" : "outline"}
                        onClick={() => setSelectedTimetableDay(index + 1)}
                        size="sm"
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">{DAY_NAMES[selectedTimetableDay - 1]} Schedule</h3>
                      {timetableData[selectedTimetableDay]?.timetable_periods?.length > 0 ? (
                        <div className="space-y-2">
                          {timetableData[selectedTimetableDay]?.timetable_periods.map((period: any) => (
                            <div key={period.id} className="p-4 rounded-lg bg-secondary/20 border border-border/50 flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">P{period.period_number}</Badge>
                                  <span className="font-medium">{period.subject_name || "Unknown"}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {period.start_time?.slice(0, 5)} - {period.end_time?.slice(0, 5)} | {period.teacher_name || "TBA"} | {period.room || "-"}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEditPeriod(period)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDeletePeriod(period.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                          <p>No periods added for {DAY_NAMES[selectedTimetableDay - 1]}</p>
                          <p className="text-sm">Use the form to add periods</p>
                        </div>
                      )}
                    </div>

                    <Card className="glass-card p-4">
                      <h3 className="font-semibold mb-4">{isEditingPeriod ? "Edit Period" : "Add Period"}</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm text-muted-foreground">Period #</label>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={periodForm.period_number}
                              onChange={(e) => setPeriodForm({ ...periodForm, period_number: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">Room</label>
                            <Input placeholder="e.g. Lab 1" value={periodForm.room} onChange={(e) => setPeriodForm({ ...periodForm, room: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Subject *</label>
                          <select className="w-full bg-muted border border-border rounded-md h-10 px-3" value={periodForm.subject_id} onChange={(e) => setPeriodForm({ ...periodForm, subject_id: e.target.value })}>
                            <option value="">Select Subject</option>
                            {filteredSubjectsForClass.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground">Teacher *</label>
                          <select className="w-full bg-muted border border-border rounded-md h-10 px-3" value={periodForm.teacher_id} onChange={(e) => setPeriodForm({ ...periodForm, teacher_id: e.target.value })}>
                            <option value="">Select Teacher</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-sm text-muted-foreground">Start Time</label>
                            <Input type="time" value={periodForm.start_time} onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-sm text-muted-foreground">End Time</label>
                            <Input type="time" value={periodForm.end_time} onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button className="flex-1" onClick={handleAddPeriod} disabled={addingPeriod}>
                            {addingPeriod ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {isEditingPeriod ? "Updating..." : "Adding..."}
                              </>
                            ) : (
                              <>
                                {isEditingPeriod ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                {isEditingPeriod ? "Update Period" : "Add Period"}
                              </>
                            )}
                          </Button>
                          {isEditingPeriod && (
                            <Button variant="outline" onClick={resetPeriodForm}>
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Quick Add Tab */}
            <TabsContent value="quick" className="space-y-6 mt-6">
              {!selectedTimetableClass ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a class to manage its timetable</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {DAY_NAMES.map((day, index) => (
                        <Button
                          key={day}
                          variant={selectedTimetableDay === index + 1 ? "default" : "outline"}
                          onClick={() => setSelectedTimetableDay(index + 1)}
                          size="sm"
                        >
                          {day.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <select
                        className="bg-muted border border-border rounded-md h-9 px-3 text-sm"
                        value={copyFromDay}
                        onChange={(e) => setCopyFromDay(parseInt(e.target.value))}
                      >
                        <option value="0">Copy from...</option>
                        {DAY_NAMES.map((day, index) => (
                          index + 1 !== selectedTimetableDay && (
                            <option key={day} value={index + 1}>
                              {day}
                            </option>
                          )
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyFromDay}
                        disabled={!copyFromDay}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>

                  <Card className="glass-card p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">Quick Add Periods for {DAY_NAMES[selectedTimetableDay - 1]}</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={initializeQuickAddPeriods}
                      >
                        Reset
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {quickAddPeriods.map((period, index) => (
                        <div key={index} className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/10 border border-border/50">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="w-16 justify-center shrink-0">P{period.period_number}</Badge>
                            <div className="flex gap-1 items-center text-xs flex-1">
                              <Input
                                type="time"
                                value={period.start_time}
                                onChange={(e) => updateQuickAddPeriod(index, "start_time", e.target.value)}
                                className="h-9 text-xs"
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="time"
                                value={period.end_time}
                                onChange={(e) => updateQuickAddPeriod(index, "end_time", e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              className="w-full bg-muted border border-border rounded-md h-9 px-2 text-sm"
                              value={period.subject_id}
                              onChange={(e) => updateQuickAddPeriod(index, "subject_id", e.target.value)}
                            >
                              <option value="">Select Subject</option>
                              {filteredSubjectsForClass.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <select
                              className="w-full bg-muted border border-border rounded-md h-9 px-2 text-sm"
                              value={period.teacher_id}
                              onChange={(e) => updateQuickAddPeriod(index, "teacher_id", e.target.value)}
                            >
                              <option value="">Select Teacher</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <Input
                              placeholder="Room (e.g. Lab 1)"
                              value={period.room}
                              onChange={(e) => updateQuickAddPeriod(index, "room", e.target.value)}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-6">
                      <Button
                        className="flex-1"
                        onClick={handleSaveQuickAddPeriods}
                        disabled={savingQuickAdd}
                      >
                        {savingQuickAdd ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save All Periods
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={initializeQuickAddPeriods}
                      >
                        Clear All
                      </Button>
                    </div>
                  </Card>

                  {/* Show existing periods */}
                  {timetableData[selectedTimetableDay]?.timetable_periods?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">Existing Periods</h3>
                      <div className="space-y-2">
                        {timetableData[selectedTimetableDay]?.timetable_periods.map((period: any) => (
                          <div key={period.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50 flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">P{period.period_number}</Badge>
                                <span className="font-medium text-sm">{period.subject_name || "Unknown"}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {period.start_time?.slice(0, 5)} - {period.end_time?.slice(0, 5)} | {period.teacher_name || "TBA"}
                              </p>
                            </div>
                            <Button size="sm" variant="destructive" onClick={() => handleDeletePeriod(period.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* CSV Import Tab */}
            <TabsContent value="csv" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" /> Import Timetable from CSV
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    CSV Format: class_name, day_of_week (1-7 or Monday-Sunday), period_number, subject_name, teacher_email (or teacher_name), start_time (HH:MM), end_time (HH:MM), room (optional)
                  </p>
                  <label className="block">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-secondary/20 transition">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {isImportingTimetable ? "Importing..." : "Upload CSV File"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to upload or drag and drop
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleTimetableCsvImport}
                      disabled={isImportingTimetable}
                      className="hidden"
                    />
                  </label>
                </div>

                {isImportingTimetable && timetableImportProgress && (
                  <div className="space-y-2 p-4 bg-secondary/10 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Progress:</span>
                      <span>
                        {timetableImportProgress.current} / {timetableImportProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(timetableImportProgress.current / timetableImportProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Success: {timetableImportProgress.success}</span>
                      <span>Failed: {timetableImportProgress.failed}</span>
                    </div>
                    {timetableImportProgress.errors.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        <p className="text-xs font-medium text-destructive mb-1">Errors:</p>
                        {timetableImportProgress.errors.map((error, idx) => (
                          <p key={idx} className="text-xs text-destructive">
                            Row {error.row} ({error.class_name}): {error.error}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!selectedTimetableClass ? (
                <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a class to view its timetable</p>
                </div>
              ) : timetableLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex gap-2 flex-wrap">
                    {DAY_NAMES.map((day, index) => (
                      <Button
                        key={day}
                        variant={selectedTimetableDay === index + 1 ? "default" : "outline"}
                        onClick={() => setSelectedTimetableDay(index + 1)}
                        size="sm"
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">{DAY_NAMES[selectedTimetableDay - 1]} Schedule</h3>
                    {timetableData[selectedTimetableDay]?.timetable_periods?.length > 0 ? (
                      <div className="space-y-2">
                        {timetableData[selectedTimetableDay]?.timetable_periods.map((period: any) => (
                          <div key={period.id} className="p-4 rounded-lg bg-secondary/20 border border-border/50 flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">P{period.period_number}</Badge>
                                <span className="font-medium">{period.subject_name || "Unknown"}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {period.start_time?.slice(0, 5)} - {period.end_time?.slice(0, 5)} | {period.teacher_name || "TBA"} | {period.room || "-"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                setActiveTab("manual");
                                handleEditPeriod(period);
                              }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeletePeriod(period.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        <p>No periods added for {DAY_NAMES[selectedTimetableDay - 1]}</p>
                        <p className="text-sm">Import CSV or use Manual Entry tab to add periods</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Delete Period Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeletePeriod}
        title="Delete Period?"
        description="Are you sure you want to delete this period? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}

