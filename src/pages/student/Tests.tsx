import { useNavigate } from "react-router-dom";
import { Play, Clock, CheckCircle, FileCheck, Eye, ArrowLeft, Calendar, Award, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { getStudentData, getStudentTests, StudentTest } from "@/services/academic";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const StudentTests = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useAuth();

    // 1. Get Student Data (for class_id)
    const { data: studentData } = useQuery({
        queryKey: ['student-data', profile?.id],
        queryFn: () => getStudentData(profile!.id),
        enabled: !!profile?.id && !profileLoading,
    });

    // 2. Get Tests
    const { data: tests = [], isLoading: loading } = useQuery({
        queryKey: ['student-tests', studentData?.class_id, profile?.id],
        queryFn: async () => {
            const testsData = await getStudentTests(studentData!.class_id, profile!.id);
            // Exclude internal assessments – they belong to Events page
            return testsData.filter(test => test.examTypeCategory !== 'Internal Assessment');
        },
        enabled: !!studentData?.class_id && !!profile?.id,
    });

    const getStatusBadge = (status: StudentTest["submissionStatus"]) => {
        switch (status) {
            case "graded":
                return <Badge className="bg-green-500/20 text-green-500 border-green-500/50">Graded</Badge>;
            case "pending":
                return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">Awaiting Results</Badge>;
            case "not_started":
                return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50">Not Started</Badge>;
            default:
                return null;
        }
    };

    const getActionButton = (test: StudentTest) => {
        switch (test.submissionStatus) {
            case "graded":
                return (
                    <Button className="w-full mt-4" variant="outline" onClick={() => navigate(`/student/tests/take/${test.id}`)}>
                        <Eye className="w-4 h-4 mr-2" /> View Results
                    </Button>
                );
            case "pending":
                return (
                    <Button className="w-full mt-4" variant="secondary" disabled>
                        <FileCheck className="w-4 h-4 mr-2" /> Submitted
                    </Button>
                );
            case "not_started":
                return (
                    <Button className="w-full mt-4" onClick={() => navigate(`/student/tests/take/${test.id}`)}>
                        <Play className="w-4 h-4 mr-2" /> Start Test
                    </Button>
                );
            default:
                return null;
        }
    };

    // We no longer block the entire page on 'loading'.
    // if (loading || profileLoading) { ... }

    // Categorise tests
    const activeTests = tests.filter(test => test.submissionStatus === "not_started");
    const completedTests = tests.filter(test => test.submissionStatus === "graded" || test.submissionStatus === "pending");
    const upcomingTests = tests.filter(test => {
        if (!test.dueDate) return false;
        const now = new Date();
        const due = new Date(test.dueDate);
        return due > now && test.submissionStatus === "not_started";
    });

    const renderTestCard = (test: StudentTest, index: number) => (
        <motion.div key={test.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}>
            <Card className="glass-card hover:border-primary transition-colors">
                <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                        <span className="truncate">{test.title}</span>
                        <div className="flex flex-col items-end gap-1">
                            {test.subjectName && (
                                <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">{test.subjectName}</span>
                            )}
                            {getStatusBadge(test.submissionStatus)}
                        </div>
                    </CardTitle>
                    <CardDescription>{test.description || "No description provided."}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" />{test.durationMinutes} mins</div>
                        <div className="flex items-center gap-1"><FileText className="w-4 h-4" />{test.questionCount} Questions</div>
                        <div className="flex items-center gap-1"><Award className="w-4 h-4" />{test.totalMarks} Marks</div>
                    </div>
                    {test.dueDate && (
                        <div className="flex items-center gap-2 text-destructive">
                            <Calendar className="w-4 h-4" /> Due: {format(new Date(test.dueDate), "MMM dd, yyyy")}
                        </div>
                    )}
                    {test.submissionStatus === "graded" && test.marksObtained !== undefined && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Your Score</span>
                                <span className="text-xl font-bold text-green-500">{test.marksObtained} / {test.totalMarks}</span>
                            </div>
                        </div>
                    )}
                    {getActionButton(test)}
                </CardContent>
            </Card>
        </motion.div>
    );

    return (
        <div className="min-h-screen p-6 space-y-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/student")}> <ArrowLeft className="w-6 h-6" /> </Button>
                <div>
                    <h1 className="text-4xl font-bold neon-text mb-2">My Assessments 📝</h1>
                    <p className="text-muted-foreground">Take tests and view your progress</p>
                </div>
            </motion.div>

            <Tabs defaultValue="upcoming" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upcoming" className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Upcoming ({upcomingTests.length})</TabsTrigger>
                    <TabsTrigger value="active" className="flex items-center gap-2"><Play className="w-4 h-4" /> Active ({activeTests.length})</TabsTrigger>
                    <TabsTrigger value="results" className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Results ({completedTests.length})</TabsTrigger>
                </TabsList>

                {/* Upcoming Tests Tab */}
                <TabsContent value="upcoming" className="space-y-4 mt-6">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="glass-card p-6 space-y-4">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </Card>
                            ))}
                        </div>
                    ) : (
                        upcomingTests.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {upcomingTests.map((test, index) => renderTestCard(test, index))}
                            </div>
                        ) : (
                            <div className="col-span-full text-center py-12">
                                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground">No upcoming tests scheduled.</p>
                            </div>
                        )
                    )}
                </TabsContent>

                {/* Active Tests Tab */}
                <TabsContent value="active" className="space-y-6">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="glass-card p-6 space-y-4">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </Card>
                            ))}
                        </div>
                    ) : (
                        activeTests.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeTests.map((test, index) => renderTestCard(test, index))}
                            </div>
                        ) : (
                            <div className="col-span-full text-center py-12">
                                <Play className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground">No active tests available to take.</p>
                            </div>
                        )
                    )}
                </TabsContent>

                {/* Results Tab */}
                <TabsContent value="results" className="space-y-6">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="glass-card p-6 space-y-4">
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </Card>
                            ))}
                        </div>
                    ) : (
                        completedTests.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {completedTests.map((test, index) => renderTestCard(test, index))}
                            </div>
                        ) : (
                            <div className="col-span-full text-center py-12">
                                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground">No completed tests yet. Start taking tests to see your results here!</p>
                            </div>
                        )
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default StudentTests;
