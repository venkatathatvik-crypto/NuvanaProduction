import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/auth/AuthContext";
import {
  getTeacherTests,
  deleteTeacherTest,
  publishTeacherTest,
  TeacherTest,
} from "@/services/academic";
import LoadingSpinner from "@/components/LoadingSpinner";

const TeacherTests = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const [tests, setTests] = useState<TeacherTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      if (profileLoading) return;

      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        const testsData = await getTeacherTests(profile.id);
        setTests(testsData);
      } catch (error: any) {
        console.error("Error fetching tests:", error);
        toast.error("Failed to load tests");
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [profile, profileLoading]);

  const handleDelete = async (id: string) => {
    if (!profile) return;

    if (confirm("Are you sure you want to delete this test?")) {
      try {
        await deleteTeacherTest(id, profile.id);
        setTests(tests.filter((t) => t.id !== id));
        toast.success("Test deleted successfully");
      } catch (error: any) {
        console.error("Error deleting test:", error);
        toast.error(error.message || "Failed to delete test");
      }
    }
  };

  const handlePublishToggle = async (test: TeacherTest) => {
    if (!profile) return;

    try {
      await publishTeacherTest(test.id, profile.id, !test.isPublished);
      setTests(
        tests.map((t) =>
          t.id === test.id ? { ...t, isPublished: !t.isPublished } : t
        )
      );
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

  return (
    <div className="min-h-screen p-6 bg-background space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-bold neon-text mb-2">Manage Tests 📝</h1>
          <p className="text-muted-foreground">
            Create and manage MCQ assessments
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate("/teacher")}>
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate("/teacher/tests/create")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Test
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test, index) => {
            const questionCount = test.questions?.length || 0;

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
                    {test.examTypeName && (
                      <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded w-fit">
                        {test.examTypeName}
                      </div>
                    )}
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
                        onClick={() => handleDelete(test.id)}
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

          {tests.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>
                No tests created yet. Click "Create New Test" to get started.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherTests;
