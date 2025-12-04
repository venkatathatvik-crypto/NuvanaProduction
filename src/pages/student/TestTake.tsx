import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, XCircle, Clock, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/auth/AuthContext";
import {
    getStudentTestForAttempt,
    getTestResult,
    getStudentSubmission,
    submitStudentTest,
    StudentTestWithQuestions,
    TestResult,
    StudentSubmission,
} from "@/services/academic";
import LoadingSpinner from "@/components/LoadingSpinner";
import { StudentTestPlayer } from "@/components/mcq/StudentTestPlayer";

const TestTake = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const { profile, profileLoading } = useAuth();
    const [test, setTest] = useState<StudentTestWithQuestions | null>(null);
    const [result, setResult] = useState<TestResult | null>(null);
    const [pendingSubmission, setPendingSubmission] = useState<StudentSubmission | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isInternalAssessment, setIsInternalAssessment] = useState(false);

    // Helper to get the correct back path based on exam type
    const getBackPath = () => isInternalAssessment ? "/student/events" : "/student/tests";
    const getBackLabel = () => isInternalAssessment ? "Back to Assessments" : "Back to Tests";

    useEffect(() => {
        const fetchTestData = async () => {
            if (profileLoading) return;
            if (!profile || !testId) {
                setLoading(false);
                return;
            }

            try {
                // First check if already submitted
                const existingSubmission = await getStudentSubmission(testId, profile.id);
                if (existingSubmission) {
                    // Fetch test info to determine exam type for navigation
                    const testData = await getStudentTestForAttempt(testId, profile.id);
                    if (testData) {
                        setIsInternalAssessment(testData.examTypeId === 4);
                    }
                    
                    if (existingSubmission.isGraded) {
                        // Graded - show results
                        const testResult = await getTestResult(testId, profile.id);
                        setResult(testResult);
                    } else {
                        // Pending grading - show waiting message
                        setPendingSubmission(existingSubmission);
                    }
                    setLoading(false);
                    return;
                }

                // Fetch test for attempt
                const testData = await getStudentTestForAttempt(testId, profile.id);
                if (testData) {
                    setTest(testData);
                    // Check if this is an Internal Assessment (exam_type_id = 4)
                    setIsInternalAssessment(testData.examTypeId === 4);
                } else {
                    toast.error("Test not found or not accessible");
                    navigate("/student/tests");
                }
            } catch (error: any) {
                console.error("Error fetching test:", error);
                toast.error("Failed to load test");
                navigate("/student/tests");
            } finally {
                setLoading(false);
            }
        };

        fetchTestData();
    }, [testId, profile, profileLoading, navigate]);

    const handleComplete = async (answers: Record<string, number | string>, timeTakenSeconds: number) => {
        if (!profile || !testId) return;

        setSubmitting(true);
        try {
            const submission = await submitStudentTest({
                testId,
                studentId: profile.id,
                answers,
                timeTakenSeconds,
            });

            // Show pending submission screen (not graded yet)
            setPendingSubmission(submission);
            setTest(null);
            toast.success("Test submitted successfully! Awaiting teacher grading.");
        } catch (error: any) {
            console.error("Error submitting test:", error);
            toast.error(error.message || "Failed to submit test");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (!test && !result && !pendingSubmission) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">Test not found</p>
            </div>
        );
    }

    // Show pending submission screen (awaiting teacher grading)
    if (pendingSubmission && !pendingSubmission.isGraded) {
        return (
            <div className="min-h-screen p-6 space-y-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl mx-auto"
                >
                    <Button variant="ghost" onClick={() => navigate(getBackPath())} className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {getBackLabel()}
                    </Button>

                    <Card className="glass-card">
                        <CardHeader className="text-center pb-2">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                                <FileCheck className="w-10 h-10 text-primary" />
                            </div>
                            <CardTitle className="text-3xl neon-text">{isInternalAssessment ? "Assessment Submitted!" : "Test Submitted!"}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-6">
                            <div className="p-6 rounded-lg bg-muted/30 border">
                                <Clock className="w-8 h-8 mx-auto mb-3 text-yellow-500" />
                                <h3 className="text-xl font-semibold mb-2">Awaiting Results</h3>
                                <p className="text-muted-foreground">
                                    Your test has been submitted successfully. Your teacher will grade it soon.
                                </p>
                                <p className="text-sm text-muted-foreground mt-4">
                                    Submitted on: {new Date(pendingSubmission.submittedAt).toLocaleString()}
                                </p>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                You will be able to see your results once your teacher has graded your submission.
                            </p>

                            <Button onClick={() => navigate(getBackPath())} className="w-full">
                                {isInternalAssessment ? "Back to My Assessments" : "Back to My Tests"}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Show results if test was graded
    if (result) {
        const { test: testInfo, submission, questions } = result;
        const percentage = submission.totalMarks > 0 
            ? Math.round((submission.totalMarksObtained / submission.totalMarks) * 100) 
            : 0;
        const correctCount = questions.filter(q => q.selectedOptionIndex === q.correctOptionIndex).length;

        return (
            <div className="min-h-screen p-6 space-y-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-4xl mx-auto"
                >
                    <Button variant="ghost" onClick={() => navigate(getBackPath())} className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {getBackLabel()}
                    </Button>

                    <Card className="glass-card mb-8">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-3xl neon-text">{isInternalAssessment ? "Assessment Results" : "Test Results"}</CardTitle>
                            <p className="text-muted-foreground">{testInfo.title}</p>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="flex flex-col items-center justify-center py-8">
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="currentColor"
                                            strokeWidth="10"
                                            fill="transparent"
                                            className="text-muted/20"
                                        />
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke="currentColor"
                                            strokeWidth="10"
                                            fill="transparent"
                                            strokeDasharray={440}
                                            strokeDashoffset={440 - (440 * percentage) / 100}
                                            className={`text-primary transition-all duration-1000 ease-out ${percentage >= 50 ? 'text-green-500' : 'text-red-500'}`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-bold">{percentage}%</span>
                                        <span className="text-sm text-muted-foreground">{submission.totalMarksObtained} / {submission.totalMarks}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                                <div className="p-4 rounded-lg bg-muted/30 border">
                                    <p className="text-sm text-muted-foreground">Correct Answers</p>
                                    <p className="text-xl font-bold text-green-500">
                                        {correctCount}
                                    </p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/30 border">
                                    <p className="text-sm text-muted-foreground">Incorrect/Skipped</p>
                                    <p className="text-xl font-bold text-red-500">
                                        {questions.length - correctCount}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 mt-8">
                                <h3 className="text-xl font-bold">Detailed Analysis</h3>
                                {questions.map((q, idx) => {
                                    const isCorrect = q.selectedOptionIndex === q.correctOptionIndex;
                                    const isSkipped = q.selectedOptionIndex === null;

                                    return (
                                        <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-500/30 bg-green-500/5' : isSkipped ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                            <div className="flex gap-3">
                                                <div className="mt-1">
                                                    {isCorrect ? (
                                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                                    ) : isSkipped ? (
                                                        <Clock className="w-5 h-5 text-yellow-500" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-red-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <p className="font-medium">Q{idx + 1}. {q.text}</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                        <div className={`p-2 rounded ${isCorrect ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                                            Your Answer: {q.selectedOptionIndex !== null ? q.options[q.selectedOptionIndex] : 'Skipped'}
                                                        </div>
                                                        <div className="p-2 rounded bg-green-500/20 text-green-500">
                                                            Correct Answer: {q.options[q.correctOptionIndex]}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-bold whitespace-nowrap">
                                                    {isCorrect ? `+${q.marks}` : '0'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        );
    }

    // Show test player for taking the test
    if (test) {
        return (
            <div className="min-h-screen p-4 md:p-8">
                <StudentTestPlayer 
                    test={test} 
                    onComplete={handleComplete} 
                    isSubmitting={submitting}
                />
            </div>
        );
    }

    return null;
};

export default TestTake;
