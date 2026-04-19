import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ClipboardList, UserPlus, Users, BookOpen, Loader2, Search, X, CheckCircle2, ArrowRight, ArrowLeft, AlertTriangle, Info, Eye, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface AssignmentResult {
  success: { id: string; name: string }[];
  skipped: { id: string; name: string; reason: string }[];
  failed: { id: string; name: string; error: string }[];
}

export default function AdminAssignments() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  // Student-Class state
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<string>(""); // Single class only
  const [studentAssignSearch, setStudentAssignSearch] = useState("");
  const [studentFilterType, setStudentFilterType] = useState<"all" | "unassigned">("all");
  
  // Teacher-Class state
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedClassesForTeachers, setSelectedClassesForTeachers] = useState<string[]>([]);
  const [teacherAssignSearch, setTeacherAssignSearch] = useState("");
  
  // Teacher-Subject state
  const [selectedTeacherForSubject, setSelectedTeacherForSubject] = useState<string>("");
  const [selectedSubjectsForTeacher, setSelectedSubjectsForTeacher] = useState<string[]>([]);
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<string[]>([]);
  const [teacherSubjectSearch, setTeacherSubjectSearch] = useState("");
  
  // Loading states
  const [assigningStudent, setAssigningStudent] = useState(false);
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [assigningSubjects, setAssigningSubjects] = useState(false);
  
  // Dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmTitle, setConfirmTitle] = useState("Confirm Action");
  const [confirmButtonText, setConfirmButtonText] = useState("Confirm");
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [assignmentResults, setAssignmentResults] = useState<AssignmentResult | null>(null);

  // View & Manage Filtering state
  const [vmStudentSearch, setVmStudentSearch] = useState("");
  const [vmStudentClassFilter, setVmStudentClassFilter] = useState<string>("all");
  const [vmTeacherClassSearch, setVmTeacherClassSearch] = useState("");
  const [vmTeacherClassFilter, setVmTeacherClassFilter] = useState<string>("all");
  const [vmTeacherSubjectSearch, setVmTeacherSubjectSearch] = useState("");
  const [vmTeacherSubjectGradeFilter, setVmTeacherSubjectGradeFilter] = useState<string>("all");

  // Bulk Selection state for View & Manage
  const [selectedVmStudents, setSelectedVmStudents] = useState<string[]>([]);
  const [selectedVmTeacherClasses, setSelectedVmTeacherClasses] = useState<string[]>([]);
  const [selectedVmTeacherSubjects, setSelectedVmTeacherSubjects] = useState<string[]>([]);

  // Bulk Removal Loading states
  const [isBulkRemovingStudents, setIsBulkRemovingStudents] = useState(false);
  const [isBulkRemovingTeacherClasses, setIsBulkRemovingTeacherClasses] = useState(false);
  const [isBulkRemovingTeacherSubjects, setIsBulkRemovingTeacherSubjects] = useState(false);

  // Data queries
  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['assignments-classes'],
    queryFn: () => academicService.getClasses(),
    enabled: !!profile?.school_id,
    staleTime: 60 * 1000,
  });

  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['assignments-teachers'],
    queryFn: () => userService.getTeachers(),
    enabled: !!profile?.school_id,
    staleTime: 60 * 1000,
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['assignments-students'],
    queryFn: () => userService.getStudents(),
    enabled: !!profile?.school_id,
    staleTime: 60 * 1000,
  });

  const { data: subjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ['assignments-subjects'],
    queryFn: () => academicService.getSubjects(),
    enabled: !!profile?.school_id,
    staleTime: 60 * 1000,
  });

  const { data: gradeSubjects = [], isLoading: gradeSubjectsLoading } = useQuery({
    queryKey: ['assignments-gradeSubjects'],
    queryFn: () => academicService.getGradeSubjects(),
    enabled: !!profile?.school_id,
    staleTime: 60 * 1000,
  });

  const { data: teacherClasses = [], isLoading: teacherClassesLoading } = useQuery({
    queryKey: ['assignments-teacherClasses'],
    queryFn: () => academicService.getTeacherClasses(),
    enabled: !!profile?.school_id,
    staleTime: 60 * 1000,
  });

  const { data: gradeLevels = [], isLoading: gradeLevelsLoading } = useQuery({
    queryKey: ['assignments-gradeLevels'],
    queryFn: () => academicService.getGrades(),
    enabled: !!profile?.school_id,
    staleTime: 60 * 1000,
  });

  const { data: teacherSubjects = [], isLoading: teacherSubjectsLoading } = useQuery({
    queryKey: ['assignments-teacherSubjects'],
    queryFn: () => academicService.getTeacherSubjects(),
    enabled: !!profile?.school_id,
    staleTime: 60 * 1000,
  });

  const loading = classesLoading || teachersLoading || studentsLoading || subjectsLoading || gradeSubjectsLoading || teacherClassesLoading || gradeLevelsLoading || teacherSubjectsLoading;

  // Filtered and available data
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

  const filteredTeachersForSubject = useMemo(() => {
    if (!teacherSubjectSearch.trim()) return teachers;
    const searchLower = teacherSubjectSearch.toLowerCase();
    return teachers.filter(
      (t) =>
        t.name?.toLowerCase().includes(searchLower) ||
        t.email?.toLowerCase().includes(searchLower)
    );
  }, [teachers, teacherSubjectSearch]);

  const availableStudents = useMemo(() => {
    let filtered = filteredStudentsForAssign.filter((s) => !selectedStudents.includes(s.id));
    if (studentFilterType === "unassigned") {
      filtered = filtered.filter((s) => !s.student_details?.class_id);
    }
    return filtered;
  }, [filteredStudentsForAssign, selectedStudents, studentFilterType]);

  const availableTeachers = useMemo(() => {
    return filteredTeachersForAssign.filter((t) => !selectedTeachers.includes(t.id));
  }, [filteredTeachersForAssign, selectedTeachers]);

  const availableClassesForStudents = useMemo(() => {
    return classes.filter((c) => c.id !== selectedClassForStudents);
  }, [classes, selectedClassForStudents]);

  const availableClassesForTeachers = useMemo(() => {
    return classes.filter((c) => !selectedClassesForTeachers.includes(c.id));
  }, [classes, selectedClassesForTeachers]);

  const selectedStudentsData = useMemo(() => {
    return students.filter((s) => selectedStudents.includes(s.id));
  }, [students, selectedStudents]);

  const selectedTeachersData = useMemo(() => {
    return teachers.filter((t) => selectedTeachers.includes(t.id));
  }, [teachers, selectedTeachers]);

  const selectedClassForStudentsData = useMemo(() => {
    return classes.find((c) => c.id === selectedClassForStudents);
  }, [classes, selectedClassForStudents]);

  const selectedClassesForTeachersData = useMemo(() => {
    return classes.filter((c) => selectedClassesForTeachers.includes(c.id));
  }, [classes, selectedClassesForTeachers]);

  const availableSubjectsForTeacher = useMemo(() => {
    // If no grades selected, show all subjects
    if (selectedGradeLevels.length === 0) {
      return subjects.filter((s) => !selectedSubjectsForTeacher.includes(s.id));
    }
    
    // Filter subjects that are assigned to at least one of the selected grades
    const subjectsInSelectedGrades = gradeSubjects
      .filter(gs => selectedGradeLevels.map(Number).includes(gs.grade_level_id))
      .map(gs => gs.subject_master_id);
    
    const uniqueSubjectIds = [...new Set(subjectsInSelectedGrades)];
    
    return subjects.filter((s) => 
      uniqueSubjectIds.includes(s.id) && !selectedSubjectsForTeacher.includes(s.id)
    );
  }, [subjects, selectedSubjectsForTeacher, selectedGradeLevels, gradeSubjects]);

  const selectedSubjectsData = useMemo(() => {
    return subjects.filter((s) => selectedSubjectsForTeacher.includes(s.id));
  }, [subjects, selectedSubjectsForTeacher]);

  // Calculate assignment preview
  const studentClassCombinations = useMemo(() => {
    return selectedStudents.length > 0 && selectedClassForStudents 
      ? selectedStudents.length 
      : 0;
  }, [selectedStudents, selectedClassForStudents]);

  const teacherClassCombinations = useMemo(() => {
    return selectedTeachers.length * selectedClassesForTeachers.length;
  }, [selectedTeachers, selectedClassesForTeachers]);

  // View & Manage Filtered Data
  const filteredVmStudents = useMemo(() => {
    return students.filter(s => {
      if (!s.student_details?.class_id) return false;
      const matchesSearch = !vmStudentSearch || 
        s.name?.toLowerCase().includes(vmStudentSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(vmStudentSearch.toLowerCase()) ||
        s.student_details?.classes?.name?.toLowerCase().includes(vmStudentSearch.toLowerCase());
      const matchesClass = vmStudentClassFilter === "all" || s.student_details?.class_id === vmStudentClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, vmStudentSearch, vmStudentClassFilter]);

  const filteredVmTeacherClasses = useMemo(() => {
    return teacherClasses.filter(tc => {
      const matchesSearch = !vmTeacherClassSearch ||
        tc.profiles?.name?.toLowerCase().includes(vmTeacherClassSearch.toLowerCase()) ||
        tc.profiles?.email?.toLowerCase().includes(vmTeacherClassSearch.toLowerCase()) ||
        tc.classes?.name?.toLowerCase().includes(vmTeacherClassSearch.toLowerCase());
      const matchesClass = vmTeacherClassFilter === "all" || tc.class_id === vmTeacherClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [teacherClasses, vmTeacherClassSearch, vmTeacherClassFilter]);

  const filteredVmTeacherSubjects = useMemo(() => {
    return teacherSubjects.filter((ts: any) => {
      const teacher = teachers.find(t => t.id === ts.teacher_id);
      const matchesSearch = !vmTeacherSubjectSearch ||
        teacher?.name?.toLowerCase().includes(vmTeacherSubjectSearch.toLowerCase()) ||
        teacher?.email?.toLowerCase().includes(vmTeacherSubjectSearch.toLowerCase()) ||
        ts.grade_subjects?.subjects_master?.name?.toLowerCase().includes(vmTeacherSubjectSearch.toLowerCase()) ||
        ts.grade_subjects?.grade_levels?.name?.toLowerCase().includes(vmTeacherSubjectSearch.toLowerCase());
      const matchesGrade = vmTeacherSubjectGradeFilter === "all" || ts.grade_subjects?.grade_level_id === Number(vmTeacherSubjectGradeFilter);
      return matchesSearch && matchesGrade;
    });
  }, [teacherSubjects, teachers, vmTeacherSubjectSearch, vmTeacherSubjectGradeFilter]);

  // Assignment functions with improved error handling
  const assignStudentsToClasses = async () => {
    if (selectedStudents.length === 0 || !selectedClassForStudents) {
      toast.error("Select at least one student and one class");
      return;
    }

    const results: AssignmentResult = {
      success: [],
      skipped: [],
      failed: []
    };

    setAssigningStudent(true);
    try {
      const targetClassId = selectedClassForStudents;
      const targetClass = classes.find(c => c.id === targetClassId);
      
      for (const studentId of selectedStudents) {
        try {
          const student = students.find((s) => s.id === studentId);
          if (student?.student_details?.class_id === targetClassId) {
            results.skipped.push({
              id: studentId,
              name: student.name || 'Unknown',
              reason: `Already in ${targetClass?.name || 'this class'}`
            });
            continue;
          }
          if (student?.student_details?.class_id) {
            const currentClass = classes.find(c => c.id === student.student_details.class_id);
            results.skipped.push({
              id: studentId,
              name: student.name || 'Unknown',
              reason: `Already in ${currentClass?.name || 'another class'}. Remove from current class first.`
            });
            continue;
          }
          await userService.assignStudentToClass(studentId, targetClassId);
          results.success.push({
            id: studentId,
            name: student?.name || 'Unknown'
          });
        } catch (error: any) {
          const student = students.find((s) => s.id === studentId);
          results.failed.push({
            id: studentId,
            name: student?.name || 'Unknown',
            error: error.message || 'Unknown error'
          });
        }
      }

      // Show results
      setAssignmentResults(results);
      setShowResultsDialog(true);

      // Invalidate and refetch queries to update UI immediately
      await queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
      await queryClient.refetchQueries({ queryKey: ['assignments-students'] });

      // Clear selections if successful
      if (results.success.length > 0) {
        setSelectedStudents([]);
        setSelectedClassForStudents("");
        setStudentAssignSearch("");
      }
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

    const results: AssignmentResult = {
      success: [],
      skipped: [],
      failed: []
    };

    setAssigningTeacher(true);
    try {
      for (const teacherId of selectedTeachers) {
        for (const classId of selectedClassesForTeachers) {
          try {
            const teacher = teachers.find((t) => t.id === teacherId);
            const className = classes.find(c => c.id === classId)?.name || 'Unknown';
            const isAlreadyAssigned = teacherClasses.some((tc) => tc.teacher_id === teacherId && tc.class_id === classId);
            
            if (isAlreadyAssigned) {
              results.skipped.push({
                id: `${teacherId}-${classId}`,
                name: `${teacher?.name || 'Unknown'} → ${className}`,
                reason: 'Already assigned to this class'
              });
              continue;
            }
            
            await academicService.assignTeacherToClass(teacherId, classId);
            results.success.push({
              id: `${teacherId}-${classId}`,
              name: `${teacher?.name || 'Unknown'} → ${className}`
            });
          } catch (error: any) {
            const teacher = teachers.find((t) => t.id === teacherId);
            const className = classes.find(c => c.id === classId)?.name || 'Unknown';
            results.failed.push({
              id: `${teacherId}-${classId}`,
              name: `${teacher?.name || 'Unknown'} → ${className}`,
              error: error.message || 'Unknown error'
            });
          }
        }
      }

      setAssignmentResults(results);
      setShowResultsDialog(true);

      // Invalidate and refetch queries to update UI immediately
      await queryClient.invalidateQueries({ queryKey: ['assignments-teacherClasses'] });
      await queryClient.refetchQueries({ queryKey: ['assignments-teacherClasses'] });

      if (results.success.length > 0) {
        setSelectedTeachers([]);
        setSelectedClassesForTeachers([]);
        setTeacherAssignSearch("");
      }
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

    if (selectedGradeLevels.length === 0) {
      toast.error("Select at least one grade level");
      return;
    }

    const results: AssignmentResult = {
      success: [],
      skipped: [],
      failed: []
    };

    setAssigningSubjects(true);
    try {
      const teacher = teachers.find(t => t.id === selectedTeacherForSubject);
      const gradeSubjectIdsToAssign: string[] = [];
      const validCombinations: Array<{subjectName: string, gradeName: string}> = [];
      const skippedCombinations: Array<{subjectName: string, gradeName: string, reason: string}> = [];

      for (const subjectMasterId of selectedSubjectsForTeacher) {
        const subject = subjects.find(s => s.id === subjectMasterId);
        for (const gradeLevelId of selectedGradeLevels) {
          const gradeLevel = gradeLevels.find(g => g.id === Number(gradeLevelId));
          const matchingGradeSubjects = gradeSubjects.filter(
            (gs) => gs.subject_master_id === subjectMasterId && gs.grade_level_id === Number(gradeLevelId)
          );
          
          if (matchingGradeSubjects.length > 0) {
            gradeSubjectIdsToAssign.push(...matchingGradeSubjects.map((gs) => String(gs.id)));
            validCombinations.push({
              subjectName: subject?.name || 'Unknown',
              gradeName: gradeLevel?.name || 'Unknown'
            });
          } else {
            skippedCombinations.push({
              subjectName: subject?.name || 'Unknown',
              gradeName: gradeLevel?.name || 'Unknown',
              reason: 'No grade subject mapping found'
            });
          }
        }
      }

      if (gradeSubjectIdsToAssign.length === 0) {
        toast.error("No valid grade-subject combinations found");
        setAssigningSubjects(false);
        return;
      }

      // Make the API call
      await academicService.assignSubjectsToTeacher(selectedTeacherForSubject, gradeSubjectIdsToAssign);
      
      // Populate results AFTER successful API call
      validCombinations.forEach((combo, idx) => {
        results.success.push({
          id: `success-${idx}`,
          name: `${combo.subjectName} - ${combo.gradeName}`
        });
      });

      skippedCombinations.forEach((combo, idx) => {
        results.skipped.push({
          id: `skipped-${idx}`,
          name: `${combo.subjectName} - ${combo.gradeName}`,
          reason: combo.reason
        });
      });

      // Show results AFTER successful API call
      setAssignmentResults(results);
      setShowResultsDialog(true);

      // Invalidate and refetch queries to update UI immediately
      await queryClient.invalidateQueries({ queryKey: ['assignments-teacherSubjects'] });
      await queryClient.refetchQueries({ queryKey: ['assignments-teacherSubjects'] });

      if (results.success.length > 0) {
        setSelectedSubjectsForTeacher([]);
        setSelectedGradeLevels([]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to assign subjects");
    } finally {
      setAssigningSubjects(false);
    }
  };

  // Bulk Removal handlers for "View & Manage"
  const bulkRemoveStudentsFromClasses = async () => {
    if (selectedVmStudents.length === 0) return;
    
    const results: AssignmentResult = { success: [], skipped: [], failed: [] };
    setIsBulkRemovingStudents(true);
    
    try {
      for (const studentId of selectedVmStudents) {
        try {
          const student = students.find(s => s.id === studentId);
          await userService.unassignStudentFromClass(studentId);
          results.success.push({ id: studentId, name: student?.name || 'Unknown student' });
        } catch (error: any) {
          const student = students.find(s => s.id === studentId);
          results.failed.push({ id: studentId, name: student?.name || 'Unknown student', error: error.message || 'Failed to remove' });
        }
      }
      
      setAssignmentResults(results);
      setShowResultsDialog(true);
      await queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
      setSelectedVmStudents([]);
    } catch (error: any) {
      toast.error("An error occurred during bulk removal");
    } finally {
      setIsBulkRemovingStudents(false);
    }
  };

  const bulkRemoveTeacherClasses = async () => {
    if (selectedVmTeacherClasses.length === 0) return;
    
    const results: AssignmentResult = { success: [], skipped: [], failed: [] };
    setIsBulkRemovingTeacherClasses(true);
    
    try {
      for (const assignmentId of selectedVmTeacherClasses) {
        try {
          const tc = teacherClasses.find(x => x.id === assignmentId);
          await academicService.deleteTeacherClass(assignmentId);
          results.success.push({ id: assignmentId, name: `${tc?.profiles?.name} from ${tc?.classes?.name}` });
        } catch (error: any) {
          const tc = teacherClasses.find(x => x.id === assignmentId);
          results.failed.push({ id: assignmentId, name: tc?.profiles?.name || 'Unknown', error: error.message || 'Failed' });
        }
      }
      
      setAssignmentResults(results);
      setShowResultsDialog(true);
      await queryClient.invalidateQueries({ queryKey: ['assignments-teacherClasses'] });
      setSelectedVmTeacherClasses([]);
    } catch (error: any) {
      toast.error("An error occurred during bulk removal");
    } finally {
      setIsBulkRemovingTeacherClasses(false);
    }
  };

  const bulkRemoveTeacherSubjects = async () => {
    if (selectedVmTeacherSubjects.length === 0) return;
    
    const results: AssignmentResult = { success: [], skipped: [], failed: [] };
    setIsBulkRemovingTeacherSubjects(true);
    
    try {
      for (const assignmentId of selectedVmTeacherSubjects) {
        try {
          const ts = teacherSubjects.find((x: any) => x.id === assignmentId);
          const teacher = teachers.find(t => t.id === ts?.teacher_id);
          await academicService.deleteTeacherSubject(assignmentId);
          results.success.push({ id: assignmentId, name: `${teacher?.name} from ${ts?.grade_subjects?.subjects_master?.name}` });
        } catch (error: any) {
          const ts = teacherSubjects.find((x: any) => x.id === assignmentId);
          const teacher = teachers.find(t => t.id === ts?.teacher_id);
          results.failed.push({ 
            id: assignmentId, 
            name: `${teacher?.name || 'Teacher'} - ${ts?.grade_subjects?.subjects_master?.name || 'Subject'}`, 
            error: error.message || 'Failed' 
          });
        }
      }
      
      setAssignmentResults(results);
      setShowResultsDialog(true);
      await queryClient.invalidateQueries({ queryKey: ['assignments-teacherSubjects'] });
      setSelectedVmTeacherSubjects([]);
    } catch (error: any) {
      toast.error("An error occurred during bulk removal");
    } finally {
      setIsBulkRemovingTeacherSubjects(false);
    }
  };

  // Confirmation handlers
  const handleStudentAssignClick = () => {
    const className = selectedClassForStudentsData?.name || 'selected class';
    const message = `You are about to assign ${selectedStudents.length} student(s) to ${className}`;
    
    setConfirmTitle("Confirm Assignment");
    setConfirmButtonText("Assign Students");
    setConfirmMessage(message);
    setConfirmAction(() => assignStudentsToClasses);
    setShowConfirmDialog(true);
  };

  const handleTeacherAssignClick = () => {
    setConfirmTitle("Confirm Assignment");
    setConfirmButtonText("Assign Teachers");
    setConfirmMessage(`You are about to create ${teacherClassCombinations} assignments:\n${selectedTeachers.length} teacher(s) × ${selectedClassesForTeachers.length} class(es)`);
    setConfirmAction(() => assignTeachers);
    setShowConfirmDialog(true);
  };

  const handleSubjectAssignClick = () => {
    const teacher = teachers.find(t => t.id === selectedTeacherForSubject);
    const gradeNames = gradeLevels.filter(g => selectedGradeLevels.map(Number).includes(g.id)).map(g => g.name).join(', ');
    setConfirmTitle("Confirm Assignment");
    setConfirmButtonText("Assign Subjects");
    setConfirmMessage(`Assign ${selectedSubjectsForTeacher.length} subject(s) to ${teacher?.name || 'teacher'} for grade(s): ${gradeNames}`);
    setConfirmAction(() => assignSubjectsToTeacher);
    setShowConfirmDialog(true);
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
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
          <TabsList className="grid w-full grid-cols-4 glass p-1 h-auto gap-1">
            <TabsTrigger value="student-class" className="text-xs sm:text-sm px-1 sm:px-3">
              Student-Class
            </TabsTrigger>
            <TabsTrigger value="teacher-class" className="text-xs sm:text-sm px-1 sm:px-3">
              Teacher-Class
            </TabsTrigger>
            <TabsTrigger value="teacher-subject" className="text-xs sm:text-sm px-1 sm:px-3">
              Teacher-Subject
            </TabsTrigger>
            <TabsTrigger value="view-manage" className="text-xs sm:text-sm px-1 sm:px-3">
              View & Manage
            </TabsTrigger>
          </TabsList>

          {/* Student-Class Assignment Tab */}
          <TabsContent value="student-class">
            <Card className="glass-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" /> Assign Students to Classes
                </h2>
                <Badge variant="secondary" className="text-sm">
                  {studentClassCombinations} assignment{studentClassCombinations !== 1 ? 's' : ''}
                </Badge>
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
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
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
                                <div className="mt-1 flex items-center gap-2">
                                  {s.student_details?.classes?.name ? (
                                    <>
                                      <Badge variant="outline" className="text-xs">
                                        {s.student_details.classes.name}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                        Already assigned
                                      </Badge>
                                    </>
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
                  </ScrollArea>
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
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {selectedStudents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No students selected</p>
                          <p className="text-xs mt-1">👉 Click on students from the left to select them</p>
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
                  </ScrollArea>
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
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
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
                            onClick={() => setSelectedClassForStudents(c.id)}
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
                                  setSelectedClassForStudents(c.id);
                                }}
                              >
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </Card>

                <Card className="glass-card p-4 border-2 border-green-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Selected Class
                    </h3>
                    {selectedClassForStudents && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedClassForStudents("")}
                        className="text-xs"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {!selectedClassForStudents ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No class selected</p>
                          <p className="text-xs mt-1">💡 Select one class to assign students</p>
                        </div>
                      ) : selectedClassForStudentsData ? (
                        <Card className="p-3 border border-green-500/30 bg-green-500/5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="font-medium text-sm truncate">{selectedClassForStudentsData.name}</p>
                              {selectedClassForStudentsData.grade_levels?.name && (
                                <p className="text-xs text-muted-foreground truncate">{selectedClassForStudentsData.grade_levels.name}</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="shrink-0 text-destructive hover:text-destructive"
                              onClick={() => setSelectedClassForStudents("")}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ) : null}
                    </div>
                  </ScrollArea>
                </Card>
              </div>

              {/* Action Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-border gap-4">
                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Total assignments: <span className="font-semibold text-foreground">{studentClassCombinations}</span>
                  </p>
                  <p className="text-xs mt-1">
                    All selected students will be assigned to the selected class
                  </p>
                </div>
                <Button
                  onClick={handleStudentAssignClick}
                  disabled={assigningStudent || selectedStudents.length === 0 || !selectedClassForStudents}
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
                <Badge variant="secondary" className="text-sm">
                  {teacherClassCombinations} assignment{teacherClassCombinations !== 1 ? 's' : ''}
                </Badge>
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
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {availableTeachers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            {teacherAssignSearch ? "No teachers match your search" : "All teachers selected"}
                          </p>
                        </div>
                      ) : (
                        availableTeachers.map((t) => {
                          // Get current classes for this teacher
                          const currentClasses = teacherClasses
                            .filter(tc => tc.teacher_id === t.id)
                            .map(tc => tc.classes?.name)
                            .filter(Boolean);
                          
                          return (
                            <Card
                              key={t.id}
                              className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50"
                              onClick={() => {
                                if (!selectedTeachers.includes(t.id)) {
                                  setSelectedTeachers([...selectedTeachers, t.id]);
                                }
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{t.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                                  {currentClasses.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {currentClasses.map((className, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {className}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
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
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
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
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {selectedTeachers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No teachers selected</p>
                          <p className="text-xs mt-1">👉 Click on teachers from the left to select them</p>
                        </div>
                      ) : (
                        selectedTeachersData.map((t) => {
                          // Get current classes for this teacher
                          const currentClasses = teacherClasses
                            .filter(tc => tc.teacher_id === t.id)
                            .map(tc => tc.classes?.name)
                            .filter(Boolean);
                          
                          return (
                            <Card
                              key={t.id}
                              className="p-3 border border-green-500/30 bg-green-500/5"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{t.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                                  {currentClasses.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {currentClasses.map((className, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {className}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
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
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
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
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {availableClassesForTeachers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">All classes selected</p>
                        </div>
                      ) : (
                        availableClassesForTeachers.map((c) => (
                          <Card
                            key={c.id}
                            className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50"
                            onClick={() => {
                              if (!selectedClassesForTeachers.includes(c.id)) {
                                setSelectedClassesForTeachers([...selectedClassesForTeachers, c.id]);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
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
                  </ScrollArea>
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
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {selectedClassesForTeachers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No classes selected</p>
                          <p className="text-xs mt-1">💡 Select classes to assign teachers</p>
                        </div>
                      ) : (
                        selectedClassesForTeachersData.map((c) => (
                          <Card
                            key={c.id}
                            className="p-3 border border-green-500/30 bg-green-500/5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
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
                  </ScrollArea>
                </Card>
              </div>

              {/* Action Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-border gap-4">
                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Total assignments: <span className="font-semibold text-foreground">{teacherClassCombinations}</span>
                  </p>
                  <p className="text-xs mt-1">Each selected teacher will be assigned to each selected class</p>
                </div>
                <Button
                  onClick={handleTeacherAssignClick}
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
                    {selectedSubjectsForTeacher.length} Subject{selectedSubjectsForTeacher.length !== 1 ? 's' : ''} × {selectedGradeLevels.length} Grade{selectedGradeLevels.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <div className="space-y-6">
                {/* Teacher Selection with Search */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Select Teacher</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Input
                        placeholder="Search teachers..."
                        value={teacherSubjectSearch}
                        onChange={(e) => setTeacherSubjectSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select
                      value={selectedTeacherForSubject}
                      onValueChange={(value) => {
                        setSelectedTeacherForSubject(value);
                        setSelectedSubjectsForTeacher([]);
                        setSelectedGradeLevels([]);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a teacher..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-72">
                          {filteredTeachersForSubject.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.email})
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>

                    {selectedTeacherForSubject && (
                      <div className="mt-4 p-4 rounded-xl bg-secondary/20 border border-border">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" /> Current Subject Assignments
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {teacherSubjects
                            .filter(ts => ts.teacher_id === selectedTeacherForSubject)
                            .map((ts, idx) => (
                              <Badge key={idx} variant="secondary" className="px-2 py-1 flex items-center gap-2 group">
                                <span>{ts.grade_subjects?.subjects_master?.name} ({ts.grade_subjects?.grade_levels?.name})</span>
                                <Trash2 
                                  className="w-3 h-3 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if(confirm(`Are you sure you want to remove ${ts.grade_subjects?.subjects_master?.name} assignment?`)) {
                                      try {
                                        await academicService.deleteTeacherSubject(ts.id);
                                        toast.success("Assignment removed");
                                        queryClient.invalidateQueries({ queryKey: ['assignments-teacherSubjects'] });
                                      } catch (err) {
                                        toast.error("Failed to remove assignment");
                                      }
                                    }
                                  }}
                                />
                              </Badge>
                            ))}
                          {teacherSubjects.filter(ts => ts.teacher_id === selectedTeacherForSubject).length === 0 && (
                            <p className="text-xs text-muted-foreground italic">No subjects assigned yet.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTeacherForSubject && (
                  <>
                    {/* Grade Level Selection */}
                    <div>
                      <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-primary" />
                        Select Grade Level(s) <span className="text-destructive">*</span>
                      </Label>
                      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-3">
                        <p className="text-sm text-muted-foreground">
                          💡 <strong>Important:</strong> Select specific grade levels for this teacher. Subjects will only be assigned for the selected grades.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {gradeLevels.map((grade) => (
                          <Button
                            key={grade.id}
                            variant={selectedGradeLevels.includes(String(grade.id)) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              const gradeIdStr = String(grade.id);
                              if (selectedGradeLevels.includes(gradeIdStr)) {
                                setSelectedGradeLevels(selectedGradeLevels.filter(id => id !== gradeIdStr));
                              } else {
                                setSelectedGradeLevels([...selectedGradeLevels, gradeIdStr]);
                              }
                            }}
                            className="text-xs"
                          >
                            {grade.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {selectedGradeLevels.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Available Subjects */}
                        <Card className="glass-card p-4 border-2 border-primary/20">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-primary" /> Available Subjects
                            </h3>
                            <Badge variant="outline">
                              {availableSubjectsForTeacher.length} available
                            </Badge>
                          </div>
                          {availableSubjectsForTeacher.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mb-2 text-xs"
                              onClick={() => {
                                const availableIds = availableSubjectsForTeacher.map((s) => s.id);
                                setSelectedSubjectsForTeacher([...selectedSubjectsForTeacher, ...availableIds]);
                              }}
                            >
                              Select All ({availableSubjectsForTeacher.length})
                            </Button>
                          )}
                          <ScrollArea className="h-96">
                            <div className="space-y-2">
                              {availableSubjectsForTeacher.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">All subjects selected</p>
                                </div>
                              ) : (
                                availableSubjectsForTeacher.map((subject) => (
                                  <Card
                                    key={subject.id}
                                    className="p-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all border border-border/50"
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
                          </ScrollArea>
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
                          <ScrollArea className="h-96">
                            <div className="space-y-2">
                              {selectedSubjectsForTeacher.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No subjects selected</p>
                                  <p className="text-xs mt-1">👉 Click on subjects from the left to select them</p>
                                </div>
                              ) : (
                                selectedSubjectsData.map((subject) => (
                                  <Card
                                    key={subject.id}
                                    className="p-3 border border-green-500/30 bg-green-500/5"
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
                          </ScrollArea>
                        </Card>
                      </div>
                    )}
                  </>
                )}

                {/* Action Button */}
                {selectedTeacherForSubject && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-border gap-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Selected teacher: <span className="font-semibold text-foreground">
                          {teachers.find((t) => t.id === selectedTeacherForSubject)?.name}
                        </span>
                      </p>
                      <p className="text-xs mt-1">
                        {selectedSubjectsForTeacher.length > 0 && selectedGradeLevels.length > 0
                          ? `Ready to assign ${selectedSubjectsForTeacher.length} subject${selectedSubjectsForTeacher.length !== 1 ? 's' : ''} for ${selectedGradeLevels.length} grade${selectedGradeLevels.length !== 1 ? 's' : ''}`
                          : "Select grade levels and subjects to assign"}
                      </p>
                    </div>
                    <Button
                      onClick={handleSubjectAssignClick}
                      disabled={assigningSubjects || selectedSubjectsForTeacher.length === 0 || selectedGradeLevels.length === 0}
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

          {/* View & Manage Tab */}
          <TabsContent value="view-manage">
            <div className="space-y-6">
              {/* Student-Class Assignments */}
              <Card className="glass-card p-4 sm:p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                  <UserPlus className="w-5 h-5 text-primary" /> Student-Class Assignments
                </h2>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students or classes..."
                        value={vmStudentSearch}
                        onChange={(e) => setVmStudentSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={vmStudentClassFilter} onValueChange={setVmStudentClassFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredVmStudents.length > 0 && (
                  <div className="flex items-center justify-between p-3 glass border border-primary/20 rounded-xl mb-6 shadow-lg shadow-primary/5">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id="select-all-students"
                        checked={selectedVmStudents.length === filteredVmStudents.length && filteredVmStudents.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVmStudents(filteredVmStudents.map(s => s.id));
                          } else {
                            setSelectedVmStudents([]);
                          }
                        }}
                      />
                      <Label htmlFor="select-all-students" className="text-sm font-semibold cursor-pointer select-none">
                        {selectedVmStudents.length} of {filteredVmStudents.length} selected
                      </Label>
                    </div>
                    <div className="flex gap-2">
                       {selectedVmStudents.length > 0 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            setConfirmTitle("Confirm Bulk Removal");
                            setConfirmButtonText("Remove Students");
                            setConfirmMessage(`Are you sure you want to bulk remove ${selectedVmStudents.length} students from their classes?`);
                            setConfirmAction(() => bulkRemoveStudentsFromClasses);
                            setShowConfirmDialog(true);
                          }}
                          disabled={isBulkRemovingStudents}
                        >
                          {isBulkRemovingStudents ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                          Remove Selected
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedVmStudents([])}
                        disabled={selectedVmStudents.length === 0}
                      >
                        Unselect All
                      </Button>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredVmStudents.length === 0 ? (
                      <div className="text-center py-16 glass-card border-dashed border-2 border-border/50">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <Users className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                          <p className="text-base font-medium">No student assignments found</p>
                          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                            {vmStudentSearch || vmStudentClassFilter !== "all" 
                              ? "Try adjusting your filters or search terms" 
                              : "Get started by assigning students to classes in the 'Student-Class' tab"}
                          </p>
                        </motion.div>
                      </div>
                    ) : (
                      filteredVmStudents.map((student) => (
                          <Card key={student.id} className={`group p-3 border transition-all duration-300 ${selectedVmStudents.includes(student.id) ? 'border-primary ring-1 ring-primary/20 bg-primary/10' : 'border-border/50 hover:border-primary/40 hover:bg-secondary/20'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="mt-1">
                                  <Checkbox
                                    checked={selectedVmStudents.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedVmStudents([...selectedVmStudents, student.id]);
                                      } else {
                                        setSelectedVmStudents(selectedVmStudents.filter(id => id !== student.id));
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{student.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {student.student_details?.classes?.name || 'Unknown Class'}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setConfirmTitle("Confirm Removal");
                                  setConfirmButtonText("Remove Student");
                                  setConfirmMessage(`Are you sure you want to remove ${student.name} from class ${student.student_details?.classes?.name}?`);
                                  setConfirmAction(() => async () => {
                                    try {
                                      await userService.unassignStudentFromClass(student.id);
                                      toast.success(`${student.name} removed from class`);
                                      queryClient.invalidateQueries({ queryKey: ['assignments-students'] });
                                    } catch (error: any) {
                                      toast.error(error.message || 'Failed to remove student');
                                    }
                                  });
                                  setShowConfirmDialog(true);
                                }}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </Card>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </Card>

              {/* Teacher-Class Assignments */}
              <Card className="glass-card p-4 sm:p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-primary" /> Teacher-Class Assignments
                </h2>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search teachers or classes..."
                        value={vmTeacherClassSearch}
                        onChange={(e) => setVmTeacherClassSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={vmTeacherClassFilter} onValueChange={setVmTeacherClassFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredVmTeacherClasses.length > 0 && (
                  <div className="flex items-center justify-between p-3 glass border border-primary/20 rounded-xl mb-6 shadow-lg shadow-primary/5">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id="select-all-tc"
                        checked={selectedVmTeacherClasses.length === filteredVmTeacherClasses.length && filteredVmTeacherClasses.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVmTeacherClasses(filteredVmTeacherClasses.map(tc => tc.id));
                          } else {
                            setSelectedVmTeacherClasses([]);
                          }
                        }}
                      />
                      <Label htmlFor="select-all-tc" className="text-sm font-semibold cursor-pointer select-none">
                        {selectedVmTeacherClasses.length} of {filteredVmTeacherClasses.length} selected
                      </Label>
                    </div>
                    <div className="flex gap-2">
                       {selectedVmTeacherClasses.length > 0 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            setConfirmTitle("Confirm Bulk Removal");
                            setConfirmButtonText("Remove Assignments");
                            setConfirmMessage(`Are you sure you want to bulk remove ${selectedVmTeacherClasses.length} teacher-class assignments?`);
                            setConfirmAction(() => bulkRemoveTeacherClasses);
                            setShowConfirmDialog(true);
                          }}
                          disabled={isBulkRemovingTeacherClasses}
                        >
                          {isBulkRemovingTeacherClasses ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                          Remove Selected
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedVmTeacherClasses([])}
                        disabled={selectedVmTeacherClasses.length === 0}
                      >
                        Unselect All
                      </Button>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredVmTeacherClasses.length === 0 ? (
                      <div className="text-center py-16 glass-card border-dashed border-2 border-border/50">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <Users className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                          <p className="text-base font-medium">No teacher-class assignments found</p>
                          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                            {vmTeacherClassSearch || vmTeacherClassFilter !== "all" 
                              ? "Try adjusting your filters or search terms" 
                              : "Get started by assigning teachers to classes in the 'Teacher-Class' tab"}
                          </p>
                        </motion.div>
                      </div>
                    ) : (
                      filteredVmTeacherClasses.map((tc) => (
                          <Card key={tc.id} className={`group p-3 border transition-all duration-300 ${selectedVmTeacherClasses.includes(tc.id) ? 'border-primary ring-1 ring-primary/20 bg-primary/10' : 'border-border/50 hover:border-primary/40 hover:bg-secondary/20'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="mt-1">
                                  <Checkbox
                                    checked={selectedVmTeacherClasses.includes(tc.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedVmTeacherClasses([...selectedVmTeacherClasses, tc.id]);
                                      } else {
                                        setSelectedVmTeacherClasses(selectedVmTeacherClasses.filter(id => id !== tc.id));
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{tc.profiles?.name || 'Unknown Teacher'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{tc.profiles?.email}</p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {tc.classes?.name || 'Unknown Class'}
                                  </Badge>
                                </div>
                              </div>
                            <Button
                              size="sm"
                              variant="destructive"
                                onClick={() => {
                                  setConfirmTitle("Confirm Removal");
                                  setConfirmButtonText("Remove Assignment");
                                  setConfirmMessage(`Are you sure you want to remove ${tc.profiles?.name} from class ${tc.classes?.name}?`);
                                  setConfirmAction(() => async () => {
                                    try {
                                      await academicService.deleteTeacherClass(tc.id);
                                      toast.success('Teacher removed from class');
                                      queryClient.invalidateQueries({ queryKey: ['assignments-teacherClasses'] });
                                    } catch (error: any) {
                                      toast.error(error.message || 'Failed to remove assignment');
                                    }
                                  });
                                  setShowConfirmDialog(true);
                                }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Card>

              {/* Teacher-Subject Assignments */}
              <Card className="glass-card p-4 sm:p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-primary" /> Teacher-Subject Assignments
                </h2>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                  <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search teachers, subjects, or grades..."
                        value={vmTeacherSubjectSearch}
                        onChange={(e) => setVmTeacherSubjectSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={vmTeacherSubjectGradeFilter} onValueChange={setVmTeacherSubjectGradeFilter}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="All Grades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {gradeLevels.map((g: any) => (
                          <SelectItem key={g.id} value={String(g.id)}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {filteredVmTeacherSubjects.length > 0 && (
                  <div className="flex items-center justify-between p-3 glass border border-primary/20 rounded-xl mb-6 shadow-lg shadow-primary/5">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        id="select-all-ts"
                        checked={selectedVmTeacherSubjects.length === filteredVmTeacherSubjects.length && filteredVmTeacherSubjects.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedVmTeacherSubjects(filteredVmTeacherSubjects.map((ts: any) => ts.id));
                          } else {
                            setSelectedVmTeacherSubjects([]);
                          }
                        }}
                      />
                      <Label htmlFor="select-all-ts" className="text-sm font-semibold cursor-pointer select-none">
                        {selectedVmTeacherSubjects.length} of {filteredVmTeacherSubjects.length} selected
                      </Label>
                    </div>
                    <div className="flex gap-2">
                       {selectedVmTeacherSubjects.length > 0 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            setConfirmTitle("Confirm Bulk Removal");
                            setConfirmButtonText("Remove Assignments");
                            setConfirmMessage(`Are you sure you want to bulk remove ${selectedVmTeacherSubjects.length} teacher-subject assignments?`);
                            setConfirmAction(() => bulkRemoveTeacherSubjects);
                            setShowConfirmDialog(true);
                          }}
                          disabled={isBulkRemovingTeacherSubjects}
                        >
                          {isBulkRemovingTeacherSubjects ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                          Remove Selected
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedVmTeacherSubjects([])}
                        disabled={selectedVmTeacherSubjects.length === 0}
                      >
                        Unselect All
                      </Button>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredVmTeacherSubjects.length === 0 ? (
                      <div className="text-center py-16 glass-card border-dashed border-2 border-border/50">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <BookOpen className="w-16 h-16 mx-auto mb-4 text-primary/30" />
                          <p className="text-base font-medium">No teacher-subject assignments found</p>
                          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                            {vmTeacherSubjectSearch || vmTeacherSubjectGradeFilter !== "all" 
                              ? "Try adjusting your filters or search terms" 
                              : "Get started by assigning subjects to teachers in the 'Teacher-Subject' tab"}
                          </p>
                        </motion.div>
                      </div>
                    ) : (
                      filteredVmTeacherSubjects.map((ts: any) => {
                        const teacher = teachers.find(t => t.id === ts.teacher_id);
                        return (
                          <Card key={ts.id} className={`group p-3 border transition-all duration-300 ${selectedVmTeacherSubjects.includes(ts.id) ? 'border-primary ring-1 ring-primary/20 bg-primary/10' : 'border-border/50 hover:border-primary/40 hover:bg-secondary/20'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className="mt-1">
                                  <Checkbox
                                    checked={selectedVmTeacherSubjects.includes(ts.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedVmTeacherSubjects([...selectedVmTeacherSubjects, ts.id]);
                                      } else {
                                        setSelectedVmTeacherSubjects(selectedVmTeacherSubjects.filter(id => id !== ts.id));
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{teacher?.name || 'Unknown Teacher'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{teacher?.email}</p>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    <Badge variant="outline" className="text-xs">
                                      {ts.grade_subjects?.subjects_master?.name || 'Unknown Subject'}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {ts.grade_subjects?.grade_levels?.name || 'Unknown Grade'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setConfirmTitle("Confirm Removal");
                                  setConfirmButtonText("Remove Assignment");
                                  setConfirmMessage(`Are you sure you want to remove ${teacher?.name} from ${ts.grade_subjects?.subjects_master?.name} (${ts.grade_subjects?.grade_levels?.name})?`);
                                  setConfirmAction(() => async () => {
                                    try {
                                      await academicService.deleteTeacherSubject(ts.id);
                                      toast.success('Teacher removed from subject');
                                      queryClient.invalidateQueries({ queryKey: ['assignments-teacherSubjects'] });
                                    } catch (error: any) {
                                      toast.error(error.message || 'Failed to remove assignment');
                                    }
                                  });
                                  setShowConfirmDialog(true);
                                }}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {confirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className={confirmTitle.includes("Removal") ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => {
                confirmAction();
                setShowConfirmDialog(false);
              }}
            >
              {confirmButtonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{confirmTitle.includes("Removal") ? "Removal Results" : "Assignment Results"}</DialogTitle>
            <DialogDescription>
              Review the results of your {confirmTitle.includes("Removal") ? "removal" : "assignment"} operation
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {assignmentResults && (
                <>
                  {/* Success */}
                  {assignmentResults.success.length > 0 && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold text-green-500">
                          Successfully {confirmTitle.includes("Removal") ? "Removed" : "Assigned"} ({assignmentResults.success.length})
                        </h3>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {assignmentResults.success.map((item) => (
                          <p key={item.id} className="text-sm text-muted-foreground">
                            • {item.name}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skipped */}
                  {assignmentResults.skipped.length > 0 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-semibold text-yellow-500">
                          Skipped ({assignmentResults.skipped.length})
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {assignmentResults.skipped.map((item) => (
                          <div key={item.id} className="text-sm">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Failed */}
                  {assignmentResults.failed.length > 0 && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <X className="w-5 h-5 text-red-500" />
                        <h3 className="font-semibold text-red-500">
                          Failed ({assignmentResults.failed.length})
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {assignmentResults.failed.map((item) => (
                          <div key={item.id} className="text-sm">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowResultsDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
