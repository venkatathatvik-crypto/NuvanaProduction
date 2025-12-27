import { motion } from "framer-motion";
import { ArrowLeft, Upload, Save, Award, CheckCircle, Users, FileText, Edit, Search, Filter, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getExamTypes,
  getSubjects,
  getTeacherClasses,
  getTeacherGradingQueue,
  getTestSubmissionsForGrading,
  finalizeSubmissionGrading,
  createNotification,
  sendGradeEmail,
  GradingQueueItem,
  SubmissionToGrade,
  getStudentsInClass,
  ClassStudentInfo,
  saveManualMarks,
  getGradeSubjectIdBySubjectName,
  getExamTypeIdByName,
} from "@/services/academic";
import { FlattenedClass } from "@/schemas/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

const TeacherMarks = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, profileLoading } = useAuth();
  const queryClient = useQueryClient();

  // --- STATE INITIALIZATION ---
  const [subjects, setSubjects] = useState<string[]>([]);

  // State for selected objects
  const [selectedClass, setSelectedClass] = useState<FlattenedClass | undefined>(undefined);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [examType, setExamType] = useState("");

  // Real students from database
  const [classStudents, setClassStudents] = useState<ClassStudentInfo[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Test-based grading state
  const [selectedTestId, setSelectedTestId] = useState<string | null>(searchParams.get("testId"));
  const [submissions, setSubmissions] = useState<SubmissionToGrade[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [localGrades, setLocalGrades] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "graded">("all");

  // --- MANUAL ENTRY STATE ---
  const [manualTitle, setManualTitle] = useState("");
  const [manualMaxMarks, setManualMaxMarks] = useState(100);
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [manualSaving, setManualSaving] = useState(false);

  // Fetch teacher's classes using React Query
  const { data: classes = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.teacher.classes(profile?.id ?? '', profile?.school_id ?? ''),
    queryFn: async () => {
      if (!profile?.id || !profile?.school_id) return [];
      return await getTeacherClasses(profile.id, profile.school_id);
    },
    enabled: !!profile?.id && !!profile?.school_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch exam types using React Query
  const { data: examTypes = [] } = useQuery({
    queryKey: ['exam-types', profile?.school_id ?? ''],
    queryFn: async () => {
      if (!profile?.school_id) return [];
      return await getExamTypes(profile.school_id);
    },
    enabled: !!profile?.school_id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch grading queue using React Query
  const { data: gradingQueue = [] } = useQuery({
    queryKey: queryKeys.teacher.gradingQueue(profile?.id ?? ''),
    queryFn: async () => {
      if (!profile?.id) return [];
      return await getTeacherGradingQueue(profile.id);
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Set first class and exam type when data is loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]);
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (examTypes.length > 0 && !examType) {
      setExamType(examTypes[0]);
    }
  }, [examTypes, examType]);

  // --- EFFECT 2: LOAD STUDENTS WHEN CLASS CHANGES ---
  useEffect(() => {
    const fetchStudentsAndSubjects = async () => {
      if (!selectedClass) return;

      setStudentsLoading(true);
      try {
        const [studentsData, subjectsData] = await Promise.all([
          getStudentsInClass(selectedClass.class_id),
          getSubjects(selectedClass.grade_id),
        ]);

        setClassStudents(studentsData);
        
        if (subjectsData) {
          setSubjects(subjectsData);
          if (subjectsData.length > 0) {
            setSelectedSubject(subjectsData[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching students/subjects:", error);
        toast.error("Failed to load students");
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudentsAndSubjects();
  }, [selectedClass]);

  // --- EFFECT 3: LOAD SUBMISSIONS WHEN TEST IS SELECTED ---
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedTestId) {
        setSubmissions([]);
        return;
      }

      setGradingLoading(true);
      try {
        if (!profile) return;
        const subs = await getTestSubmissionsForGrading(selectedTestId, profile.id);
        setSubmissions(subs);
        
        // Auto-select first ungraded submission (pass subs directly since state update is async)
        const firstUngraded = subs.find(s => !s.isGraded);
        if (firstUngraded) {
          handleSelectSubmission(firstUngraded.submissionId, subs);
        } else if (subs.length > 0) {
          handleSelectSubmission(subs[0].submissionId, subs);
        }
      } catch (error) {
        console.error("Error fetching submissions:", error);
        toast.error("Failed to load submissions");
      } finally {
        setGradingLoading(false);
      }
    };

    fetchSubmissions();
  }, [selectedTestId]);

  // --- HANDLERS ---
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const cls = classes.find((c) => c.class_id === classId);
    if (cls) setSelectedClass(cls);
  };

  const handleSelectSubmission = (submissionId: string, submissionsList?: typeof submissions) => {
    setSelectedSubmissionId(submissionId);
    const list = submissionsList || submissions;
    const submission = list.find(s => s.submissionId === submissionId);
    if (submission) {
      const grades: Record<string, number> = {};
      submission.answers.forEach(a => {
        grades[a.answerId] = a.marksAwarded;
      });
      setLocalGrades(grades);
    }
  };

  const handleGradeChange = (answerId: string, marks: number, maxMarks: number) => {
    const clampedMarks = Math.min(Math.max(0, marks), maxMarks);
    setLocalGrades(prev => ({ ...prev, [answerId]: clampedMarks }));
  };

  const handleSaveGrades = async () => {
    if (!selectedSubmissionId || !profile) return;

    setGradingLoading(true);
    try {
      // Prepare answers array for grading
      const answers = Object.entries(localGrades).map(([answerId, marks]) => ({
        answer_id: answerId,
        marks_awarded: marks,
      }));

      // Grade all answers at once
      await finalizeSubmissionGrading(selectedSubmissionId, profile.id, answers);

      // Send notification to the student
      const gradedSubmission = submissions.find(s => s.submissionId === selectedSubmissionId);
      if (gradedSubmission && profile) {
        const selectedTest = gradingQueue.find(t => t.testId === selectedTestId);
        const testTitle = selectedTest?.testTitle || 'a test';

        try {
          await createNotification({
            recipient_id: gradedSubmission.studentId,
            school_id: profile.school_id,
            title: "Test Graded",
            message: `Your submission for "${testTitle}" has been graded.`,
            notification_type: "grade",
            target_url: "/student/marks",
          });
        } catch (notifError) {
          console.error("Failed to send notification:", notifError);
        }

        // Send email notification
        try {
          if (gradedSubmission.studentEmail) {
            await sendGradeEmail(gradedSubmission.studentEmail, testTitle);
          }
        } catch (emailError) {
          console.error("Failed to send email:", emailError);
        }
      }

      toast.success("Grades saved successfully!");

      // Invalidate queries to reflect new grades across student & teacher views
      queryClient.invalidateQueries({ queryKey: ["student-marks"] });
      queryClient.invalidateQueries({ queryKey: ["student-marks-percent"] });
      queryClient.invalidateQueries({ queryKey: ["student-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["student-analytics-stats"] });
      queryClient.invalidateQueries({ queryKey: ["student-analytics-subjects"] });
      queryClient.invalidateQueries({ queryKey: ["student-analytics-trend"] });
      queryClient.invalidateQueries({ queryKey: ["student-analytics-sw"] });
      queryClient.invalidateQueries({ queryKey: ["student-analytics-ct"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["test-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-test-details"] });
      queryClient.invalidateQueries({ queryKey: ["student-tests"] });

      // Refresh submissions
      if (selectedTestId && profile) {
        const subs = await getTestSubmissionsForGrading(selectedTestId, profile.id);
        setSubmissions(subs);

        // Move to next ungraded (pass subs directly since state update is async)
        const nextUngraded = subs.find(s => !s.isGraded);
        if (nextUngraded) {
          handleSelectSubmission(nextUngraded.submissionId, subs);
          toast.success("Grades saved! Moving to next student.");
        } else {
          // If no more ungraded, stay on current but show success
          toast.success("All submissions graded!");
        }

        // Refresh grading queue
        queryClient.invalidateQueries({ queryKey: queryKeys.teacher.gradingQueue(profile.id) });
      }
    } catch (error: any) {
      console.error("Error saving grades:", error);
      toast.error(error.message || "Failed to save grades");
    } finally {
      setGradingLoading(false);
    }
  };

  const handleManualScoreChange = (studentId: string, score: number) => {
    setManualScores(prev => ({
      ...prev,
      [studentId]: Math.min(Math.max(0, score), manualMaxMarks)
    }));
  };

  const handlePublishManualMarks = async () => {
    if (!profile) return;
    if (!manualTitle) {
      toast.error("Please enter an assessment title");
      return;
    }
    if (!selectedClass || !selectedSubject || !examType) {
      toast.error("Please select class, subject and exam type");
      return;
    }

    const marks = classStudents.map(student => ({
      student_id: student.id,
      marks_obtained: manualScores[student.id] || 0
    }));

    if (marks.length === 0) {
      toast.error("No students to grade");
      return;
    }

    setManualSaving(true);
    try {
      // Find the exam type ID and grade subject ID first
      const [gradeSubjectId, examTypeId] = await Promise.all([
        getGradeSubjectIdBySubjectName(selectedClass.class_id, selectedSubject),
        getExamTypeIdByName(examType)
      ]);

      if (!gradeSubjectId || !examTypeId) {
        toast.error("Failed to resolve assessment metadata");
        return;
      }

      await saveManualMarks({
        title: manualTitle,
        classId: selectedClass.class_id,
        gradeSubjectId,
        examTypeId: Number(examTypeId),
        maxMarks: manualMaxMarks,
        marks,
        description: `Manual entry: ${manualTitle}`
      });

      toast.success("Marks published successfully!");
      setManualTitle("");
      setManualScores({});
      
      // Invalidate queries to update analytics
      queryClient.invalidateQueries({ queryKey: ["student-marks"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-analytics"] });
      
      // Refresh grading queue
      queryClient.invalidateQueries({ queryKey: queryKeys.teacher.gradingQueue(profile.id) });
    } catch (error: any) {
      console.error("Error publishing manual marks:", error);
      toast.error(error.message || "Failed to publish marks");
    } finally {
      setManualSaving(false);
    }
  };

  const getSelectedSubmission = (): SubmissionToGrade | undefined => {
    return submissions.find(s => s.submissionId === selectedSubmissionId);
  };

  const calculateLocalTotal = (): number => {
    return Object.values(localGrades).reduce((sum, marks) => sum + marks, 0);
  };

  const handleNextSubmission = () => {
    const currentIndex = submissions.findIndex(s => s.submissionId === selectedSubmissionId);
    if (currentIndex < submissions.length - 1) {
      handleSelectSubmission(submissions[currentIndex + 1].submissionId);
    } else {
      toast.info("This is the last student.");
    }
  };

  const handlePrevSubmission = () => {
    const currentIndex = submissions.findIndex(s => s.submissionId === selectedSubmissionId);
    if (currentIndex > 0) {
      handleSelectSubmission(submissions[currentIndex - 1].submissionId);
    } else {
      toast.info("This is the first student.");
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (s.studentRollNo && s.studentRollNo.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "pending" && !s.isGraded) || 
                         (filterStatus === "graded" && s.isGraded);
    return matchesSearch && matchesFilter;
  });

  const getSelectedTest = (): GradingQueueItem | undefined => {
    return gradingQueue.find(t => t.testId === selectedTestId);
  };

  // --- LOADING STATE ---
  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!selectedClass && classes.length === 0) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="glass-card p-8 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">No Classes Assigned</h2>
          <p className="text-muted-foreground">You don't have any classes assigned yet.</p>
        </Card>
      </div>
    );
  }

  const selectedSubmission = getSelectedSubmission();
  const selectedTest = getSelectedTest();

  // Check if classes were loaded but no class was selected (should only happen if classes are empty)
  if (!selectedClass) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center text-xl font-semibold text-destructive">
        No classes available or assigned.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")} className="shrink-0">
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="min-w-0">
            <h1 className="text-xl sm:text-4xl font-bold neon-text truncate">Grade Tests</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Grade student test submissions</p>
          </motion.div>
        </div>

        <Tabs defaultValue="questionwise" className="w-full">
          <TabsList className="grid w-full grid-cols-1 h-auto">
            <TabsTrigger value="questionwise" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
              <span className="hidden sm:inline">Question-wise Grading</span>
              <span className="sm:hidden">Grade</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
              <span className="hidden sm:inline">Manual Entry</span>
              <span className="sm:hidden">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
              <span className="hidden sm:inline">Bulk Upload</span>
              <span className="sm:hidden">Bulk</span>
            </TabsTrigger>
          </TabsList>

          {/* Question-wise Grading Tab - Main Grading Flow */}
          <TabsContent value="questionwise" className="space-y-6 mt-6">
            {/* Test Selection / Test Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {!selectedTestId ? (
                <Card className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Select Test to Grade
                  </h2>
                  
                  {gradingQueue.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No tests with pending submissions.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {gradingQueue.map((test) => (
                        <div
                          key={test.testId}
                          onClick={() => setSelectedTestId(test.testId)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedTestId === test.testId
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <h3 className="font-semibold truncate">{test.testTitle}</h3>
                          <p className="text-sm text-muted-foreground">{test.className}</p>
                          {test.subjectName && (
                            <Badge variant="outline" className="mt-2">{test.subjectName}</Badge>
                          )}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Graded</span>
                              <span>{test.gradedCount}/{test.totalSubmissions}</span>
                            </div>
                            <Progress value={(test.gradedCount / test.totalSubmissions) * 100} className="h-2" />
                          </div>
                          {test.pendingCount > 0 && (
                            <Badge className="mt-2 bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                              {test.pendingCount} Pending
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="glass-card p-4 border-primary/30 bg-primary/5">
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="font-bold text-lg leading-tight">{selectedTest?.testTitle}</h2>
                          <p className="text-xs text-muted-foreground">{selectedTest?.className} • {selectedTest?.subjectName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Overall Progress</span>
                              <span className="text-xs font-bold text-primary">{selectedTest ? Math.round((selectedTest.gradedCount / selectedTest.totalSubmissions) * 100) : 0}%</span>
                           </div>
                           <Progress value={selectedTest ? (selectedTest.gradedCount / selectedTest.totalSubmissions) * 100 : 0} className="h-1.5 w-32" />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedTestId(null)} className="h-8 glass">
                          Change Test
                        </Button>
                      </div>
                   </div>
                </Card>
              )}
            </motion.div>

            {/* Master-Detail Partition */}
            {selectedTestId && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[600px]">
                {/* Master: Student List Sidebar */}
                <Card className="lg:col-span-3 flex flex-col h-full overflow-hidden glass-card">
                  <div className="p-4 border-b border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Students ({submissions.length})
                      </h3>
                      <div className="flex gap-1">
                        <Button 
                          variant={filterStatus === "all" ? "secondary" : "ghost"} 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setFilterStatus("all")}
                          title="Show All"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant={filterStatus === "pending" ? "secondary" : "ghost"} 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setFilterStatus("pending")}
                          title="Show Pending"
                        >
                          <Filter className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search student..."
                        className="pl-9 h-9 text-xs"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                    {gradingLoading ? (
                      <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-12 w-full bg-muted/30 animate-pulse rounded-md" />
                        ))}
                      </div>
                    ) : filteredSubmissions.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No students found.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredSubmissions.map((sub) => (
                          <button
                            key={sub.submissionId}
                            onClick={() => handleSelectSubmission(sub.submissionId)}
                            className={`w-full text-left p-3 rounded-md transition-all flex items-center gap-3 relative ${
                              selectedSubmissionId === sub.submissionId
                                ? "bg-primary/20 ring-1 ring-primary/50"
                                : sub.isGraded
                                ? "hover:bg-green-500/5 bg-green-500/5"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              sub.isGraded ? "bg-green-500/20 text-green-500" : "bg-primary/10 text-primary"
                            }`}>
                              {sub.studentRollNo || "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate leading-tight">{sub.studentName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {sub.isGraded ? (
                                  <span className="text-[10px] font-bold text-green-500">{sub.totalMarksObtained} pts</span>
                                ) : (
                                  <span className="text-[10px] text-yellow-500 font-medium">Pending</span>
                                )}
                              </div>
                            </div>
                            {sub.isGraded && (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Detail: Grading Panel Area */}
                <Card className="lg:col-span-9 flex flex-col h-full overflow-hidden glass-card relative">
                  {!selectedSubmission ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed m-4 rounded-xl border-border/50">
                      <Award className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg">Select a student to start grading</p>
                      <p className="text-sm opacity-60">High-efficiency grading mode active</p>
                    </div>
                  ) : (
                    <>
                      {/* Sub-Header / Navigation */}
                      <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xl border border-primary/20">
                            {selectedSubmission.studentRollNo || "?"}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{selectedSubmission.studentName}</h3>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>Roll No: {selectedSubmission.studentRollNo}</span>
                              <span>•</span>
                              <span>Submitted: {new Date(selectedSubmission.submittedAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={handlePrevSubmission} className="h-9 px-3 glass">
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                          </Button>
                          <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-center min-w-[120px]">
                            <p className="text-[10px] uppercase text-muted-foreground leading-none mb-1">Current Score</p>
                            <p className="text-lg font-bold text-primary leading-none">
                              {calculateLocalTotal()} / {selectedSubmission.answers.reduce((sum, a) => sum + a.questionMarks, 0)}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleNextSubmission} className="h-9 px-3 glass">
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>

                      {/* Grading Content */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
                        <div className="overflow-x-auto">
                          <table className="w-full border-separate border-spacing-y-2">
                            <thead>
                              <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                                <th className="text-left py-2 px-3 font-medium">Question</th>
                                <th className="text-left py-2 px-3 font-medium">Response</th>
                                <th className="text-left py-2 px-3 font-medium">Evaluation</th>
                                <th className="text-center py-2 px-3 font-medium w-32">Weight</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedSubmission.answers.map((answer, idx) => {
                                const isMCQ = answer.questionType === "MCQ";
                                const isCorrect = isMCQ && answer.selectedOptionIndex === answer.correctOptionIndex;
                                const studentAnswer = isMCQ
                                  ? (answer.selectedOptionIndex !== null && answer.selectedOptionIndex !== undefined
                                      ? answer.options[answer.selectedOptionIndex] 
                                      : "Not answered")
                                  : (answer.subjectiveAnswerText || "Not answered");
                                const expectedAnswer = isMCQ
                                  ? (answer.correctOptionIndex !== null ? answer.options[answer.correctOptionIndex] : "-")
                                  : (answer.expectedAnswerText || "Subjective Evaluation Required");

                                return (
                                  <tr key={answer.answerId} className="group bg-muted/20 border border-border/50 rounded-lg overflow-hidden transition-colors hover:bg-muted/40">
                                    <td className="py-4 px-4 align-top w-1/3">
                                      <div className="flex gap-2 items-start">
                                        <span className="text-xs font-black text-muted-foreground/50 mt-1">Q{idx + 1}</span>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium mb-2 leading-relaxed">{answer.questionText}</p>
                                          <div className="flex flex-wrap gap-1">
                                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-background">
                                              {answer.questionType}
                                            </Badge>
                                            {answer.chapter && (
                                              <Badge variant="outline" className="text-[10px] py-0 h-4 bg-blue-500/5 text-blue-500 border-blue-500/20">
                                                {answer.chapter}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 align-top">
                                      <div className={`text-sm p-3 rounded-md border ${
                                        isMCQ 
                                          ? (isCorrect ? "bg-green-500/10 border-green-500/20 text-green-600" : "bg-red-500/10 border-red-500/20 text-red-600") 
                                          : "bg-background/50 border-border/50"
                                      }`}>
                                        <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] font-bold uppercase">Student Response</div>
                                        {studentAnswer}
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 align-top">
                                      <div className="text-sm p-3 rounded-md bg-green-500/5 border border-green-500/20 text-green-700 italic">
                                        <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] font-bold uppercase">Expected / Reference</div>
                                        {expectedAnswer}
                                      </div>
                                    </td>
                                    <td className="py-4 px-4 align-top text-center w-32 bg-primary/5">
                                      <div className="space-y-2">
                                        <div className="flex items-center flex-col">
                                          <span className="text-[10px] uppercase text-muted-foreground mb-1">Marks</span>
                                          <Input
                                            type="number"
                                            min="0"
                                            max={answer.questionMarks}
                                            value={localGrades[answer.answerId] || 0}
                                            onChange={(e) =>
                                              handleGradeChange(
                                                answer.answerId,
                                                parseFloat(e.target.value) || 0,
                                                answer.questionMarks
                                              )
                                            }
                                            className="w-16 h-10 text-center font-bold text-lg bg-background border-primary/30"
                                          />
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium">Max: {answer.questionMarks}</div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer: Save Action */}
                      <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3 rounded-b-xl">
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedSubmissionId(null)}
                          className="glass"
                        >
                          Cancel
                        </Button>
                        <Button
                          className="neon-glow px-10 h-11 font-bold"
                          onClick={handleSaveGrades}
                          disabled={gradingLoading}
                        >
                          {gradingLoading ? (
                            <>Saving...</>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Save & Finalize Grades
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Manual Entry Tab - Commented out for now */}
          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Assessment Title</label>
                    <Input
                      placeholder="e.g., Weekly Quiz 1"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="bg-muted border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Max Marks</label>
                    <Input
                      type="number"
                      value={manualMaxMarks}
                      onChange={(e) => setManualMaxMarks(Number(e.target.value))}
                      className="bg-muted border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Class</label>
                    <select
                      className="w-full p-2.5 rounded-lg bg-muted border border-border text-sm"
                      value={selectedClass?.class_id || ""}
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
                    <label className="text-sm text-muted-foreground mb-2 block">Subject</label>
                    <select
                      className="w-full p-2.5 rounded-lg bg-muted border border-border text-sm"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                      {subjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Exam Type</label>
                    <select
                      className="w-full p-2.5 rounded-lg bg-muted border border-border text-sm"
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                    >
                      {examTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="glass-card p-6">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Award className="w-6 h-6 text-primary" />
                  Students - {selectedClass?.class_name}
                </h2>

                {studentsLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No students found in this class.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classStudents.map((student, index) => (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className="p-4 rounded-lg bg-muted/50 border border-border hover:border-primary transition-all"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                              {student.rollNo || "?"}
                            </div>
                            <div>
                              <h3 className="font-semibold text-sm">{student.name}</h3>
                              <p className="text-xs text-muted-foreground">Roll No: {student.rollNo}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-20 text-center font-bold h-9"
                              placeholder="0"
                              value={manualScores[student.id] ?? ""}
                              onChange={(e) => handleManualScoreChange(student.id, Number(e.target.value))}
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">/ {manualMaxMarks}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>

            <div className="flex justify-end gap-4">
              <Button 
                variant="outline" 
                className="glass" 
                onClick={() => {
                  setManualTitle("");
                  setManualScores({});
                }}
              >
                Clear
              </Button>
              <Button 
                size="lg" 
                className="neon-glow px-8" 
                onClick={handlePublishManualMarks}
                disabled={manualSaving}
              >
                {manualSaving ? <LoadingSpinner size="sm" /> : "Publish Marks"}
              </Button>
            </div>
          </TabsContent>

          {/* Bulk Upload Tab - Commented out for now */}
          {/* <TabsContent value="bulk" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card p-8 text-center">
                <Upload className="w-16 h-16 text-primary mx-auto mb-4 neon-glow" />
                <h3 className="text-2xl font-semibold mb-2">Upload CSV File</h3>
                <p className="text-muted-foreground mb-6">
                  Upload a CSV file with columns: Roll No, Name, Marks
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Button className="neon-glow">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                  <Button variant="outline" className="glass">
                    Download Template
                  </Button>
                </div>
              </Card>
            </motion.div>

            <Card className="glass-card p-6 bg-primary/5 border-primary/30">
              <h3 className="font-semibold mb-2">📝 CSV Format Instructions</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• First row should contain headers: Roll No, Name, Marks</li>
                <li>• Each row represents one student</li>
                <li>• Marks should be numeric values</li>
                <li>• Save the file in CSV format before uploading</li>
              </ul>
            </Card>
          </TabsContent> */}
        </Tabs>
      </div>
    </div>
  );
};

export default TeacherMarks;
