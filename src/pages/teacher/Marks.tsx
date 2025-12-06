import { motion } from "framer-motion";
import { ArrowLeft, Upload, Save, Award, CheckCircle, Users, FileText } from "lucide-react";
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
  gradeStudentAnswer,
  finalizeSubmissionGrading,
  GradingQueueItem,
  SubmissionToGrade,
  getStudentsInClass,
  ClassStudentInfo,
} from "@/services/academic";
import { FlattenedClass } from "@/schemas/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const TeacherMarks = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, profileLoading } = useAuth();

  // --- STATE INITIALIZATION ---
  const [classes, setClasses] = useState<FlattenedClass[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [examTypes, setExamTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // State for selected objects
  const [selectedClass, setSelectedClass] = useState<FlattenedClass | undefined>(undefined);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [examType, setExamType] = useState("");

  // Real students from database
  const [classStudents, setClassStudents] = useState<ClassStudentInfo[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Test-based grading state
  const [gradingQueue, setGradingQueue] = useState<GradingQueueItem[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(searchParams.get("testId"));
  const [submissions, setSubmissions] = useState<SubmissionToGrade[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [localGrades, setLocalGrades] = useState<Record<string, number>>({});

  // --- EFFECT 1: INITIAL DATA LOAD ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (profileLoading) return;

      if (!profile) {
        setClasses([]);
        setSelectedClass(undefined);
        setExamTypes([]);
        setLoading(false);
        return;
      }

      try {
        const [classResponse, examResponse, queueResponse] = await Promise.all([
          getTeacherClasses(profile.id, profile.school_id),
          getExamTypes(profile.school_id),
          getTeacherGradingQueue(profile.id),
        ]);

        if (classResponse) {
          setClasses(classResponse);
          if (classResponse.length > 0) {
            setSelectedClass(classResponse[0]);
          }
        }

        if (examResponse) {
          setExamTypes(examResponse);
          if (examResponse.length > 0) {
            setExamType(examResponse[0]);
          }
        }

        if (queueResponse) {
          setGradingQueue(queueResponse);
        }
      } catch (error) {
        toast.error("Failed to load core academic data.");
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [profile, profileLoading]);

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
        const subs = await getTestSubmissionsForGrading(selectedTestId);
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
    if (!selectedSubmissionId) return;

    setGradingLoading(true);
    try {
      // Save each grade
      for (const [answerId, marks] of Object.entries(localGrades)) {
        await gradeStudentAnswer(answerId, marks);
      }

      // Finalize the submission
      await finalizeSubmissionGrading(selectedSubmissionId);

      toast.success("Grades saved successfully!");

      // Refresh submissions
      if (selectedTestId) {
        const subs = await getTestSubmissionsForGrading(selectedTestId);
        setSubmissions(subs);

        // Move to next ungraded (pass subs directly since state update is async)
        const nextUngraded = subs.find(s => !s.isGraded);
        if (nextUngraded) {
          handleSelectSubmission(nextUngraded.submissionId, subs);
        } else {
          setSelectedSubmissionId(null);
          toast.success("All submissions graded!");
        }

        // Refresh grading queue
        if (profile) {
          const queue = await getTeacherGradingQueue(profile.id);
          setGradingQueue(queue);
        }
      }
    } catch (error: any) {
      console.error("Error saving grades:", error);
      toast.error(error.message || "Failed to save grades");
    } finally {
      setGradingLoading(false);
    }
  };

  const getSelectedSubmission = (): SubmissionToGrade | undefined => {
    return submissions.find(s => s.submissionId === selectedSubmissionId);
  };

  const calculateLocalTotal = (): number => {
    return Object.values(localGrades).reduce((sum, marks) => sum + marks, 0);
  };

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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-bold neon-text">Grade Tests</h1>
            <p className="text-muted-foreground">Grade student test submissions</p>
          </motion.div>
        </div>

        <Tabs defaultValue="questionwise" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="questionwise">Question-wise Grading</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          {/* Question-wise Grading Tab - Main Grading Flow */}
          <TabsContent value="questionwise" className="space-y-6 mt-6">
            {/* Test Selection */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
            </motion.div>

            {/* Student Submissions */}
            {selectedTestId && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="glass-card p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Student Submissions
                    {selectedTest && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        - {selectedTest.testTitle}
                      </span>
                    )}
                  </h2>

                  {gradingLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No submissions for this test yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {submissions.map((sub) => (
                        <div
                          key={sub.submissionId}
                          onClick={() => handleSelectSubmission(sub.submissionId)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                            selectedSubmissionId === sub.submissionId
                              ? "border-primary bg-primary/10"
                              : sub.isGraded
                              ? "border-green-500/50 bg-green-500/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                            {sub.studentRollNo || "?"}
                          </div>
                          <p className="text-sm font-medium truncate">{sub.studentName}</p>
                          {sub.isGraded ? (
                            <Badge className="mt-1 bg-green-500/20 text-green-500 text-xs">
                              {sub.totalMarksObtained} pts
                            </Badge>
                          ) : (
                            <Badge className="mt-1 bg-yellow-500/20 text-yellow-500 text-xs">
                              Pending
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Grading Panel */}
            {selectedSubmission && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="glass-card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">
                        Grading: {selectedSubmission.studentName}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Roll No: {selectedSubmission.studentRollNo} • 
                        Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Score</p>
                      <p className="text-3xl font-bold text-primary">
                        {calculateLocalTotal()} / {selectedSubmission.answers.reduce((sum, a) => sum + a.questionMarks, 0)}
                      </p>
                    </div>
                  </div>

                  {/* Questions Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-semibold">Q#</th>
                          <th className="text-left p-3 text-sm font-semibold">Type</th>
                          <th className="text-left p-3 text-sm font-semibold">Question</th>
                          <th className="text-left p-3 text-sm font-semibold">Student Answer</th>
                          <th className="text-left p-3 text-sm font-semibold">Expected/Correct</th>
                          <th className="text-center p-3 text-sm font-semibold">Max</th>
                          <th className="text-center p-3 text-sm font-semibold">Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSubmission.answers.map((answer, idx) => {
                          const isMCQ = answer.questionType === "MCQ";
                          const isCorrect = isMCQ && answer.selectedOptionIndex === answer.correctOptionIndex;
                          
                          // For MCQ: show selected option text
                          // For subjective: show the text answer
                          const studentAnswer = isMCQ
                            ? (answer.selectedOptionIndex !== null 
                                ? answer.options[answer.selectedOptionIndex] 
                                : "Not answered")
                            : (answer.subjectiveAnswerText || "Not answered");
                          
                          // For MCQ: show correct option
                          // For subjective: show expected answer (if any)
                          const expectedAnswer = isMCQ
                            ? (answer.correctOptionIndex !== null ? answer.options[answer.correctOptionIndex] : "-")
                            : (answer.expectedAnswerText || "Teacher will evaluate");

                          const getTypeBadge = () => {
                            switch (answer.questionType) {
                              case "MCQ":
                                return <Badge className="bg-blue-500/20 text-blue-500 text-xs">MCQ</Badge>;
                              case "Essay":
                                return <Badge className="bg-purple-500/20 text-purple-500 text-xs">Essay</Badge>;
                              case "Short Answer":
                                return <Badge className="bg-green-500/20 text-green-500 text-xs">Short</Badge>;
                              case "Very Short Answer":
                                return <Badge className="bg-orange-500/20 text-orange-500 text-xs">V.Short</Badge>;
                              default:
                                return null;
                            }
                          };

                          return (
                            <tr key={answer.answerId} className="border-b border-border hover:bg-muted/30">
                              <td className="p-3 font-semibold">Q{idx + 1}</td>
                              <td className="p-3">{getTypeBadge()}</td>
                              <td className="p-3 text-sm max-w-xs">
                                <p className="line-clamp-2">{answer.questionText}</p>
                                {answer.chapter && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-500 mr-1">
                                    {answer.chapter}
                                  </span>
                                )}
                                {answer.topic && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-500">
                                    {answer.topic}
                                  </span>
                                )}
                              </td>
                              <td className={`p-3 text-sm max-w-md ${isMCQ ? (isCorrect ? "text-green-500" : "text-red-500") : ""}`}>
                                {isMCQ ? (
                                  studentAnswer
                                ) : (
                                  <div className="max-h-32 overflow-y-auto p-2 bg-muted/30 rounded text-foreground">
                                    {studentAnswer}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-sm text-green-500 max-w-xs">
                                {isMCQ ? (
                                  expectedAnswer
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">
                                    {expectedAnswer}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center font-semibold">{answer.questionMarks}</td>
                              <td className="p-3">
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
                                  className="w-20 text-center font-bold"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end gap-4 mt-6">
                    <Button
                      size="lg"
                      className="neon-glow px-8"
                      onClick={handleSaveGrades}
                      disabled={gradingLoading}
                    >
                      {gradingLoading ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save & Finalize Grades
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="space-y-6 mt-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="glass-card p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Class</label>
                    <select
                      className="w-full p-3 rounded-lg bg-muted border border-border"
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
                      className="w-full p-3 rounded-lg bg-muted border border-border"
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
                      className="w-full p-3 rounded-lg bg-muted border border-border"
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
                  <div className="space-y-3">
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
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                              {student.rollNo || "?"}
                            </div>
                            <div>
                              <h3 className="font-semibold">{student.name}</h3>
                              <p className="text-sm text-muted-foreground">Roll No: {student.rollNo}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              className="w-24 text-center text-lg font-bold"
                              placeholder="0"
                            />
                            <span className="text-muted-foreground">/ 100</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" className="glass">
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button size="lg" className="neon-glow px-8">
                Publish Marks
              </Button>
            </div>
          </TabsContent>

          {/* Bulk Upload Tab */}
          <TabsContent value="bulk" className="space-y-6 mt-6">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeacherMarks;
