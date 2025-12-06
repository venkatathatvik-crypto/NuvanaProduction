// Full updated AnalyticsDashboard.tsx with Topic/Chapter-wise performance added
// ---------- START OF FILE ----------

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ScatterChart,
    Scatter,
    ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Users, BookOpen, AlertCircle, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    getTeacherClasses,
    FlattenedClass,
    getChapterTopicAnalytics,
    getClassPerformanceTrend,
    getClassStudentsWithScores,
    getRecentTestsMetrics,
    getClassSubjectAverages,
    getAttendanceVsMarksData,
    getQuestionTypeDistribution,
    getStudentAnalyticsForTeacher,
    ClassPerformanceTrend,
    ClassStudentWithScore,
    RecentTestMetrics,
    SubjectAverageData,
    AttendanceVsMarks,
    QuestionTypeDistribution,
    StudentAnalyticsForTeacher
} from "@/services/academic";
import { useAuth } from "@/auth/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

const NEON_COLORS = {
    primary: "#8884d8",
    secondary: "#82ca9d",
    accent: "#ffc658",
    danger: "#ff7373",
};

// ---------------- TYPE DEFINITIONS ----------------
interface StudentListItem {
    id: string;
    name: string;
    avgScore: number;
    attendancePercentage: number;
}

interface StudentAnalyticsData {
    radar: { subject: string; A: number; B: number }[];
    strengths: { subject: string; desc: string }[];
    weaknesses: { subject: string; desc: string }[];
}

interface TopicChapterData {
    topics: {
        topic: string;
        avg: number;
        chapters: { chapter: string; score: number }[];
    }[];
}

// ---------------- MAIN COMPONENT ----------------
const AnalyticsDashboard = () => {
    const { profile, profileLoading } = useAuth();
    const [classes, setClasses] = useState<FlattenedClass[]>([]);
    const [selectedClass, setSelectedClass] = useState<FlattenedClass | undefined>();
    const navigate = useNavigate();
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [loading, setLoading] = useState(true);

    // State for topic/chapter analytics (class level)
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [analyticsData, setAnalyticsData] = useState<{
        chapters: { name: string; avgScore: number; totalQuestions: number }[];
        topics: { name: string; avgScore: number; totalQuestions: number; chapters: string[] }[];
    }>({ chapters: [], topics: [] });
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // State for class insights tab
    const [performanceTrendData, setPerformanceTrendData] = useState<ClassPerformanceTrend[]>([]);
    const [subjectAverageData, setSubjectAverageData] = useState<SubjectAverageData[]>([]);
    const [attendanceVsMarksData, setAttendanceVsMarksData] = useState<AttendanceVsMarks[]>([]);
    const [classInsightsLoading, setClassInsightsLoading] = useState(false);

    // State for student analysis tab
    const [studentsList, setStudentsList] = useState<StudentListItem[]>([]);
    const [studentAnalyticsData, setStudentAnalyticsData] = useState<Record<string, StudentAnalyticsData>>({});
    const [topicChapterData, setTopicChapterData] = useState<Record<string, Record<string, TopicChapterData>>>({});
    const [studentAnalysisLoading, setStudentAnalysisLoading] = useState(false);

    // State for test metrics tab
    const [recentTestsData, setRecentTestsData] = useState<RecentTestMetrics[]>([]);
    const [questionTypeData, setQuestionTypeData] = useState<QuestionTypeDistribution[]>([]);
    const [testMetricsLoading, setTestMetricsLoading] = useState(false);

    // Fetch class insights data when class changes
    useEffect(() => {
        const fetchClassInsights = async () => {
            if (!selectedClass) return;
            
            setClassInsightsLoading(true);
            try {
                const [trend, subjects, attVsMarks] = await Promise.all([
                    getClassPerformanceTrend(selectedClass.class_id),
                    getClassSubjectAverages(selectedClass.class_id),
                    getAttendanceVsMarksData(selectedClass.class_id)
                ]);
                setPerformanceTrendData(trend);
                setSubjectAverageData(subjects);
                setAttendanceVsMarksData(attVsMarks);
            } catch (error: any) {
                console.error('Error fetching class insights:', error);
                toast.error('Failed to load class insights');
            } finally {
                setClassInsightsLoading(false);
            }
        };

        fetchClassInsights();
    }, [selectedClass]);

    // Fetch chapter/topic analytics data when class changes
    useEffect(() => {
        const fetchAnalyticsData = async () => {
            if (!selectedClass) return;
            
            setAnalyticsLoading(true);
            try {
                const data = await getChapterTopicAnalytics(selectedClass.class_id);
                setAnalyticsData(data);
            } catch (error: any) {
                console.error('Error fetching analytics:', error);
                toast.error('Failed to load analytics data');
            } finally {
                setAnalyticsLoading(false);
            }
        };

        fetchAnalyticsData();
    }, [selectedClass]);

    // Fetch students list when class changes
    useEffect(() => {
        const fetchStudentsList = async () => {
            if (!selectedClass) return;
            
            setStudentAnalysisLoading(true);
            try {
                const students = await getClassStudentsWithScores(selectedClass.class_id);
                setStudentsList(students);
                // Set first student as selected if available
                if (students.length > 0 && !selectedStudent) {
                    setSelectedStudent(students[0].id);
                }
            } catch (error: any) {
                console.error('Error fetching students list:', error);
                toast.error('Failed to load students');
            } finally {
                setStudentAnalysisLoading(false);
            }
        };

        fetchStudentsList();
    }, [selectedClass]);

    // Fetch individual student analytics when student selection changes
    useEffect(() => {
        const fetchStudentAnalytics = async () => {
            if (!selectedStudent || !selectedClass) return;
            // Don't refetch if we already have data for this student
            if (studentAnalyticsData[selectedStudent]) return;
            
            try {
                const analytics = await getStudentAnalyticsForTeacher(selectedStudent, selectedClass.class_id);
                setStudentAnalyticsData(prev => ({
                    ...prev,
                    [selectedStudent]: {
                        radar: analytics.radar,
                        strengths: analytics.strengths,
                        weaknesses: analytics.weaknesses
                    }
                }));
                // Note: topicChapterData is not currently returned by the service function
                // This can be enhanced later if per-student topic breakdown is needed
            } catch (error: any) {
                console.error('Error fetching student analytics:', error);
                toast.error('Failed to load student analytics');
            }
        };

        fetchStudentAnalytics();
    }, [selectedStudent, selectedClass]);

    // Fetch test metrics when class changes
    useEffect(() => {
        const fetchTestMetrics = async () => {
            if (!selectedClass) return;
            
            setTestMetricsLoading(true);
            try {
                const [recentTests, questionTypes] = await Promise.all([
                    getRecentTestsMetrics(selectedClass.class_id),
                    getQuestionTypeDistribution(selectedClass.class_id)
                ]);
                setRecentTestsData(recentTests);
                setQuestionTypeData(questionTypes);
            } catch (error: any) {
                console.error('Error fetching test metrics:', error);
                toast.error('Failed to load test metrics');
            } finally {
                setTestMetricsLoading(false);
            }
        };

        fetchTestMetrics();
    }, [selectedClass]);

    // Fetch classes on mount
    useEffect(() => {
        const fetchClasses = async () => {
            if (profileLoading) return;
            if (!profile) {
                setClasses([]);
                setSelectedClass(undefined);
                setLoading(false);
                return;
            }
            try {
                const res = await getTeacherClasses(profile.id, profile.school_id);
                setClasses(res || []);
                setSelectedClass(res?.[0]);
            } catch {
                toast.error("Failed to load classes");
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, [profile, profileLoading]);

    if (loading) return <LoadingSpinner />;
    if (!selectedClass)
        return <div className="min-h-screen p-6 flex items-center justify-center text-xl font-semibold text-destructive">No classes found</div>;

    // Get current student analytics with fallback
    const currentStudentAnalytics = studentAnalyticsData[selectedStudent] || {
        radar: [],
        strengths: [],
        weaknesses: []
    };

    // Get current topic/chapter data with fallback
    const currentTopicChapterData = topicChapterData[selectedStudent] || {};

    return (
        <div className="min-h-screen p-6 space-y-8 bg-background">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard 📊</h1>
                        <p className="text-muted-foreground">Deep insights into student performance</p>
                    </div>
                </div>

                <Select value={selectedClass?.class_id} onValueChange={(id) => setSelectedClass(classes.find((c) => c.class_id === id))}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {classes.map((cls) => (
                            <SelectItem key={cls.class_id} value={cls.class_id}>{cls.class_name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </motion.div>

            <Tabs defaultValue="class" className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full max-w-xl">
                    <TabsTrigger value="class">Class Insights</TabsTrigger>
                    <TabsTrigger value="topics">Chapter & Topics</TabsTrigger>
                    <TabsTrigger value="student">Student Analysis</TabsTrigger>
                    <TabsTrigger value="test">Test Metrics</TabsTrigger>
                </TabsList>

                {/* ---------------- CLASS LEVEL INSIGHTS ---------------- */}
                <TabsContent value="class" className="space-y-6">
                    {classInsightsLoading ? (
                        <div className="flex justify-center p-20">
                            <LoadingSpinner />
                        </div>
                    ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PERFORMANCE TREND */}
                        <Card>
                            <CardHeader>
                                <CardTitle>📈 Class Performance Trend</CardTitle>
                                <CardDescription>Average scores and attendance over the last 6 months</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {performanceTrendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={performanceTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                                        <Tooltip 
                                            formatter={(value: number, name: string) => [
                                                `${value}%`, 
                                                name === 'avgScore' ? 'Average Score' : 'Attendance Rate'
                                            ]}
                                            labelFormatter={(label) => `Month: ${label}`}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="avgScore" stroke="#8884d8" strokeWidth={2} name="Average Score (%)" dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="attendance" stroke="#82ca9d" strokeWidth={2} name="Attendance Rate (%)" dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        No performance data available yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* SUBJECT AVERAGES */}
                        <Card>
                            <CardHeader>
                                <CardTitle>📚 Subject Averages</CardTitle>
                                <CardDescription>Overall class performance by subject</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {subjectAverageData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subjectAverageData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                                        <YAxis dataKey="subject" type="category" width={100} tick={{ fontSize: 12 }} />
                                        <Tooltip 
                                            formatter={(value: number) => [`${value}%`, 'Class Average']}
                                            labelFormatter={(label) => `Subject: ${label}`}
                                        />
                                        <Bar dataKey="avg" name="Class Average (%)" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                            {subjectAverageData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#8884d8" : "#82ca9d"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        No subject data available yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* ATTENDANCE VS MARKS */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>🔗 Attendance vs. Marks Correlation</CardTitle>
                                <CardDescription>Does attendance impact performance? Each dot represents a student.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {attendanceVsMarksData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            type="number" 
                                            dataKey="attendance" 
                                            name="Attendance" 
                                            unit="%" 
                                            domain={[0, 100]}
                                            tick={{ fontSize: 12 }}
                                            label={{ value: 'Attendance Rate (%)', position: 'bottom', offset: 0, fontSize: 12 }}
                                        />
                                        <YAxis 
                                            type="number" 
                                            dataKey="marks" 
                                            name="Marks" 
                                            unit="%" 
                                            domain={[0, 100]}
                                            tick={{ fontSize: 12 }}
                                            label={{ value: 'Test Scores (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                                        />
                                        <Tooltip 
                                            cursor={{ strokeDasharray: '3 3' }}
                                            formatter={(value: number, name: string) => [
                                                `${value}%`,
                                                name === 'Attendance' ? 'Attendance Rate' : 'Test Score'
                                            ]}
                                        />
                                        <Scatter name="Students" data={attendanceVsMarksData} fill="#8884d8" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        No attendance/marks correlation data available.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    )}
                </TabsContent>

                {/* ---------------- STUDENT LEVEL ANALYSIS ---------------- */}
                <TabsContent value="student" className="space-y-8">
                    {studentAnalysisLoading ? (
                        <div className="flex justify-center p-20">
                            <LoadingSpinner />
                        </div>
                    ) : studentsList.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            No students found in this class.
                        </div>
                    ) : (
                    <>
                    {/* CLASS SUMMARY HEADER */}
                    <div className="flex items-center gap-4 bg-secondary/10 p-4 rounded-lg border border-white/5">
                        <Users className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="text-sm font-medium">Class Overview</p>
                            <p className="text-xs text-muted-foreground">
                                {studentsList.length} students • Average Score: {studentsList.length > 0 ? Math.round(studentsList.reduce((a, s) => a + s.avgScore, 0) / studentsList.length) : 0}%
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* CLASS SUBJECT PERFORMANCE RADAR */}
                        <Card className="col-span-2 h-[450px]">
                            <CardHeader>
                                <CardTitle>🎯 Class Subject Performance Overview</CardTitle>
                                <CardDescription>
                                    Complete class average performance across all subjects
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[370px]">
                                {subjectAverageData.length > 0 ? (
                                <ResponsiveContainer>
                                    <RadarChart data={subjectAverageData.map(s => ({ subject: s.subject, score: s.avg, fullMark: 100 }))}>
                                        <PolarGrid gridType="polygon" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                                        <Radar dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} name="Class Average" />
                                        <Tooltip 
                                            formatter={(value: number) => [`${value}%`, 'Class Average']}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        No subject performance data available yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* TOP PERFORMERS & NEEDS ATTENTION */}
                        <Card>
                            <CardHeader><CardTitle>👥 Student Performance</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-medium mb-3 text-green-500 flex items-center"><TrendingUp className="w-4 h-4 mr-2" />Top Performers</h4>
                                    {studentsList.slice(0, 3).map((s, i) => (
                                        <div key={i} className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-2 flex justify-between items-center">
                                            <div>
                                                <p className="font-medium">{s.name}</p>
                                                <p className="text-xs text-muted-foreground">Attendance: {s.attendancePercentage}%</p>
                                            </div>
                                            <span className="text-green-600 font-bold">{s.avgScore}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium mb-3 text-red-500 flex items-center"><AlertCircle className="w-4 h-4 mr-2" />Needs Attention</h4>
                                    {studentsList.filter(s => s.avgScore < 60).length > 0 ? (
                                        studentsList.filter(s => s.avgScore < 60).slice(0, 3).map((s, i) => (
                                            <div key={i} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 mb-2 flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium">{s.name}</p>
                                                    <p className="text-xs text-muted-foreground">Attendance: {s.attendancePercentage}%</p>
                                                </div>
                                                <span className="text-red-600 font-bold">{s.avgScore}%</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">All students performing well! 🎉</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    </>
                    )}
                </TabsContent>

                {/* ---------------- TEST METRICS ---------------- */}
                <TabsContent value="test" className="space-y-6">
                    {testMetricsLoading ? (
                        <div className="flex justify-center p-20">
                            <LoadingSpinner />
                        </div>
                    ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* RECENT TEST PERFORMANCE */}
                        <Card>
                            <CardHeader>
                                <CardTitle>📝 Recent Test Performance</CardTitle>
                                <CardDescription>Comparing class average vs. top performer in each test</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {recentTestsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={recentTestsData}>
                                        <defs>
                                            <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorTop" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="test" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <Tooltip 
                                            formatter={(value: number, name: string) => [
                                                `${value}%`, 
                                                name === 'avg' ? 'Class Average' : 'Top Score'
                                            ]}
                                            labelFormatter={(label) => `Test: ${label}`}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="avg" stroke="#8884d8" fillOpacity={1} fill="url(#colorAvg)" name="Class Average (%)" />
                                        <Area type="monotone" dataKey="top" stroke="#82ca9d" fillOpacity={1} fill="url(#colorTop)" name="Top Score (%)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        No recent test data available yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* QUESTION TYPE DISTRIBUTION */}
                        <Card>
                            <CardHeader>
                                <CardTitle>🧠 Question Type Analysis</CardTitle>
                                <CardDescription>Breakdown of question types used across all tests</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {questionTypeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={questionTypeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={90}
                                            fill="#8884d8"
                                            paddingAngle={2}
                                            dataKey="value"
                                            nameKey="name"
                                        >
                                            {questionTypeData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: number) => [`${value} questions`]}
                                        />
                                        <Legend 
                                            layout="vertical"
                                            align="right"
                                            verticalAlign="middle"
                                            formatter={(value, entry: any) => (
                                                <span style={{ fontSize: '12px' }}>
                                                    {value} ({entry.payload?.value || 0})
                                                </span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        No question type data available yet.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    )}
                </TabsContent>

                {/* ---------------- CHAPTER & TOPIC ANALYTICS ---------------- */}
                <TabsContent value="topics" className="space-y-6">
                    {analyticsLoading ? (
                        <div className="flex justify-center p-20">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* CHAPTER PERFORMANCE */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Chapter Performance</CardTitle>
                                    <CardDescription>Average scores by chapter (sorted by performance)</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    {analyticsData.chapters.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.chapters} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" domain={[0, 100]} />
                                                <YAxis dataKey="name" type="category" width={100} />
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload[0]) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-background border rounded p-2">
                                                                    <p className="font-semibold">{data.name}</p>
                                                                    <p className="text-sm">Average: {data.avgScore}%</p>
                                                                    <p className="text-sm">Questions: {data.totalQuestions}</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="avgScore" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                                    {analyticsData.chapters.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.avgScore >= 80 ? "#00C49F" : entry.avgScore >= 60 ? "#8884d8" : "#ff7373"} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            No chapter data available. Make sure tests have chapter information.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* TOPIC PERFORMANCE */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Topic Performance</CardTitle>
                                    <CardDescription>Average scores by topic (sorted by performance)</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[400px]">
                                    {analyticsData.topics.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analyticsData.topics} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" domain={[0, 100]} />
                                                <YAxis dataKey="name" type="category" width={100} />
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload[0]) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-background border rounded p-2">
                                                                    <p className="font-semibold">{data.name}</p>
                                                                    <p className="text-sm">Average: {data.avgScore}%</p>
                                                                    <p className="text-sm">Questions: {data.totalQuestions}</p>
                                                                    <p className="text-xs text-muted-foreground">Chapters: {data.chapters.join(', ')}</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="avgScore" fill="#82ca9d" radius={[0, 4, 4, 0]}>
                                                    {analyticsData.topics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.avgScore >= 80 ? "#00C49F" : entry.avgScore >= 60 ? "#82ca9d" : "#ff7373"} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            No topic data available. Make sure tests have topic information.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* WEAK AREAS IDENTIFICATION */}
                    {!analyticsLoading && (analyticsData.chapters.length > 0 || analyticsData.topics.length > 0) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* WEAK CHAPTERS */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        Weak Chapters (Need Attention)
                                    </CardTitle>
                                    <CardDescription>Chapters with average score below 60%</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {analyticsData.chapters.filter(c => c.avgScore < 60).length > 0 ? (
                                        <div className="space-y-3">
                                            {analyticsData.chapters
                                                .filter(c => c.avgScore < 60)
                                                .sort((a, b) => a.avgScore - b.avgScore)
                                                .map((chapter, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                                        <div>
                                                            <p className="font-medium">{chapter.name}</p>
                                                            <p className="text-sm text-muted-foreground">{chapter.totalQuestions} questions</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-red-600">{chapter.avgScore}%</p>
                                                            <p className="text-xs text-muted-foreground">Average</p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">
                                            Great! No chapters need immediate attention.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* WEAK TOPICS */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-orange-500" />
                                        Weak Topics (Need Focus)
                                    </CardTitle>
                                    <CardDescription>Topics with average score below 60%</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {analyticsData.topics.filter(t => t.avgScore < 60).length > 0 ? (
                                        <div className="space-y-3">
                                            {analyticsData.topics
                                                .filter(t => t.avgScore < 60)
                                                .sort((a, b) => a.avgScore - b.avgScore)
                                                .map((topic, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 dark: bg-orange-950/20 rounded-lg">
                                                        <div>
                                                            <p className="font-medium">{topic.name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {topic.chapters.join(', ')} • {topic.totalQuestions} questions
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-orange-600">{topic.avgScore}%</p>
                                                            <p className="text-xs text-muted-foreground">Average</p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">
                                            Excellent! All topics are performing well.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AnalyticsDashboard;

// ---------- END OF FILE ----------
