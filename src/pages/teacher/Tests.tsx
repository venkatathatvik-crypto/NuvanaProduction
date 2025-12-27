import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, FileText, ArrowLeft, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthContext";
import {
  getTeacherTests,
  deleteTeacherTest,
  publishTeacherTest,
  createNotificationsForClass,
  getStudentIdsInClass,
  getStudentEmailsInClass,
  sendTestPublishedEmail,
  TeacherTest,
} from "@/services/academic";
import { getTeacherClasses, FlattenedClass, getAllTeachingClasses } from "@/services/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const TeacherTests = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<"Internal Assessment" | "School Exam">("School Exam");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<{ id: string; title: string } | null>(null);

  const { data: tests = [], isLoading: testsLoading } = useQuery({
    queryKey: ['teacher-tests', profile?.id],
    queryFn: () => getTeacherTests(profile!.id),
    enabled: !!profile?.id && !profileLoading,
  });

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['teacher-all-teaching-classes', profile?.id, profile?.school_id],
    queryFn: () => getAllTeachingClasses(profile!.id, profile!.school_id),
    enabled: !!profile?.id && !!profile?.school_id && !profileLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loading = testsLoading || classesLoading;

  // Filter tests based on selected tab and class
  const filteredTests = useMemo(() => {
    let filtered = tests;

    // Filter by exam type category
    filtered = filtered.filter((test) => {
      if (selectedTab === "Internal Assessment") {
        return test.examTypeCategory === "Internal Assessment";
      } else {
        return test.examTypeCategory === "School Exam";
      }
    });

    // Filter by class if a specific class is selected
    if (selectedClassId !== "all") {
      filtered = filtered.filter((test) => test.classId === selectedClassId);
    }

    return filtered;
  }, [tests, selectedTab, selectedClassId]);

  const handleDeleteClick = (id: string, title: string) => {
    setTestToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!profile || !testToDelete) return;

    try {
      await deleteTeacherTest(testToDelete.id, profile.id);
      
      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['teacher-tests'] });
      queryClient.invalidateQueries({ queryKey: ['student-tests'] });
      
      toast.success("Test deleted successfully");
    } catch (error: any) {
      console.error("Error deleting test:", error);
      toast.error(error.message || "Failed to delete test");
    } finally {
      setTestToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handlePublishToggle = async (test: TeacherTest) => {
    if (!profile) return;

    try {
      await publishTeacherTest(test.id, profile.id, !test.isPublished);
      queryClient.invalidateQueries({ queryKey: ['teacher-tests'] });
      toast.success(
        test.isPublished
          ? "Test unpublished successfully"
          : "Test published successfully"
      );

      // Send notification to students if publishing (not unpublishing)
      if (!test.isPublished && test.classId) {
        try {
          const studentIds = await getStudentIdsInClass(test.classId);
          await createNotificationsForClass(studentIds, {
            school_id: profile.school_id,
            title: "New Test Available",
            message: `"${test.title}" is now available for you to take.`,
            notification_type: "test",
            target_url: "/student/tests",
          });
        } catch (notifError) {
          console.error("Failed to send notifications:", notifError);
        }

        // Send email notifications
        try {
          const studentEmails = await getStudentEmailsInClass(test.classId);
          await sendTestPublishedEmail(
            studentEmails,
            test.title,
            test.className || 'your class'
          );
        } catch (emailError) {
          console.error("Failed to send emails:", emailError);
        }
      }
    } catch (error: any) {
      console.error("Error updating test status:", error);
      toast.error(error.message || "Failed to update test status");
    }
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 bg-background space-y-4 sm:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/teacher")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Manage Tests 📝</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Create and manage MCQ assessments
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-4 shrink-0">
          <Button
            onClick={() => navigate("/teacher/tests/create")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create New Test</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as "Internal Assessment" | "School Exam")} className="w-full sm:w-auto">
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
                <TabsTrigger value="School Exam">School Exams</TabsTrigger>
                <TabsTrigger value="Internal Assessment">Internal Assessments</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tests Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test, index) => {
            const questionCount = test.questionCount || test.questions?.length || 0;

            return (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span className="truncate">{test.title}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${test.isPublished
                            ? "bg-green-500/20 text-green-500"
                            : "bg-yellow-500/20 text-yellow-500"
                          }`}
                      >
                        {test.isPublished ? "Published" : "Draft"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {test.description || "No description provided."}
                    </p>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{questionCount} Questions</span>
                      <span>{test.durationMinutes} mins</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {test.className && (
                        <div className="text-xs text-blue-500 bg-blue-500/10 px-2 py-1 rounded w-fit">
                          📚 {test.className}
                        </div>
                      )}
                      {test.examTypeName && (
                        <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit">
                          {test.examTypeName}
                        </div>
                      )}
                    </div>
                    {test.dueDate && (
                      <div className="text-xs text-orange-500 bg-orange-500/10 px-2 py-1 rounded w-fit flex items-center gap-1">
                        <span>📅</span>
                        <span>Due: {new Date(test.dueDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/teacher/tests/${test.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(test.id, test.title)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                      <Button
                        variant={test.isPublished ? "secondary" : "default"}
                        size="sm"
                        className="col-span-2"
                        onClick={() => handlePublishToggle(test)}
                      >
                        {test.isPublished ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

            {filteredTests.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>
                  {tests.length === 0
                    ? "No tests created yet. Click 'Create New Test' to get started."
                    : `No ${selectedTab.toLowerCase()} found${selectedClassId !== "all" ? " for the selected class" : ""}.`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Test"
        description={
          testToDelete
            ? `Are you sure you want to delete "${testToDelete.title}"? This action cannot be undone and students will no longer have access to this test.`
            : "Are you sure you want to delete this test?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
};

export default TeacherTests;
