import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TestForm } from "@/components/mcq/TestForm";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  getTeacherTest,
  updateTeacherTest,
  publishTeacherTest,
  getGradeSubjectIdBySubjectName,
  getExamTypeIdByName,
  TeacherTest,
} from "@/services/academic";
import LoadingSpinner from "@/components/LoadingSpinner";

const TestDetails = () => {
  const { testId } = useParams();
  console.log("testId", testId);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [test, setTest] = useState<TeacherTest | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [submissions] = useState<any[]>([]); // Submissions not implemented yet

  useEffect(() => {
    const fetchTest = async () => {
      if (!testId || !profile) return;

      try {
        const testData = await getTeacherTest(testId, profile.id);
        console.log("-------------------", testData);

        setTest(testData);
      } catch (error: any) {
        console.error("Error fetching test:", error);
        toast.error("Test not found");
        navigate("/teacher/tests");
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [testId, profile, navigate]);

  const handleUpdate = async (data: any) => {
    if (!test || !profile) return;

    try {
      // Convert subject name to grade_subject_id
      const gradeSubjectId = await getGradeSubjectIdBySubjectName(
        data.classId,
        data.subject
      );
      if (!gradeSubjectId) {
        toast.error("Failed to find subject. Please try again.");
        return;
      }

      // Convert exam type name to exam_type_id
      const examTypeId = await getExamTypeIdByName(data.examType);
      if (!examTypeId) {
        toast.error("Failed to find exam type. Please try again.");
        return;
      }

      // Transform questions to match service format, including IDs for updates
      const questions = data.questions.map((q: any) => ({
        id: q.id, // Include question ID for updates
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        marks: q.marks,
        chapter: q.chapter,
        topic: q.topic,
        questionType: q.questionType,
        expectedAnswerText: q.expectedAnswerText,
      }));

      const updatedTest = await updateTeacherTest(test.id, {
        title: data.title,
        description: data.description,
        durationMinutes: data.durationMinutes,
        isPublished: data.isPublished,
        classId: data.classId,
        gradeSubjectId,
        examTypeId,
        teacherId: profile.id,
        schoolId: profile.school_id,
        questions,
      });

      setTest(updatedTest);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["teacher-tests"] });
      queryClient.invalidateQueries({ queryKey: ["student-tests"] });
      queryClient.invalidateQueries({ queryKey: ["student-pending-tests"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });

      toast.success("Test updated successfully");
    } catch (error: any) {
      console.error("Error updating test:", error);
      toast.error(error.message || "Failed to update test");
    }
  };

  const handlePublishToggle = async () => {
    if (!test || !profile) return;

    try {
      await publishTeacherTest(test.id, profile.id, !test.isPublished);
      setTest({ ...test, isPublished: !test.isPublished });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["teacher-tests"] });
      queryClient.invalidateQueries({ queryKey: ["student-tests"] });
      queryClient.invalidateQueries({ queryKey: ["student-pending-tests"] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });

      toast.success(
        test.isPublished
          ? "Test unpublished successfully"
          : "Test published successfully"
      );
    } catch (error: any) {
      console.error("Error updating test status:", error);
      toast.error(error.message || "Failed to update test status");
    }
  };

  const exportResults = () => {
    if (!submissions.length) return;

    const headers = [
      "Student ID",
      "Score",
      "Total Marks",
      "Time Taken (s)",
      "Submitted At",
    ];
    const totalMarks =
      test?.questions.reduce((acc, q) => acc + q.marks, 0) || 0;
    const rows = submissions.map((s) => [
      s.studentId,
      s.score,
      totalMarks,
      s.timeTakenSeconds,
      format(new Date(s.submittedAt), "dd/MM/yyyy HH:mm:ss"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results-${test?.title}.csv`;
    a.click();
  };

  // Convert TeacherTest to Test format for TestForm
  const convertToTestFormData = (test: TeacherTest) => {
    return {
      id: test.id,
      title: test.title,
      description: test.description || "",
      durationMinutes: test.durationMinutes,
      isPublished: test.isPublished,
      classId: test.classId,
      subject: test.subjectName || "",
      examType: test.examTypeName || "",
      questions: test.questions.map((q) => ({
        id: q.id,
        text: q.text,
        questionType: q.questionType || 'MCQ', // Default to MCQ for backward compatibility
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        marks: q.marks,
        chapter: q.chapter,
        topic: q.topic,
      })),
      createdBy: test.teacherId,
      createdAt: test.createdAt,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen p-6 bg-background flex items-center justify-center">
        <Card className="glass-card p-6">
          <p className="text-muted-foreground">Test not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background space-y-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/teacher")}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold neon-text">{test.title}</h1>
              <p className="text-muted-foreground">
                Manage test and view results
              </p>
            </div>
          </div>
          <Button
            variant={test.isPublished ? "secondary" : "default"}
            onClick={handlePublishToggle}
          >
            {test.isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>

        <Tabs defaultValue="edit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="edit">Edit Test</TabsTrigger>
            <TabsTrigger value="results">Results & Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <TestForm
              initialData={convertToTestFormData(test)}
              onSubmit={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="results">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  Student Submissions ({submissions.length})
                </CardTitle>
                <Button
                  variant="outline"
                  onClick={exportResults}
                  disabled={submissions.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Time Taken</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.studentId}
                        </TableCell>
                        <TableCell className="text-primary font-bold">
                          {submission.score} /{" "}
                          {test.questions.reduce((acc, q) => acc + q.marks, 0)}
                        </TableCell>
                        <TableCell>
                          {Math.floor(submission.timeTakenSeconds / 60)}m{" "}
                          {submission.timeTakenSeconds % 60}s
                        </TableCell>
                        <TableCell>
                          {format(new Date(submission.submittedAt), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {submissions.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No submissions yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default TestDetails;
