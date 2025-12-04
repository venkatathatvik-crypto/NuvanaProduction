import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckSquare, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { getTeacherGradingQueue, GradingQueueItem } from "@/services/academic";
import LoadingSpinner from "@/components/LoadingSpinner";

const TeacherTasks = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useAuth();
    const [gradingTasks, setGradingTasks] = useState<GradingQueueItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGradingQueue = async () => {
            if (profileLoading) return;
            if (!profile) {
                setLoading(false);
                return;
            }

            try {
                const queue = await getTeacherGradingQueue(profile.id);
                setGradingTasks(queue);
            } catch (error: any) {
                console.error("Error fetching grading queue:", error);
                toast.error("Failed to load grading queue");
            } finally {
                setLoading(false);
            }
        };

        fetchGradingQueue();
    }, [profile, profileLoading]);

    const getUrgencyBadge = (pendingCount: number) => {
        if (pendingCount > 20) {
            return <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10">High Priority</Badge>;
        } else if (pendingCount > 10) {
            return <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 bg-yellow-500/10">{pendingCount} Pending</Badge>;
        } else if (pendingCount > 0) {
            return <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">{pendingCount} Pending</Badge>;
        }
        return <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10">All Graded</Badge>;
    };

    if (loading || profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between"
                >
                    <div>
                        <h1 className="text-4xl font-bold neon-text mb-2">My Tasks 📝</h1>
                        <p className="text-muted-foreground">Manage your grading queue</p>
                    </div>
                    <Button variant="outline" className="glass" onClick={() => navigate("/teacher")}>
                        Back to Dashboard
                    </Button>
                </motion.div>

                {/* Grading Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-6"
                >
                    <div className="flex items-center gap-2">
                        <CheckSquare className="w-6 h-6 text-neon-blue" />
                        <h2 className="text-2xl font-semibold">Grading Queue</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gradingTasks.map((task) => (
                            <Card key={task.testId} className="glass-card p-6 hover:border-neon-pink/50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg">{task.testTitle}</h3>
                                        <p className="text-sm text-muted-foreground">{task.className}</p>
                                        {task.subjectName && (
                                            <p className="text-xs text-primary">{task.subjectName}</p>
                                        )}
                                    </div>
                                    {getUrgencyBadge(task.pendingCount)}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span>{task.gradedCount} / {task.totalSubmissions} graded</span>
                                    </div>
                                    <Progress value={(task.gradedCount / task.totalSubmissions) * 100} className="h-2" />
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <Button
                                        size="sm"
                                        className="neon-glow"
                                        onClick={() => navigate(`/teacher/marks?testId=${task.testId}`)}
                                        disabled={task.pendingCount === 0}
                                    >
                                        {task.pendingCount > 0 ? "Grade Now" : "View"} <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}

                        {gradingTasks.length === 0 && (
                            <div className="col-span-full">
                                <Card className="glass-card p-8 text-center text-muted-foreground">
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>All caught up! No pending grading tasks.</p>
                                </Card>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TeacherTasks;
