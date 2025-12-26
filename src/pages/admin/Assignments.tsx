import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ClipboardList, UserPlus, Users, BookOpen, Loader2, Search, X, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { academicService } from "@/services/academicApiService";
import { userService } from "@/services/userService";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminAssignments() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClassesForStudents, setSelectedClassesForStudents] = useState<string[]>([]);
  const [studentAssignSearch, setStudentAssignSearch] = useState("");
  const [studentFilterType, setStudentFilterType] = useState<"all" | "unassigned">("all");
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedClassesForTeachers, setSelectedClassesForTeachers] = useState<string[]>([]);
  const [teacherAssignSearch, setTeacherAssignSearch] = useState("");
  const [selectedTeacherForSubject, setSelectedTeacherForSubject] = useState<string>("");
  const [selectedSubjectsForTeacher, setSelectedSubjectsForTeacher] = useState<string[]>([]);
  const [assigningStudent, setAssigningStudent] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [assigningSubjects, setAssigningSubjects] = useState(false);

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['assignments-classes'],
    queryFn: () => academicService.getClasses(),
    enabled: !!profile?.school_id,
  });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['assignments-teachers'],
    queryFn: () => userService.getTeachers(),
    enabled: !!profile?.school_id,
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['assignments-students'],
    queryFn: () => userService.getStudents(),
    enabled: !!profile?.school_id,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['assignments-subjects'],
    queryFn: () => academicService.getSubjects(),
    enabled: !!profile?.school_id,
  });

  const { data: gradeSubjects = [], isLoading: gradeSubjectsLoading } = useQuery({
    queryKey: ['assignments-gradeSubjects'],
    queryFn: () => academicService.getGradeSubjects(),
    enabled: !!profile?.school_id,
  });

  const { data: teacherClasses = [], isLoading: teacherClassesLoading } = useQuery({
    queryKey: ['assignments-teacherClasses'],
    queryFn: () => academicService.getTeacherClasses(),
    enabled: !!profile?.school_id,
  });

  const loading = classesLoading || teachersLoading || studentsLoading || subjectsLoading || gradeSubjectsLoading || teacherClassesLoading;
  const filteredStudentsForAssign = useMemo(() => {
    if (!studentAssignSearch.trim()) return students;
    const searchLower = studentAssignSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower) ||
        s.student_details?.classes?.name?.toLowerCase().includes(searchLower)
    );
  }, [students, studentAssignSearch]);

  const filteredTeachersForAssign = useMemo(() => {
    if (!teacherAssignSearch.trim()) return teachers;
    const searchLower = teacherAssignSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(searchLower) ||
        t.email?.toLowerCase().includes(searchLower)
    );
  }, [teachers, teacherAssignSearch]);

  const availableStudents = useMemo(() => {
    let filtered = filteredStudentsForAssign.filter((s) => !selectedStudents.includes(s.id));
    
    // Filter by assignment status
    if (studentFilterType === "unassigned") {
      filtered = filtered.filter((s) => !s.student_details?.class_id);
    }
    
    return filtered;
  }, [filteredStudentsForAssign, selectedStudents, studentFilterType]);

  const availableTeachers = useMemo(() => {
    return filteredTeachersForAssign.filter((t) => !selectedTeachers.includes(t.id));
  }, [filteredTeachersForAssign, selectedTeachers]);

  const availableClassesForStudents = useMemo(() => {
    return classes.filter((c) => !selectedClassesForStudents.includes(c.id));
  }, [classes, selectedClassesForStudents]);

  const availableClassesForTeachers = useMemo(() => {
    return classes.filter((c) => !selectedClassesForTeachers.includes(c.id));
  }, [classes, selectedClassesForTeachers]);

  const selectedStudentsData = useMemo(() => {
    return students.filter((s) => selectedStudents.includes(s.id));
  }, [students, selectedStudents]);

  const selectedTeachersData = useMemo(() => {
    return teachers.filter((t) => selectedTeachers.includes(t.id));
  }, [teachers, selectedTeachers]);

  const selectedClassesForStudentsData = useMemo(() => {
    return classes.filter((c) => selectedClassesForStudents.includes(c.id));
  }, [classes, selectedClassesForStudents]);

  const selectedClassesForTeachersData = useMemo(() => {
    return classes.filter((c) => selectedClassesForTeachers.includes(c.id));
  }, [classes, selectedClassesForTeachers]);

  const assignStudentsToClasses = async () => {
    if (selectedStudents.length === 0 || selectedClassesForStudents.length === 0) {
      toast.error("Select at least one student and one class");
      return;
    }
    setAssigningStudent(true);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const studentId of selectedStudents) {
        for (const classId of selectedClassesForStudents) {
          try {
            const student = students.find((s) => s.id === studentId);
            if (student?.student_details?.class_id === classId) continue;
            await userService.assignStudentToClass(studentId, classId);
            successCount++;
          } catch (error: any) {
            failedCount++;
            console.error(`Failed to assign student ${studentId} to class ${classId}:`, error);
          }
        }
      }
      if (successCount > 0) toast.success(`Successfully assigned ${successCount} student-class combination(s)`);
      if (failedCount > 0) toast.error(`Failed to assign ${failedCount} combination(s). Some may already be assigned.`);
      setSelectedStudents([]);
      setSelectedClassesForStudents([]);
      setStudentAssignSearch("");
      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign students");
    } finally {
      setAssigningStudent(false);
    }
  };

  const assignTeachers = async () => {
    if (selectedTeachers.length === 0 || selectedClassesForTeachers.length === 0) {
      toast.error("Please select at least one teacher and one class");
      return;
    }
    setAssigningTeacher(true);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const teacherId of selectedTeachers) {
        for (const classId of selectedClassesForTeachers) {
          try {
            const isAlreadyAssigned = teacherClasses.some((tc) => tc.teacher_id === teacherId && tc.class_id === classId);
            if (!isAlreadyAssigned) {
              await academicService.assignTeacherToClass(teacherId, classId);
              successCount++;
            }
          } catch (error: any) {
            failedCount++;
            console.error(`Failed to assign teacher ${teacherId} to class ${classId}:`, error);
          }
        }
      }
      if (successCount > 0) toast.success(`Successfully assigned ${successCount} teacher-class combination(s)`);
      if (failedCount > 0) toast.error(`Failed to assign ${failedCount} combination(s). Some may already be assigned.`);
      setSelectedTeachers([]);
      setSelectedClassesForTeachers([]);
      setTeacherAssignSearch("");
      queryClient.invalidateQueries({ queryKey: ['assignments-teacherClasses'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign teachers");
    } finally {
      setAssigningTeacher(false);
    }
  };

  const assignSubjectsToTeacher = async () => {
    if (!selectedTeacherForSubject || selectedSubjectsForTeacher.length === 0) {
      toast.error("Select teacher and at least one subject");
      return;
    }
    setAssigningSubjects(true);
    try {
      const gradeSubjectIdsToAssign: string[] = [];
      for (const subjectMasterId of selectedSubjectsForTeacher) {
        const matchingGradeSubjects = gradeSubjects.filter((gs) => gs.subject_master_id === subjectMasterId);
        gradeSubjectIdsToAssign.push(...matchingGradeSubjects.map((gs) => gs.id));
      }
      if (gradeSubjectIdsToAssign.length === 0) {
        toast.error("No grade subjects found for selected subjects");
        return;
      }
      const result = await academicService.assignSubjectsToTeacher(selectedTeacherForSubject, gradeSubjectIdsToAssign);
      toast.success(result.message);
      setSelectedSubjectsForTeacher([]);
      queryClient.invalidateQueries({ queryKey: ['assignments-teacherClasses'] });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign subjects");
    } finally {
      setAssigningSubjects(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage Assignments</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Assign students and teachers to classes</p>
          </motion.div>
        </div>

        <Tabs defaultValue="student-class" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 glass p-1 h-auto gap-1">
            <TabsTrigger value="student-class" className="text-xs sm:text-sm px-1 sm:px-3">
              Student-Class
            </TabsTrigger>
            <TabsTrigger value="teacher-class" className="text-xs sm:text-sm px-1 sm:px-3">
              Teacher-Class
            </TabsTrigger>
            <TabsTrigger value="teacher-subject" className="text-xs sm:text-sm px-1 sm:px-3">
              Teacher-Subject
            </TabsTrigger>
          </TabsList>

          {/* Student-Class Assignment Tab */}
          <TabsContent value="student-class">
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> Assign Students to Classes
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''} × {selectedClassesForStudents.length} Class{selectedClassesForStudents.length !== 1 ? 'es' : ''}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Students Selection */}
                <Card className="glass-card p-4 border-2 border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Available Students
                    </h3>
                    <Badge variant="outline">{availableStudents.length} available</Badge>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students by name, email, or class..."
                        value={studentAssignSearch}
                        onChange={(e) => setStudentAssignSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={studentFilterType === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStudentFilterType("all")}
                        className="flex-1 text-xs"
                      >
                        All Students
                      </Button>
                      <Button
                        variant={studentFilterType === "unassigned" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStudentFilterType("unassigned")}
                        className="flex-1 text-xs"
                      >
                        Unassigned Only
                      </Button>
                    </div>
                  </div>
                  {availableStudents.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mb-2 text-xs"
                      onClick={() => {
                        const allIds = availableStudents.map((s) => s.id);
                        setSelectedStudents([...new Set([...selectedStudents, ...allIds])]);
                      }}
                    >
                      Select All ({availableStudents.length})
                    </Button>
                  )}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {studentAssignSearch ? "No students match your search" : "All students selected"}
                        </p>
                      </div>
                    ) : (
                      availableStudents.map((s) => (
                        <Card
                          key={s.id}
                          className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50 overflow-hidden"
                          onClick={() => {
                            if (!selectedStudents.includes(s.id)) {
                              setSelectedStudents([...selectedStudents, s.id]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                              <div className="mt-1">
                                {s.student_details?.classes?.name ? (
                                  <Badge variant="outline" className="text-xs">
                                    {s.student_details.classes.name}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-muted-foreground">
                                    Unassigned
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudents([...selectedStudents, s.id]);
                              }}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>

                {/* Selected Students */}
                <Card className="glass-card p-4 border-2 border-green-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Selected Students
                    </h3>
                    {selectedStudents.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudents([])}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No students selected</p>
                        <p className="text-xs mt-1">Click on students from the left to select them</p>
                      </div>
                    ) : (
                      selectedStudentsData.map((s) => (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <Card className="p-3 border border-green-500/30 bg-green-500/5">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{s.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedStudents(selectedStudents.filter((id) => id !== s.id));
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Classes Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="glass-card p-4 border-2 border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" /> Available Classes
                    </h3>
                    <Badge variant="outline">{availableClassesForStudents.length} available</Badge>
                  </div>
                  {availableClassesForStudents.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mb-2 text-xs"
                      onClick={() => {
                        const allIds = availableClassesForStudents.map((c) => c.id);
                        setSelectedClassesForStudents([...new Set([...selectedClassesForStudents, ...allIds])]);
                      }}
                    >
                      Select All ({availableClassesForStudents.length})
                    </Button>
                  )}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableClassesForStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">All classes selected</p>
                      </div>
                    ) : (
                      availableClassesForStudents.map((c) => (
                        <Card
                          key={c.id}
                          className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50 overflow-hidden"
                          onClick={() => {
                            if (!selectedClassesForStudents.includes(c.id)) {
                              setSelectedClassesForStudents([...selectedClassesForStudents, c.id]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{c.name}</p>
                              {c.grade_levels?.name && (
                                <p className="text-xs text-muted-foreground truncate">{c.grade_levels.name}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClassesForStudents([...selectedClassesForStudents, c.id]);
                              }}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="glass-card p-4 border-2 border-green-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Selected Classes
                    </h3>
                    {selectedClassesForStudents.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClassesForStudents([])}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedClassesForStudents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No classes selected</p>
                      </div>
                    ) : (
                      selectedClassesForStudentsData.map((c) => (
                        <Card
                          key={c.id}
                          className="p-3 border border-green-500/30 bg-green-500/5 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{c.name}</p>
                              {c.grade_levels?.name && (
                                <p className="text-xs text-muted-foreground truncate">{c.grade_levels.name}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedClassesForStudents(selectedClassesForStudents.filter((id) => id !== c.id));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  <p>Total combinations: <span className="font-semibold text-foreground">{selectedStudents.length * selectedClassesForStudents.length}</span></p>
                  <p className="text-xs mt-1">Each selected student will be assigned to each selected class</p>
                </div>
                <Button
                  onClick={assignStudentsToClasses}
                  disabled={assigningStudent || selectedStudents.length === 0 || selectedClassesForStudents.length === 0}
                  size="lg"
                  className="min-w-40"
                >
                  {assigningStudent ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign Now
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Teacher-Class Assignment Tab */}
          <TabsContent value="teacher-class">
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Assign Teachers to Classes
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {selectedTeachers.length} Teacher{selectedTeachers.length !== 1 ? 's' : ''} × {selectedClassesForTeachers.length} Class{selectedClassesForTeachers.length !== 1 ? 'es' : ''}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Teachers Selection */}
                <Card className="glass-card p-4 border-2 border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Available Teachers
                    </h3>
                    <Badge variant="outline">{availableTeachers.length} available</Badge>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search teachers by name or email..."
                      value={teacherAssignSearch}
                      onChange={(e) => setTeacherAssignSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {availableTeachers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mb-2 text-xs"
                      onClick={() => {
                        const allIds = availableTeachers.map((t) => t.id);
                        setSelectedTeachers([...new Set([...selectedTeachers, ...allIds])]);
                      }}
                    >
                      Select All ({availableTeachers.length})
                    </Button>
                  )}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableTeachers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          {teacherAssignSearch ? "No teachers match your search" : "All teachers selected"}
                        </p>
                      </div>
                    ) : (
                      availableTeachers.map((t) => (
                        <Card
                          key={t.id}
                          className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50 overflow-hidden"
                          onClick={() => {
                            if (!selectedTeachers.includes(t.id)) {
                              setSelectedTeachers([...selectedTeachers, t.id]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{t.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTeachers([...selectedTeachers, t.id]);
                              }}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>

                {/* Selected Teachers */}
                <Card className="glass-card p-4 border-2 border-green-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Selected Teachers
                    </h3>
                    {selectedTeachers.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTeachers([])}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedTeachers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No teachers selected</p>
                        <p className="text-xs mt-1">Click on teachers from the left to select them</p>
                      </div>
                    ) : (
                      selectedTeachersData.map((t) => (
                        <Card
                          key={t.id}
                          className="p-3 border border-green-500/30 bg-green-500/5 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{t.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedTeachers(selectedTeachers.filter((id) => id !== t.id));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Classes Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="glass-card p-4 border-2 border-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" /> Available Classes
                    </h3>
                    <Badge variant="outline">{availableClassesForTeachers.length} available</Badge>
                  </div>
                  {availableClassesForTeachers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mb-2 text-xs"
                      onClick={() => {
                        const allIds = availableClassesForTeachers.map((c) => c.id);
                        setSelectedClassesForTeachers([...new Set([...selectedClassesForTeachers, ...allIds])]);
                      }}
                    >
                      Select All ({availableClassesForTeachers.length})
                    </Button>
                  )}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableClassesForTeachers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">All classes selected</p>
                      </div>
                    ) : (
                      availableClassesForTeachers.map((c) => (
                        <Card
                          key={c.id}
                          className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50 overflow-hidden"
                          onClick={() => {
                            if (!selectedClassesForTeachers.includes(c.id)) {
                              setSelectedClassesForTeachers([...selectedClassesForTeachers, c.id]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{c.name}</p>
                              {c.grade_levels?.name && (
                                <p className="text-xs text-muted-foreground truncate">{c.grade_levels.name}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClassesForTeachers([...selectedClassesForTeachers, c.id]);
                              }}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="glass-card p-4 border-2 border-green-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Selected Classes
                    </h3>
                    {selectedClassesForTeachers.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClassesForTeachers([])}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedClassesForTeachers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No classes selected</p>
                      </div>
                    ) : (
                      selectedClassesForTeachersData.map((c) => (
                        <Card
                          key={c.id}
                          className="p-3 border border-green-500/30 bg-green-500/5 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{c.name}</p>
                              {c.grade_levels?.name && (
                                <p className="text-xs text-muted-foreground truncate">{c.grade_levels.name}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelectedClassesForTeachers(selectedClassesForTeachers.filter((id) => id !== c.id));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  <p>Total combinations: <span className="font-semibold text-foreground">{selectedTeachers.length * selectedClassesForTeachers.length}</span></p>
                  <p className="text-xs mt-1">Each selected teacher will be assigned to each selected class</p>
                </div>
                <Button
                  onClick={assignTeachers}
                  disabled={assigningTeacher || selectedTeachers.length === 0 || selectedClassesForTeachers.length === 0}
                  size="lg"
                  className="min-w-40"
                >
                  {assigningTeacher ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Assign Now
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Teacher-Subject Assignment Tab */}
          <TabsContent value="teacher-subject">
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Assign Subjects to Teachers
                </h2>
                {selectedTeacherForSubject && selectedSubjectsForTeacher.length > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {selectedSubjectsForTeacher.length} Subject{selectedSubjectsForTeacher.length !== 1 ? 's' : ''} Selected
                  </Badge>
                )}
              </div>

              <div className="space-y-6">
                {/* Teacher Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Teacher</label>
                  <select
                    className="w-full bg-muted border border-border rounded-md h-12 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedTeacherForSubject}
                    onChange={(e) => {
                      setSelectedTeacherForSubject(e.target.value);
                      setSelectedSubjectsForTeacher([]);
                    }}
                  >
                    <option value="">Choose a teacher...</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>

                {selectedTeacherForSubject && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Available Subjects */}
                    <Card className="glass-card p-4 border-2 border-primary/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" /> Available Subjects
                        </h3>
                        <Badge variant="outline">
                          {subjects.filter((s) => !selectedSubjectsForTeacher.includes(s.id)).length} available
                        </Badge>
                      </div>
                      {subjects.filter((s) => !selectedSubjectsForTeacher.includes(s.id)).length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mb-2 text-xs"
                          onClick={() => {
                            const availableIds = subjects
                              .filter((s) => !selectedSubjectsForTeacher.includes(s.id))
                              .map((s) => s.id);
                            setSelectedSubjectsForTeacher([...selectedSubjectsForTeacher, ...availableIds]);
                          }}
                        >
                          Select All ({subjects.filter((s) => !selectedSubjectsForTeacher.includes(s.id)).length})
                        </Button>
                      )}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {subjects.filter((s) => !selectedSubjectsForTeacher.includes(s.id)).length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">All subjects selected</p>
                          </div>
                        ) : (
                          subjects
                            .filter((s) => !selectedSubjectsForTeacher.includes(s.id))
                            .map((subject) => (
                              <Card
                                key={subject.id}
                                className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50 overflow-hidden"
                                onClick={() => {
                                  if (!selectedSubjectsForTeacher.includes(subject.id)) {
                                    setSelectedSubjectsForTeacher([...selectedSubjectsForTeacher, subject.id]);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium text-sm truncate flex-1 min-w-0">{subject.name}</p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSubjectsForTeacher([...selectedSubjectsForTeacher, subject.id]);
                                    }}
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </Button>
                                </div>
                              </Card>
                            ))
                        )}
                      </div>
                    </Card>

                    {/* Selected Subjects */}
                    <Card className="glass-card p-4 border-2 border-green-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" /> Selected Subjects
                        </h3>
                        {selectedSubjectsForTeacher.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSubjectsForTeacher([])}
                            className="text-xs"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {selectedSubjectsForTeacher.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No subjects selected</p>
                            <p className="text-xs mt-1">Click on subjects from the left to select them</p>
                          </div>
                        ) : (
                          subjects
                            .filter((s) => selectedSubjectsForTeacher.includes(s.id))
                            .map((subject) => (
                              <Card
                                key={subject.id}
                                className="p-3 border border-green-500/30 bg-green-500/5 overflow-hidden"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium text-sm truncate flex-1 min-w-0">{subject.name}</p>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="shrink-0 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setSelectedSubjectsForTeacher(selectedSubjectsForTeacher.filter((id) => id !== subject.id));
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </Card>
                            ))
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                {/* Action Button */}
                {selectedTeacherForSubject && (
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Selected teacher: <span className="font-semibold text-foreground">
                          {teachers.find((t) => t.id === selectedTeacherForSubject)?.name}
                        </span>
                      </p>
                      <p className="text-xs mt-1">
                        {selectedSubjectsForTeacher.length > 0
                          ? `Ready to assign ${selectedSubjectsForTeacher.length} subject${selectedSubjectsForTeacher.length !== 1 ? 's' : ''}`
                          : "Select at least one subject to assign"}
                      </p>
                    </div>
                    <Button
                      onClick={assignSubjectsToTeacher}
                      disabled={assigningSubjects || selectedSubjectsForTeacher.length === 0}
                      size="lg"
                      className="min-w-40"
                    >
                      {assigningSubjects ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Assign Now
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

