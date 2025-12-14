import { motion } from "framer-motion";
import { ArrowLeft, Users, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
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

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();

  const [classes, setClasses] = useState<FlattenedClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<FlattenedClass | null>(
    null
  );
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [students, setStudents] = useState<StudentAttendance[]>([]);

  // Load classes dynamically for the logged-in teacher
  useEffect(() => {
    const fetchClasses = async () => {
      if (profileLoading) return;

      if (!profile) {
        setClasses([]);
        setSelectedClass(null);
        setLoading(false);
        return;
      }

      try {
        const classResponse = await getTeacherClasses(profile.id, profile.school_id);
        if (classResponse && classResponse.length > 0) {
          setClasses(classResponse);
          setSelectedClass(classResponse[0]);
        } else {
          setClasses([]);
          setSelectedClass(null);
        }
      } catch (error) {
        console.error("Error fetching classes for attendance:", error);
        toast.error("Failed to load classes for attendance.");
        setClasses([]);
        setSelectedClass(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [profile, profileLoading]);

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

        // Fetch existing attendance records for today
        const attendanceMap = await getAttendanceForDate(
          selectedClass.class_id,
          selectedDate
        );

        // Merge attendance data with students
        const mergedStudents = studentsData.map((student) => ({
          ...student,
          present: attendanceMap[student.id] ?? false,
        }));

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

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const cls = classes.find((c) => c.class_id === classId);
    if (cls) {
      setSelectedClass(cls);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setStudents(
      students.map((student) =>
        student.id === studentId
          ? { ...student, present: !student.present }
          : student
      )
    );
  };

  const markAllPresent = () => {
    setStudents(students.map((student) => ({ ...student, present: true })));
    toast.success("Marked all students present");
  };

  const markAllAbsent = () => {
    setStudents(students.map((student) => ({ ...student, present: false })));
    toast.success("Marked all students absent");
  };

  const submitAttendance = async () => {
    if (!selectedClass || !profile) {
      toast.error("Missing class or profile information");
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
    } catch (error) {
      console.error("Error submitting attendance:", error);
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
                <select
                  id="class-select"
                  className="w-full p-3 rounded-lg bg-muted border border-border"
                  value={selectedClass.class_id}
                  onChange={handleClassChange}
                >
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-sm text-muted-foreground mb-2 block"
                >
                  Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-muted border-border hover:bg-muted/80"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {format(new Date(selectedDate + 'T00:00:00'), "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={new Date(selectedDate + 'T00:00:00')}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = (date.getMonth() + 1).toString().padStart(2, '0');
                          const day = date.getDate().toString().padStart(2, '0');
                          setSelectedDate(`${year}-${month}-${day}`);
                        }
                      }}
                      disabled={(date) => date > new Date() || date.getDay() === 0}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
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

        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={markAllPresent} className="glass">
            <Check className="w-4 h-4 mr-2" />
            Mark All Present
          </Button>
          <Button variant="outline" onClick={markAllAbsent} className="glass">
            <X className="w-4 h-4 mr-2" />
            Mark All Absent
          </Button>
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
                      <div className="flex items-center gap-4">
                        <span
                          className={`text-sm font-medium ${student.present
                              ? "text-green-500"
                              : "text-destructive"
                            }`}
                        >
                          {student.present ? "Present" : "Absent"}
                        </span>
                        <Checkbox
                          checked={student.present}
                          onCheckedChange={() => toggleAttendance(student.id)}
                          className="h-6 w-6"
                        />
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

        <div className="flex justify-end">
          <Button
            size="lg"
            className="neon-glow px-8"
            onClick={submitAttendance}
            disabled={submitting || students.length === 0}
          >
            {submitting ? "Submitting..." : "Submit Attendance"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeacherAttendance;
