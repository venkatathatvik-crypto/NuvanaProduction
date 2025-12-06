import { motion } from "framer-motion";
import { ArrowLeft, Users, Check, X, Calendar } from "lucide-react";
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
} from "@/services/academic";
import type { FlattenedClass } from "@/schemas/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/auth/AuthContext";

const TeacherAttendance = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();

  const [classes, setClasses] = useState<FlattenedClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<FlattenedClass | null>(
    null
  );
  const [selectedDate] = useState(new Date().toISOString().split("T")[0]);
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
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast.error("Failed to submit attendance. Please try again.");
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold neon-text">Post Attendance</h1>
            <p className="text-muted-foreground">Mark student attendance</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  htmlFor="date-display"
                  className="text-sm text-muted-foreground mb-2 block"
                >
                  Date
                </label>
                <div
                  id="date-display"
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border"
                >
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>{selectedDate}</span>
                </div>
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
