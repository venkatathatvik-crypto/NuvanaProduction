import { motion } from "framer-motion";
import { ArrowLeft, Users, Check, X, Calendar as CalendarIcon, Upload, FileText, Download, UserCheck, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getTeacherClasses,
  getStudentsByClass,
  getAttendanceForDate,
  saveAttendance,
  type StudentAttendance,
  createNotificationsForClass,
  getStudentIdsInClass,
  getStudentEmailsInClass,
  sendAttendanceEmail,
} from "@/services/academic";
import type { FlattenedClass } from "@/schemas/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/auth/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { attendanceApi } from "@/services/attendanceApiService";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClass, setSelectedClass] = useState<FlattenedClass | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

  // NEW: Bulk selection state
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // NEW: Multi-date state
  const [isMultiDateMode, setIsMultiDateMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Fetch teacher's classes using React Query
  const { data: classes = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.teacher.classes(profile?.id ?? '', profile?.school_id ?? ''),
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      const allClasses = await getTeacherClasses(profile.id, profile.school_id);
      
      if (!allClasses || allClasses.length === 0) {
        toast.info("No classes assigned to you.");
        return [];
      }

      return allClasses;
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set the first class as selected when classes are loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  // Load students when class is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([]);
        return;
      }

      setStudentsLoading(true);
      try {
        // Fetch students from the selected class
        const studentsData = await getStudentsByClass(selectedClass.class_id);
        console.log('[Teacher Attendance] Students data received:', studentsData);
        console.log('[Teacher Attendance] Sample student:', studentsData[0]);

        // Fetch existing attendance records for today
        const attendanceMap = await getAttendanceForDate(
          selectedClass.class_id,
          selectedDate
        );

        // Merge attendance data with students
        const mergedStudents = studentsData.map((student) => {
          const attendanceValue = attendanceMap[student.id];
          let status: 'present' | 'absent' | 'late' | 'excused' = 'absent';
          
          if (typeof attendanceValue === 'string') {
            status = attendanceValue as any;
          } else if (attendanceValue === true) {
            status = 'present';
          }
            
          return {
            ...student,
            status,
            present: status === 'present' || (status as string) === 'late',
          };
        });

        console.log('[Teacher Attendance] Merged students:', mergedStudents);
        setStudents(mergedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Failed to load students for selected class.");
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedDate]);

  const handleClassChange = (classId: string) => {
    const cls = classes.find((c) => c.class_id === classId);
    if (cls) {
      setSelectedClass(cls);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setStudents(
      students.map((student) =>
        student.id === studentId
          ? { ...student, present: !student.present, status: !student.present ? 'present' : 'absent' }
          : student
      )
    );
  };

  const updateAttendanceStatus = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudents(
      students.map((student) =>
        student.id === studentId
          ? { ...student, status, present: status === 'present' || status === 'late' }
          : student
      )
    );
  };

  const markAllPresent = () => {
    setStudents(students.map((student) => ({ ...student, present: true, status: 'present' })));
    toast.success("Marked all students present");
  };

  const markAllAbsent = () => {
    setStudents(students.map((student) => ({ ...student, present: false, status: 'absent' })));
    toast.success("Marked all students absent");
  };

  const parseCSV = (csvText: string): Array<{ roll_number: string; name: string; present: boolean }> => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error("CSV file must have at least a header row and one data row");
    }

    // Parse header row
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rollNumberIndex = header.findIndex(h => h === 'roll_number' || h === 'roll number' || h === 'roll');
    const nameIndex = header.findIndex(h => h === 'name' || h === 'student name' || h === 'student_name');
    const presentIndex = header.findIndex(h => 
      h === 'present' || h === 'status' || h === 'attendance' || h === 'attendance_status'
    );

    if (rollNumberIndex === -1) {
      throw new Error("CSV must have a 'roll_number' or 'roll number' column");
    }
    if (nameIndex === -1) {
      throw new Error("CSV must have a 'name' or 'student name' column");
    }
    if (presentIndex === -1) {
      throw new Error("CSV must have a 'present' or 'status' column");
    }

    // Parse data rows
    const results: Array<{ roll_number: string; name: string; present: boolean }> = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < Math.max(rollNumberIndex, nameIndex, presentIndex) + 1) {
        continue; // Skip incomplete rows
      }

      const rollNumber = values[rollNumberIndex];
      const name = values[nameIndex];
      const presentValue = values[presentIndex].toLowerCase().trim();

      // Parse present value - accept multiple formats
      let present = false;
      if (presentValue === 'true' || presentValue === 'yes' || presentValue === 'present' || presentValue === '1' || presentValue === 'p') {
        present = true;
      } else if (presentValue === 'false' || presentValue === 'no' || presentValue === 'absent' || presentValue === '0' || presentValue === 'a') {
        present = false;
      } else {
        throw new Error(`Invalid attendance value "${presentValue}" in row ${i + 1}. Use: true/false, yes/no, present/absent, 1/0, or p/a`);
      }

      if (rollNumber && name) {
        results.push({ roll_number: rollNumber, name, present });
      }
    }

    return results;
  };

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Please select a CSV file");
      return;
    }

    try {
      const text = await file.text();
      const csvData = parseCSV(text);

      if (csvData.length === 0) {
        toast.error("CSV file is empty or has no valid data rows");
        return;
      }

      // Match CSV data to students by roll_number
      let matchedCount = 0;
      let unmatchedCount = 0;
      const unmatchedRollNumbers: string[] = [];

      const updatedStudents = students.map(student => {
        const csvRow = csvData.find(row => 
          row.roll_number.toLowerCase().trim() === student.roll_number.toLowerCase().trim()
        );

        if (csvRow) {
          matchedCount++;
          return { ...student, present: csvRow.present };
        } else {
          unmatchedCount++;
          unmatchedRollNumbers.push(student.roll_number);
          return student;
        }
      });

      setStudents(updatedStudents);
      setCsvDialogOpen(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success(
        `CSV imported successfully! ${matchedCount} students matched, ${unmatchedCount} not found in CSV.`
      );

      if (unmatchedCount > 0) {
        toast.warning(
          `Some students were not found in CSV: ${unmatchedRollNumbers.slice(0, 5).join(', ')}${unmatchedRollNumbers.length > 5 ? '...' : ''}`
        );
      }
    } catch (error) {
      console.error("Error importing CSV:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to import CSV file";
      toast.error(errorMessage);
    }
  };

  const downloadCSVTemplate = () => {
    if (students.length === 0) {
      toast.error("No students available to generate template");
      return;
    }

    // Create CSV header
    const header = "roll_number,name,present\n";
    
    // Create CSV rows for all students
    const rows = students.map(student => 
      `${student.roll_number},${student.name},false`
    ).join('\n');

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_template_${selectedClass?.class_name || 'class'}_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV template downloaded!");
  };

  const submitAttendance = async () => {
    if (!selectedClass || !profile) {
      toast.error("Missing class or profile information");
      return;
    }

    // Validate that the selected date is not a Sunday
    const dateToCheck = new Date(selectedDate + 'T00:00:00');
    if (dateToCheck.getDay() === 0) {
      toast.error("Cannot mark attendance for Sundays. Please select a different date.");
      return;
    }

    setSubmitting(true);
    try {
      await saveAttendance(
        selectedClass.class_id,
        selectedDate,
        students,
        profile.id,
        profile.school_id
      );
      const presentCount = students.filter((s) => s.present).length;
      toast.success(
        `Attendance submitted! ${presentCount}/${students.length} students present`
      );

      // Send notifications to students
      try {
        const studentIds = await getStudentIdsInClass(selectedClass.class_id);
        await createNotificationsForClass(studentIds, {
          school_id: profile.school_id,
          title: "Attendance Posted",
          message: `Attendance for ${format(new Date(selectedDate), 'MMM dd, yyyy')} has been updated.`,
          notification_type: "attendance",
          target_url: "/student/attendance",
        });
      } catch (notifError) {
        console.error("Failed to send notifications:", notifError);
      }

      // Send email notifications
      try {
        const studentEmails = await getStudentEmailsInClass(selectedClass.class_id);
        await sendAttendanceEmail(
          studentEmails,
          format(new Date(selectedDate), 'MMM dd, yyyy'),
          selectedClass.class_name
        );
      } catch (emailError) {
        console.error("Failed to send emails:", emailError);
      }

      // Invalidate all attendance-related queries
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-percent'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-subject'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-monthly'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });
    } catch (error) {
      console.error("Error submitting attendance:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit attendance. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Bulk selection handlers
  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const selectAllStudents = () => {
    setSelectedStudents(new Set(students.map(s => s.id)));
    toast.success("All students selected");
  };

  const clearStudentSelection = () => {
    setSelectedStudents(new Set());
    toast.info("Selection cleared");
  };

  const markSelectedAsPresent = () => {
    if (selectedStudents.size === 0) {
      toast.warning("No students selected");
      return;
    }
    setStudents(students.map(student =>
      selectedStudents.has(student.id) ? { ...student, present: true, status: 'present' } : student
    ));
    toast.success(`Marked ${selectedStudents.size} students as present`);
  };

  const markSelectedAsAbsent = () => {
    if (selectedStudents.size === 0) {
      toast.warning("No students selected");
      return;
    }
    setStudents(students.map(student =>
      selectedStudents.has(student.id) ? { ...student, present: false, status: 'absent' } : student
    ));
    toast.success(`Marked ${selectedStudents.size} students as absent`);
  };

  // NEW: Multi-date handlers
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Validate that the selected date is not a Sunday
    if (date.getDay() === 0) {
      toast.error("Cannot select Sundays for attendance");
      return;
    }
    
    // Validate that the selected date is within the last 7 days and not in the future
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    if (date > today) {
      toast.error("Cannot select future dates");
      return;
    }

    if (date < oneWeekAgo) {
      toast.error("Cannot select dates older than 1 week");
      return;
    }

    if (isMultiDateMode) {
      const dateString = format(date, 'yyyy-MM-dd');
      const dateExists = selectedDates.some(d => 
        format(d, 'yyyy-MM-dd') === dateString
      );

      if (dateExists) {
        // Remove date
        setSelectedDates(selectedDates.filter(d => 
          format(d, 'yyyy-MM-dd') !== dateString
        ));
      } else {
        // Add date
        setSelectedDates([...selectedDates, date]);
      }
    } else {
      // Single date mode
      setSelectedDate(format(date, 'yyyy-MM-dd'));
    }
  };

  const removeDateFromSelection = (dateToRemove: Date) => {
    const removeStr = format(dateToRemove, 'yyyy-MM-dd');
    setSelectedDates(selectedDates.filter(d => 
      format(d, 'yyyy-MM-dd') !== removeStr
    ));
  };

  const submitBulkAttendance = async () => {
    if (!selectedClass || !profile) {
      toast.error("Missing class or profile information");
      return;
    }

    // Determine which students to include
    const studentsToSubmit = isSelectionMode && selectedStudents.size > 0
      ? students.filter(s => selectedStudents.has(s.id))
      : students;

    if (studentsToSubmit.length === 0) {
      toast.error("No students to submit");
      return;
    }

    // Determine which dates to use
    const datesToSubmit = isMultiDateMode && selectedDates.length > 0
      ? selectedDates.map(d => format(d, 'yyyy-MM-dd'))
      : [selectedDate];

    if (datesToSubmit.length === 0) {
      toast.error("No dates selected");
      return;
    }

    setBulkDialogOpen(false);
    setSubmitting(true);

    try {
      if (datesToSubmit.length === 1) {
        // Use regular endpoint for single date
        await saveAttendance(
          selectedClass.class_id,
          datesToSubmit[0],
          studentsToSubmit,
          profile.id,
          profile.school_id
        );
        const presentCount = studentsToSubmit.filter(s => s.present).length;
        toast.success(
          `Attendance submitted! ${presentCount}/${studentsToSubmit.length} students present`
        );
      } else {
        // Use bulk endpoint for multiple dates
        const result = await attendanceApi.markBulkAttendance(
          selectedClass.class_id,
          datesToSubmit,
          studentsToSubmit,
          profile.id
        );
        toast.success(
          `Bulk attendance submitted! ${result.totalRecordsCreated} records created across ${result.datesUpdated} dates`
        );
      }

      // Send notifications
      try {
        const studentIds = await getStudentIdsInClass(selectedClass.class_id);
        const dateText = datesToSubmit.length === 1 
          ? format(new Date(datesToSubmit[0]), 'MMM dd, yyyy')
          : `${datesToSubmit.length} dates`;
        await createNotificationsForClass(studentIds, {
          school_id: profile.school_id,
          title: "Attendance Posted",
          message: `Attendance for ${dateText} has been updated.`,
          notification_type: "attendance",
          target_url: "/student/attendance",
        });
      } catch (notifError) {
        console.error("Failed to send notifications:", notifError);
      }

      // Send emails
      try {
        const studentEmails = await getStudentEmailsInClass(selectedClass.class_id);
        const dateText = datesToSubmit.length === 1 
          ? format(new Date(datesToSubmit[0]), 'MMM dd, yyyy')
          : `${datesToSubmit.length} dates`;
        await sendAttendanceEmail(
          studentEmails,
          dateText,
          selectedClass.class_name
        );
      } catch (emailError) {
        console.error("Failed to send emails:", emailError);
      }

      // Invalidate all attendance-related queries
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-percent'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-subject'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-monthly'] });
      queryClient.invalidateQueries({ queryKey: ['student-attendance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['student-analytics'] });

      // Clear selections after successful submit
      if (isSelectionMode) {
        setSelectedStudents(new Set());
      }
      if (isMultiDateMode) {
        setSelectedDates([]);
      }
    } catch (error) {
      console.error("Error submitting bulk attendance:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit attendance. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };


  const presentCount = students.filter((s) => s.present).length;
  const attendancePercentage = ((presentCount / students.length) * 100).toFixed(
    1
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!selectedClass) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center text-xl font-semibold text-destructive">
        No classes available or assigned for attendance.
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
            onClick={() => navigate("/teacher")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="min-w-0"
          >
            <h1 className="text-xl sm:text-4xl font-bold neon-text truncate">Post Attendance</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Mark student attendance</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <label
                  htmlFor="class-select"
                  className="text-sm text-muted-foreground mb-2 block"
                >
                  Select Class
                </label>
                <Select
                  value={selectedClass.class_id}
                  onValueChange={handleClassChange}
                >
                  <SelectTrigger className="w-full h-[50px] bg-muted border-border">
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-muted-foreground">
                    {isMultiDateMode ? "Select Multiple Dates" : "Date"}
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsMultiDateMode(!isMultiDateMode);
                      if (!isMultiDateMode) {
                        setSelectedDates([]);
                      }
                    }}
                    className="text-xs h-7"
                  >
                    <CalendarDays className="w-3 h-3 mr-1" />
                    {isMultiDateMode ? "Single Date" : "Multiple Dates"}
                  </Button>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-muted border-border hover:bg-muted/80"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {isMultiDateMode
                        ? selectedDates.length > 0
                          ? `${selectedDates.length} dates selected`
                          : "Click to select dates"
                        : format(new Date(selectedDate + 'T00:00:00'), "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
                    {!isMultiDateMode && (
                      <Calendar
                        mode="single"
                        selected={new Date(selectedDate + 'T00:00:00')}
                        onSelect={handleDateSelect}
                        disabled={(date) => {
                          const now = new Date();
                          const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                          
                          const oneWeekAgo = new Date();
                          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                          oneWeekAgo.setHours(0, 0, 0, 0);

                          // Disable future dates
                          if (date > localToday) return true;
                          
                          // Disable dates older than 1 week
                          if (date < oneWeekAgo) return true;

                          // Disable Sundays
                          return date.getDay() === 0;
                        }}
                        initialFocus
                      />
                    )}
                    {isMultiDateMode && (
                      <div className="p-3">
                        <Calendar
                          mode="multiple"
                          selected={selectedDates}
                          onSelect={(dates) => {
                            if (dates) {
                              setSelectedDates(Array.isArray(dates) ? dates : [dates]);
                            }
                          }}
                          disabled={(date) => {
                            const now = new Date();
                            const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                            
                            const oneWeekAgo = new Date();
                            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                            oneWeekAgo.setHours(0, 0, 0, 0);

                            // Disable future dates
                            if (date > localToday) return true;

                            // Disable dates older than 1 week
                            if (date < oneWeekAgo) return true;
                            
                            // Disable Sundays
                            return date.getDay() === 0;
                          }}
                          initialFocus
                        />
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                {isMultiDateMode && selectedDates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDates.map((date) => (
                      <Badge
                        key={date.toISOString()}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {format(date, "MMM dd")}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeDateFromSelection(date)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Present Today
                </p>
                <p className="text-4xl font-bold text-green-500">
                  {presentCount}/{students.length}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Percentage</p>
                <p className="text-4xl font-bold text-primary">
                  {attendancePercentage}%
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="flex gap-4 justify-between flex-wrap">
          <div className="flex gap-4 flex-wrap">
            <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="glass">
                  <Upload className="w-4 h-4 mr-2" />
                  Import from CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Attendance from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to mark attendance for multiple students at once.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Select a CSV file with attendance data
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mb-4"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Choose CSV File
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadCSVTemplate}
                      className="ml-2"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">CSV Format:</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Your CSV file must have the following columns:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong>roll_number</strong> - Student roll number (required)</li>
                      <li><strong>name</strong> - Student name (required)</li>
                      <li><strong>present</strong> - Attendance status (required)</li>
                    </ul>
                    <div className="mt-3 p-3 bg-background rounded border border-border">
                      <p className="text-xs font-mono text-muted-foreground mb-1">Example CSV:</p>
                      <pre className="text-xs font-mono">
{`roll_number,name,present
1,John Doe,true
2,Jane Smith,false
3,Bob Johnson,true`}
                      </pre>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">
                        <strong>Accepted values for "present" column:</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        true/false, yes/no, present/absent, 1/0, or p/a
                      </p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            {/* NEW: Selection mode toggle */}
            <Button
              variant={isSelectionMode ? "default" : "outline"}
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) {
                  clearStudentSelection();
                }
              }}
              className="glass"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {isSelectionMode ? "Exit Selection" : "Select Students"}
            </Button>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            {/* Show selection actions when in selection mode */}
            {isSelectionMode && (
              <>
                <Button variant="outline" onClick={selectAllStudents} className="glass">
                  <Check className="w-4 h-4 mr-2" />
                  Select All ({students.length})
                </Button>
                <Button variant="outline" onClick={markSelectedAsPresent} className="glass text-green-500">
                  <Check className="w-4 h-4 mr-2" />
                  Mark Selected Present
                </Button>
                <Button variant="outline" onClick={markSelectedAsAbsent} className="glass text-destructive">
                  <X className="w-4 h-4 mr-2" />
                  Mark Selected Absent
                </Button>
              </>
            )}
            
            {/* Show regular actions when not in selection mode */}
            {!isSelectionMode && (
              <>
                <Button variant="outline" onClick={markAllPresent} className="glass">
                  <Check className="w-4 h-4 mr-2" />
                  Mark All Present
                </Button>
                <Button variant="outline" onClick={markAllAbsent} className="glass">
                  <X className="w-4 h-4 mr-2" />
                  Mark All Absent
                </Button>
              </>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Students - {selectedClass.class_name}
            </h2>

            {studentsLoading && (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {!studentsLoading && students.length > 0 && (
              <div className="space-y-3">
                {students.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.03 }}
                    className={`p-4 rounded-lg border transition-all ${student.present
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-destructive/10 border-destructive/30"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* NEW: Selection checkbox */}
                        {isSelectionMode && (
                          <Checkbox
                            checked={selectedStudents.has(student.id)}
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                            className="h-5 w-5"
                          />
                        )}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${student.present
                              ? "bg-green-500/20 text-green-500"
                              : "bg-destructive/20 text-destructive"
                            }`}
                        >
                          {student.roll_number}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {student.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Roll No: {student.roll_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border/50">
                          <Button
                            size="sm"
                            variant={student.status === 'present' ? "default" : "ghost"}
                            className={`h-8 w-8 sm:w-10 p-0 ${student.status === 'present' ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20" : "hover:bg-green-500/10 text-muted-foreground"}`}
                            onClick={() => updateAttendanceStatus(student.id, 'present')}
                          >
                            P
                          </Button>
                          <Button
                            size="sm"
                            variant={student.status === 'late' ? "default" : "ghost"}
                            className={`h-8 w-8 sm:w-10 p-0 ${student.status === 'late' ? "bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg shadow-yellow-500/20" : "hover:bg-yellow-500/10 text-muted-foreground"}`}
                            onClick={() => updateAttendanceStatus(student.id, 'late')}
                          >
                            L
                          </Button>
                          <Button
                            size="sm"
                            variant={student.status === 'absent' ? "default" : "ghost"}
                            className={`h-8 w-8 sm:w-10 p-0 ${student.status === 'absent' ? "bg-destructive hover:bg-destructive/90 text-white shadow-lg shadow-destructive/20" : "hover:bg-destructive/10 text-muted-foreground"}`}
                            onClick={() => updateAttendanceStatus(student.id, 'absent')}
                          >
                            A
                          </Button>
                        </div>
                        {/* Status Label for clarity on larger screens */}
                        <span
                          className={`hidden md:inline text-xs font-bold uppercase tracking-wider ${student.status === 'present' ? "text-green-500" :
                              student.status === 'late' ? "text-yellow-500" :
                                "text-destructive"
                            }`}
                        >
                          {student.status || 'absent'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!studentsLoading && students.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No students found in this class.</p>
              </div>
            )}
          </Card>
        </motion.div>

        <div className="flex justify-end gap-4">
          {/* Show info about selected students/dates */}
          {(isSelectionMode && selectedStudents.size > 0) || (isMultiDateMode && selectedDates.length > 0) ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSelectionMode && selectedStudents.size > 0 && (
                <Badge variant="outline">{selectedStudents.size} students selected</Badge>
              )}
              {isMultiDateMode && selectedDates.length > 0 && (
                <Badge variant="outline">{selectedDates.length} dates selected</Badge>
              )}
            </div>
          ) : null}

          {/* Conditional submit button */}
          {(isSelectionMode && selectedStudents.size > 0) || (isMultiDateMode && selectedDates.length > 0) ? (
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="neon-glow px-8"
                  disabled={submitting || students.length === 0}
                >
                  Submit Bulk Attendance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Bulk Attendance</DialogTitle>
                  <DialogDescription>
                    Please review the details before submitting.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Students:</p>
                    <p className="text-sm text-muted-foreground">
                      {isSelectionMode && selectedStudents.size > 0
                        ? `${selectedStudents.size} selected students`
                        : `All ${students.length} students`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Dates:</p>
                    <p className="text-sm text-muted-foreground">
                      {isMultiDateMode && selectedDates.length > 0
                        ? selectedDates.map(d => format(d, "MMM dd, yyyy")).join(", ")
                        : format(new Date(selectedDate + 'T00:00:00'), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Total Records:</p>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        const studentCount = isSelectionMode && selectedStudents.size > 0
                          ? selectedStudents.size
                          : students.length;
                        const dateCount = isMultiDateMode && selectedDates.length > 0
                          ? selectedDates.length
                          : 1;
                        return `${studentCount * dateCount} attendance records will be created`;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitBulkAttendance} disabled={submitting}>
                    {submitting ? "Submitting..." : "Confirm & Submit"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              size="lg"
              className="neon-glow px-8"
              onClick={submitAttendance}
              disabled={submitting || students.length === 0}
            >
              {submitting ? "Submitting..." : "Submit Attendance"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendance;
