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
import { getTeacherClasses, FlattenedClass, getChapterTopicAnalytics } from "@/services/academic";
import { useAuth } from "@/auth/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

// ---------------- MOCK DATA ----------------
const performanceTrendData = [
    { month: "Jan", avgScore: 65, attendance: 85 },
    { month: "Feb", avgScore: 68, attendance: 82 },
    { month: "Mar", avgScore: 75, attendance: 88 },
    { month: "Apr", avgScore: 72, attendance: 86 },
    { month: "May", avgScore: 82, attendance: 92 },
    { month: "Jun", avgScore: 85, attendance: 90 },
];

const attendanceVsMarksData = [
    { attendance: 65, marks: 55, student: "S1" },
    { attendance: 70, marks: 62, student: "S2" },
    { attendance: 75, marks: 68, student: "S3" },
    { attendance: 80, marks: 75, student: "S4" },
    { attendance: 85, marks: 82, student: "S5" },
    { attendance: 90, marks: 88, student: "S6" },
    { attendance: 92, marks: 95, student: "S7" },
    { attendance: 95, marks: 92, student: "S8" },
    { attendance: 60, marks: 45, student: "S9" },
    { attendance: 98, marks: 98, student: "S10" },
];

const subjectAverageData = [
    { subject: "Math", avg: 78 },
    { subject: "Physics", avg: 82 },
    { subject: "Chemistry", avg: 75 },
    { subject: "Biology", avg: 85 },
    { subject: "English", avg: 88 },
    { subject: "History", avg: 72 },
];

const recentTestsData = [
    { test: "Unit Test 1", avg: 75, top: 95 },
    { test: "Unit Test 2", avg: 78, top: 98 },
    { test: "Mid Term", avg: 72, top: 92 },
    { test: "Unit Test 3", avg: 82, top: 96 },
    { test: "Final Mock", avg: 85, top: 99 },
];

const questionTypeData = [
    { name: "MCQ", value: 40 },
    { name: "Short Answer", value: 30 },
    { name: "Long Answer", value: 20 },
    { name: "Problem Solving", value: 10 },
];

const studentsList = [
    { id: "S1", name: "Alice Johnson" },
    { id: "S2", name: "Bob Smith" },
    { id: "S3", name: "Charlie Brown" },
];

const studentAnalyticsData: Record<string, any> = {
    S1: {
        radar: [
            { subject: "Math", A: 140, B: 110, fullMark: 150 },
            { subject: "Physics", A: 130, B: 130, fullMark: 150 },
            { subject: "Chemistry", A: 120, B: 130, fullMark: 150 },
            { subject: "Biology", A: 110, B: 100, fullMark: 150 },
            { subject: "English", A: 100, B: 90, fullMark: 150 },
            { subject: "History", A: 90, B: 85, fullMark: 150 },
        ],
        strengths: [
            { subject: "Mathematics", desc: "Consistently scores above 90%" },
            { subject: "Physics", desc: "Strong conceptual understanding" },
        ],
        weaknesses: [
            { subject: "History", desc: "Struggles with dates and events" },
        ],
    },
    S2: {
        radar: [
            { subject: "Math", A: 90, B: 110, fullMark: 150 },
            { subject: "Physics", A: 85, B: 130, fullMark: 150 },
            { subject: "Chemistry", A: 95, B: 130, fullMark: 150 },
            { subject: "Biology", A: 130, B: 100, fullMark: 150 },
            { subject: "English", A: 120, B: 90, fullMark: 150 },
            { subject: "History", A: 110, B: 85, fullMark: 150 },
        ],
        strengths: [
            { subject: "Biology", desc: "Excellent diagrammatic skills" },
            { subject: "English", desc: "Strong vocabulary and grammar" },
        ],
        weaknesses: [
            { subject: "Physics", desc: "Needs improvement in numericals" },
        ],
    },
    S3: {
        radar: [
            { subject: "Math", A: 110, B: 110, fullMark: 150 },
            { subject: "Physics", A: 100, B: 130, fullMark: 150 },
            { subject: "Chemistry", A: 105, B: 130, fullMark: 150 },
            { subject: "Biology", A: 95, B: 100, fullMark: 150 },
            { subject: "English", A: 115, B: 90, fullMark: 150 },
            { subject: "History", A: 125, B: 85, fullMark: 150 },
        ],
        strengths: [
            { subject: "History", desc: "Great retention of facts" },
            { subject: "Math", desc: "Good at algebra" },
        ],
        weaknesses: [
            { subject: "Biology", desc: "Struggles with terminology" },
        ],
    },
};

// ---------------- NEW TOPIC/CHAPTER DATA ----------------
const topicChapterData: Record<string, any> = {
    S1: {
        Math: {
            topics: [
                {
                    topic: "Algebra",
                    avg: 85,
                    chapters: [
                        { chapter: "Linear Equations", score: 88 },
                        { chapter: "Quadratic Equations", score: 80 },
                        { chapter: "Polynomials", score: 90 },
                    ],
                },
                {
                    topic: "Geometry",
                    avg: 78,
                    chapters: [
                        { chapter: "Triangles", score: 74 },
                        { chapter: "Circles", score: 81 },
                        { chapter: "Coordinate Geometry", score: 79 },
                    ],
                },
            ],
        },
        Physics: {
            topics: [
                {
                    topic: "Mechanics",
                    avg: 92,
                    chapters: [
                        { chapter: "Motion", score: 90 },
                        { chapter: "Forces", score: 94 },
                        { chapter: "Work & Energy", score: 92 },
                    ],
                },
                {
                    topic: "Thermodynamics",
                    avg: 85,
                    chapters: [
                        { chapter: "Heat", score: 82 },
                        { chapter: "Laws of Thermo", score: 88 },
                    ],
                },
            ],
        },
        Chemistry: {
            topics: [
                {
                    topic: "Organic",
                    avg: 75,
                    chapters: [
                        { chapter: "Hydrocarbons", score: 72 },
                        { chapter: "Alcohols", score: 78 },
                    ],
                },
                {
                    topic: "Inorganic",
                    avg: 82,
                    chapters: [
                        { chapter: "Periodic Table", score: 85 },
                        { chapter: "Bonding", score: 80 },
                    ],
                },
            ],
        },
        Biology: {
            topics: [
                {
                    topic: "Human Physiology",
                    avg: 88,
                    chapters: [
                        { chapter: "Digestion", score: 90 },
                        { chapter: "Respiration", score: 86 },
                    ],
                },
            ],
        },
        English: {
            topics: [
                {
                    topic: "Grammar",
                    avg: 70,
                    chapters: [
                        { chapter: "Tenses", score: 65 },
                        { chapter: "Active/Passive", score: 75 },
                    ],
                },
            ],
        },
        History: {
            topics: [
                {
                    topic: "World War",
                    avg: 65,
                    chapters: [
                        { chapter: "WW1", score: 60 },
                        { chapter: "WW2", score: 70 },
                    ],
                },
            ],
        },
    },
    S2: {
        Math: {
            topics: [
                {
                    topic: "Calculus",
                    avg: 60,
                    chapters: [
                        { chapter: "Limits", score: 55 },
                        { chapter: "Derivatives", score: 65 },
                    ],
                },
            ],
        },
        // Add other subjects as needed...
    },
    S3: {
        Math: {
            topics: [
                {
                    topic: "Statistics",
                    avg: 95,
                    chapters: [
                        { chapter: "Mean/Median", score: 98 },
                        { chapter: "Probability", score: 92 },
                    ],
                },
            ],
        },
    },
};

const NEON_COLORS = {
    primary: "#8884d8",
    secondary: "#82ca9d",
    accent: "#ffc658",
    danger: "#ff7373",
};

// ---------------- MAIN COMPONENT ----------------
const AnalyticsDashboard = () => {
    const { profile, profileLoading } = useAuth();
    const [classes, setClasses] = useState<FlattenedClass[]>([]);
    const [selectedClass, setSelectedClass] = useState<FlattenedClass | undefined>();
    const navigate = useNavigate();
    const [selectedStudent, setSelectedStudent] = useState("S1");
    const [loading, setLoading] = useState(true);

    // new state for topic/chapter analytics
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [analyticsData, setAnalyticsData] = useState<{
        chapters: { name: string; avgScore: number; totalQuestions: number }[];
        topics: { name: string; avgScore: number; totalQuestions: number; chapters: string[] }[];
    }>({ chapters: [], topics: [] });
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Fetch analytics data when class changes
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PERFORMANCE TREND */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Class Performance Trend</CardTitle>
                                <CardDescription>Average scores over the last 6 months</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={performanceTrendData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="avgScore" stroke="#8884d8" strokeWidth={2} />
                                        <Line type="monotone" dataKey="attendance" stroke="#82ca9d" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* SUBJECT AVERAGES */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Subject Averages</CardTitle>
                                <CardDescription>Overall class performance by subject</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subjectAverageData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" domain={[0, 100]} />
                                        <YAxis dataKey="subject" type="category" width={80} />
                                        <Tooltip />
                                        <Bar dataKey="avg" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                            {subjectAverageData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#8884d8" : "#82ca9d"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* ATTENDANCE VS MARKS */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Attendance vs. Marks Correlation</CardTitle>
                                <CardDescription>Does attendance impact performance?</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart>
                                        <CartesianGrid />
                                        <XAxis type="number" dataKey="attendance" name="Attendance" unit="%" />
                                        <YAxis type="number" dataKey="marks" name="Marks" unit="%" />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter name="Students" data={attendanceVsMarksData} fill="#8884d8" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ---------------- STUDENT LEVEL ANALYSIS ---------------- */}
                <TabsContent value="student" className="space-y-8">
                    <div className="flex items-center gap-4 bg-secondary/10 p-4 rounded-lg border border-white/5">
                        <Users className="w-5 h-5 text-blue-500" />
                        <label className="text-sm font-medium">Select Student</label>

                        <Select value={selectedStudent} onValueChange={(v) => { setSelectedStudent(v); setSelectedSubject(null); }}>
                            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {studentsList.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* SUBJECT RADAR */}
                        <Card className="col-span-2 h-[450px]">
                            <CardHeader>
                                <CardTitle>Subject-wise Performance</CardTitle>
                                <CardDescription>{studentsList.find(s => s.id === selectedStudent)?.name}</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[370px]">
                                <ResponsiveContainer>
                                    <RadarChart data={studentAnalyticsData[selectedStudent].radar}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" />
                                        <PolarRadiusAxis />
                                        <Radar dataKey="B" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} name="Class Avg" />
                                        <Radar dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} name="Student" />
                                        <Legend />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* STRENGTH & WEAKNESS */}
                        <Card>
                            <CardHeader><CardTitle>Strength & Weakness</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-medium mb-3 text-green-500 flex items-center"><TrendingUp className="w-4 h-4 mr-2" />Strengths</h4>
                                    {studentAnalyticsData[selectedStudent].strengths.map((s: any, i: number) => (
                                        <div key={i} className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                            <p className="font-medium">{s.subject}</p>
                                            <p className="text-xs text-muted-foreground">{s.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium mb-3 text-red-500 flex items-center"><AlertCircle className="w-4 h-4 mr-2" />Weaknesses</h4>
                                    {studentAnalyticsData[selectedStudent].weaknesses.map((s: any, i: number) => (
                                        <div key={i} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                            <p className="font-medium">{s.subject}</p>
                                            <p className="text-xs text-muted-foreground">{s.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ---------------- TOPIC / CHAPTER PERFORMANCE WITH STRENGTH & WEAKNESS ---------------- */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Topic / Chapter-wise Performance</CardTitle>
                            <CardDescription>Drill down into topics & chapters</CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {/* SUBJECT SELECTOR */}
                            <Select value={selectedSubject || undefined} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="w-64"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>
                                    {studentAnalyticsData[selectedStudent].radar.map((s: any) => (
                                        <SelectItem key={s.subject} value={s.subject}>{s.subject}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* TOPIC BAR CHART */}
                            {selectedSubject && topicChapterData[selectedStudent]?.[selectedSubject] && (
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={topicChapterData[selectedStudent][selectedSubject].topics}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="topic" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="avg" fill={NEON_COLORS.primary} name="Avg Score" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}

                            {/* CHAPTER CHARTS */}
                            {selectedSubject && topicChapterData[selectedStudent]?.[selectedSubject] && (
                                <div className="space-y-6">
                                    {topicChapterData[selectedStudent][selectedSubject].topics.map((topic: any, i: number) => (
                                        <div key={i} className="p-4 border rounded-lg bg-secondary/5">
                                            <h3 className="text-lg font-semibold mb-4">{topic.topic}</h3>
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={topic.chapters}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="chapter" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Bar dataKey="score" fill={NEON_COLORS.secondary} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedSubject && !topicChapterData[selectedStudent]?.[selectedSubject] && (
                                <div className="text-center py-10 text-muted-foreground">
                                    No detailed topic data available for {selectedSubject}.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ---------------- TEST METRICS ---------------- */}
                <TabsContent value="test" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* RECENT TEST PERFORMANCE */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Test Performance</CardTitle>
                                <CardDescription>Average vs Top scores in recent tests</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
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
                                        <XAxis dataKey="test" />
                                        <YAxis />
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="avg" stroke="#8884d8" fillOpacity={1} fill="url(#colorAvg)" />
                                        <Area type="monotone" dataKey="top" stroke="#82ca9d" fillOpacity={1} fill="url(#colorTop)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* QUESTION TYPE DISTRIBUTION */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Question Type Analysis</CardTitle>
                                <CardDescription>Distribution of question types in tests</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={questionTypeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {questionTypeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
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
