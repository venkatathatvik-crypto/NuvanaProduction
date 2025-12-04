import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Award, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/auth/AuthContext";
import { getStudentGradedTests, StudentGradedTest } from "@/services/academic";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Marks = () => {
  const navigate = useNavigate();
  const { profile, profileLoading } = useAuth();
  const [gradedTests, setGradedTests] = useState<StudentGradedTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGradedTests = async () => {
      if (profileLoading) return;
      if (!profile) {
        setLoading(false);
        return;
      }

      try {
        const tests = await getStudentGradedTests(profile.id);
        setGradedTests(tests);
      } catch (error: any) {
        console.error("Error fetching graded tests:", error);
        toast.error("Failed to load marks");
      } finally {
        setLoading(false);
      }
    };

    fetchGradedTests();
  }, [profile, profileLoading]);

  // Group tests by subject
  const testsBySubject = useMemo(() => {
    const grouped: Record<string, StudentGradedTest[]> = {};
    gradedTests.forEach(test => {
      const subject = test.subjectName || "Other";
      if (!grouped[subject]) {
        grouped[subject] = [];
      }
      grouped[subject].push(test);
    });
    return grouped;
  }, [gradedTests]);

  // Calculate overall performance
  const overallPerformance = useMemo(() => {
    if (gradedTests.length === 0) {
      return { average: 0, totalMarks: 0, maxMarks: 0 };
    }
    const totalMarks = gradedTests.reduce((sum, t) => sum + t.marksObtained, 0);
    const maxMarks = gradedTests.reduce((sum, t) => sum + t.totalMarks, 0);
    const average = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
    return { average, totalMarks, maxMarks };
  }, [gradedTests]);

  // Prepare chart data for subject-wise performance
  const subjectChartData = useMemo(() => {
    return Object.entries(testsBySubject).map(([subject, tests]) => {
      const total = tests.reduce((sum, t) => sum + t.marksObtained, 0);
      const max = tests.reduce((sum, t) => sum + t.totalMarks, 0);
      const average = max > 0 ? Math.round((total / max) * 100) : 0;
      return { subject, average };
    });
  }, [testsBySubject]);

  // Prepare trend data (group by exam type)
  const trendData = useMemo(() => {
    const examTypes = Array.from(new Set(gradedTests.map(t => t.examTypeName || "Unknown")));
    // Sort exam types if possible? For now, just use them as they appear or maybe alphabetical?
    // Ideally we'd sort by date, but exam types group multiple tests.
    // Let's just create data points.

    return examTypes.map(type => {
      const item: any = { name: type };
      Object.keys(testsBySubject).forEach(subject => {
        const test = testsBySubject[subject].find(t => t.examTypeName === type);
        if (test) {
          item[subject] = test.percentage;
        }
      });
      return item;
    });
  }, [gradedTests, testsBySubject]);

  const getGradeFromPercentage = (percentage: number): string => {
    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B+";
    if (percentage >= 60) return "B";
    if (percentage >= 50) return "C";
    return "D";
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith("A")) return "text-neon-cyan";
    if (grade.startsWith("B")) return "text-neon-purple";
    return "text-neon-pink";
  };

  // Colors for lines
  const lineColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#a78bfa", "#2dd4bf"];

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/student")}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold neon-text">Marks & Performance</h1>
            <p className="text-muted-foreground">Track your academic progress</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Award className="w-12 h-12 text-primary mx-auto mb-2 neon-glow" />
                <p className="text-5xl font-bold neon-text">{overallPerformance.average}%</p>
                <p className="text-sm text-muted-foreground mt-2">Overall Average</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{overallPerformance.totalMarks}/{overallPerformance.maxMarks}</p>
                <p className="text-sm text-muted-foreground mt-2">Total Marks Scored</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-secondary">{gradedTests.length}</p>
                <p className="text-sm text-muted-foreground mt-2">Tests Completed</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {gradedTests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Subject-wise Average Chart */}
            <Card className="glass-card p-6">
              <h3 className="text-xl font-semibold mb-4">Subject-wise Average Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" angle={-15} textAnchor="end" height={60} interval={0} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="average" fill="#8884d8" name="Average %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Performance Trend Chart */}
            <Card className="glass-card p-6">
              <h3 className="text-xl font-semibold mb-4">Performance Trend Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  {Object.keys(testsBySubject).map((subject, index) => (
                    <Line
                      key={subject}
                      type="monotone"
                      dataKey={subject}
                      stroke={lineColors[index % lineColors.length]}
                      strokeWidth={2}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        )}

        {gradedTests.length === 0 ? (
          <Card className="glass-card p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Graded Tests Yet</h3>
            <p className="text-muted-foreground">Your test results will appear here once your teacher grades them.</p>
            <Button className="mt-6" onClick={() => navigate("/student/tests")}>
              View Available Tests
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Subject-wise Performance</h2>
            {Object.entries(testsBySubject).map(([subjectName, tests], index) => {
              const subjectTotal = tests.reduce((sum, t) => sum + t.marksObtained, 0);
              const subjectMax = tests.reduce((sum, t) => sum + t.totalMarks, 0);
              const subjectAverage = subjectMax > 0 ? Math.round((subjectTotal / subjectMax) * 100) : 0;

              // Calculate trend
              // Sort tests by date
              const sortedTests = [...tests].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
              const lastTest = sortedTests[sortedTests.length - 1];
              const prevTest = sortedTests.length > 1 ? sortedTests[sortedTests.length - 2] : null;
              const trend = prevTest ? (lastTest.percentage >= prevTest.percentage ? "up" : "down") : "up";

              return (
                <motion.div
                  key={subjectName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <Card className="glass-card p-6 hover:neon-glow transition-all">
                    <Tabs defaultValue="tests" className="w-full">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <h3 className="text-xl font-semibold">{subjectName}</h3>
                          <span className={`text-sm font-medium ${getGradeColor(getGradeFromPercentage(subjectAverage))}`}>
                            {getGradeFromPercentage(subjectAverage)}
                          </span>
                          {trend === "up" ? (
                            <TrendingUp className="w-5 h-5 text-neon-cyan" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <p className="text-3xl font-bold text-primary">{subjectAverage}%</p>
                      </div>

                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="tests">All Tests ({tests.length})</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                            <p className="text-sm text-muted-foreground mb-2">Total Score</p>
                            <p className="text-2xl font-bold">{subjectTotal}/{subjectMax}</p>
                            <Progress value={subjectAverage} className="mt-2" />
                          </div>
                          <div className="p-4 rounded-lg bg-muted/50 border border-border">
                            <p className="text-sm text-muted-foreground mb-2">Tests Taken</p>
                            <p className="text-2xl font-bold">{tests.length}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Latest: {new Date(tests[0]?.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="tests" className="space-y-3 mt-4">
                        {tests.map((test) => (
                          <div
                            key={test.testId}
                            className="p-4 rounded-lg bg-muted/50 border border-border flex justify-between items-center cursor-pointer hover:border-primary transition-colors"
                            onClick={() => navigate(`/student/tests/take/${test.testId}`)}
                          >
                            <div>
                              <p className="font-semibold">{test.testTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                {test.examTypeName && `${test.examTypeName} • `}
                                {new Date(test.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">{test.marksObtained}/{test.totalMarks}</p>
                              <p className={`text-sm font-medium ${getGradeColor(getGradeFromPercentage(test.percentage))}`}>
                                {test.percentage}% • {getGradeFromPercentage(test.percentage)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marks;
