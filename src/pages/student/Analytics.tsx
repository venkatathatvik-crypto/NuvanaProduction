import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    AreaChart,
    Area,
    BarChart,
    Bar,
    Cell
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Award, Target, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import {
    getStudentStatsSummary,
    getStudentSubjectPerformance,
    getStudentProgressTrend,
    getStudentStrengthsWeaknesses,
    getStudentChapterTopicAnalytics,
    StudentStatsSummary,
    SubjectPerformance,
    ProgressTrendPoint,
    StrengthWeaknessItem,
    StudentChapterTopicAnalytics
} from "@/services/academic";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";

const NEON_COLORS = {
    primary: "#8884d8",
    secondary: "#82ca9d",
    accent: "#ffc658",
    danger: "#ff7373"
};

const StudentAnalytics = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useAuth();
    
    // State for all analytics data
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StudentStatsSummary>({
        overallPercentage: 0,
        totalTests: 0,
        bestSubject: "N/A",
        attendancePercentage: 0
    });
    const [subjectData, setSubjectData] = useState<SubjectPerformance[]>([]);
    const [trendData, setTrendData] = useState<ProgressTrendPoint[]>([]);
    const [strengths, setStrengths] = useState<StrengthWeaknessItem[]>([]);
    const [weaknesses, setWeaknesses] = useState<StrengthWeaknessItem[]>([]);
    const [chapterTopicData, setChapterTopicData] = useState<StudentChapterTopicAnalytics>({
        chapters: [],
        topics: []
    });

    // Fetch all analytics data
    useEffect(() => {
        const fetchAnalytics = async () => {
            if (profileLoading) return;
            if (!profile) {
                setLoading(false);
                return;
            }

            try {
                // Fetch all data in parallel
                const [
                    statsResult,
                    subjectResult,
                    trendResult,
                    strengthsResult,
                    chapterTopicResult
                ] = await Promise.all([
                    getStudentStatsSummary(profile.id),
                    getStudentSubjectPerformance(profile.id),
                    getStudentProgressTrend(profile.id),
                    getStudentStrengthsWeaknesses(profile.id),
                    getStudentChapterTopicAnalytics(profile.id)
                ]);

                setStats(statsResult);
                setSubjectData(subjectResult);
                setTrendData(trendResult);
                setStrengths(strengthsResult.strengths);
                setWeaknesses(strengthsResult.weaknesses);
                setChapterTopicData(chapterTopicResult);
            } catch (error) {
                console.error("Error fetching analytics:", error);
                toast.error("Failed to load analytics data");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [profile, profileLoading]);

    if (loading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    // Transform subject data for radar chart
    const radarData = subjectData.map(s => ({
        subject: s.subject,
        A: s.score,
        fullMark: s.fullMark
    }));

    return (
        <div className="min-h-screen p-6 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-between items-center"
            >
                <div>
                    <h1 className="text-4xl font-bold neon-text mb-2">My Performance 📈</h1>
                    <p className="text-muted-foreground">Track your academic progress</p>
                </div>
                <Button variant="outline" className="glass" onClick={() => navigate("/student")}>
                    Back to Dashboard
                </Button>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Overall Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neon-purple">{stats.overallPercentage}%</div>
                        <p className="text-xs text-green-500 flex items-center mt-1">
                            <TrendingUp className="w-3 h-3 mr-1" /> Average across all tests
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tests Taken</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neon-cyan">{stats.totalTests}</div>
                        <p className="text-xs text-muted-foreground mt-1">Graded tests completed</p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Best Subject</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neon-green truncate">{stats.bestSubject}</div>
                        <p className="text-xs text-muted-foreground mt-1">Highest average score</p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">{stats.attendancePercentage}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.attendancePercentage >= 90 ? "Excellent" : stats.attendancePercentage >= 75 ? "Good" : "Needs improvement"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="glass-card h-[400px]">
                        <CardHeader>
                            <CardTitle>Subject Performance</CardTitle>
                            <CardDescription>Your strengths across different subjects</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[320px]">
                            {radarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#444" />
                                        <PolarAngleAxis dataKey="subject" stroke="#888" />
                                        <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#888" />
                                        <Radar name="My Score" dataKey="A" stroke={NEON_COLORS.primary} fill={NEON_COLORS.primary} fillOpacity={0.6} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No subject data available yet. Complete some tests to see your performance.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="glass-card h-[400px]">
                        <CardHeader>
                            <CardTitle>Progress Trend</CardTitle>
                            <CardDescription>Your overall score improvement over time</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[320px]">
                            {trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorScoreStudent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={NEON_COLORS.secondary} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={NEON_COLORS.secondary} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="month" stroke="#888" />
                                        <YAxis stroke="#888" domain={[0, 100]} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                        <Area type="monotone" dataKey="score" stroke={NEON_COLORS.secondary} fillOpacity={1} fill="url(#colorScoreStudent)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No trend data available yet. Your progress will appear after completing tests.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-neon-blue" /> Key Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {strengths.length > 0 ? (
                            strengths.map((item, idx) => (
                                <div key={idx} className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-green-400">{item.subject}</p>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-4">
                                Complete more tests to identify your strengths.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-red-500" /> Areas for Improvement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {weaknesses.length > 0 ? (
                            weaknesses.map((item, idx) => (
                                <div key={idx} className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-red-400">{item.subject}</p>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-4">
                                Great job! No significant weaknesses identified.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Chapter & Topic Performance Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-purple-500" /> Chapter & Topic Performance
                        </CardTitle>
                        <CardDescription>Your performance breakdown by chapters and topics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(chapterTopicData.chapters.length > 0 || chapterTopicData.topics.length > 0) ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Chapter Performance */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Chapter Performance</h3>
                                    {chapterTopicData.chapters.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chapterTopicData.chapters.slice(0, 8)} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" domain={[0, 100]} />
                                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload[0]) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-background border rounded p-2">
                                                                    <p className="font-semibold">{data.name}</p>
                                                                    <p className="text-sm">Score: {data.avgScore}%</p>
                                                                    <p className="text-sm">Questions: {data.totalQuestions}</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                                                    {chapterTopicData.chapters.slice(0, 8).map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={entry.avgScore >= 80 ? "#00C49F" : entry.avgScore >= 60 ? "#8884d8" : "#ff7373"} 
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">No chapter data available.</p>
                                    )}
                                </div>

                                {/* Topic Performance */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Topic Performance</h3>
                                    {chapterTopicData.topics.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chapterTopicData.topics.slice(0, 8)} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" domain={[0, 100]} />
                                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload[0]) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-background border rounded p-2">
                                                                    <p className="font-semibold">{data.name}</p>
                                                                    <p className="text-sm">Score: {data.avgScore}%</p>
                                                                    <p className="text-sm">Questions: {data.totalQuestions}</p>
                                                                    <p className="text-xs text-muted-foreground">Chapters: {data.chapters.join(', ')}</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                                                    {chapterTopicData.topics.slice(0, 8).map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={entry.avgScore >= 80 ? "#00C49F" : entry.avgScore >= 60 ? "#82ca9d" : "#ff7373"} 
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-center text-muted-foreground py-8">No topic data available.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No chapter/topic data available yet.</p>
                                <p className="text-sm">Complete tests with chapter and topic information to see your performance breakdown.</p>
                            </div>
                        )}

                        {/* Weak Areas Summary */}
                        {(chapterTopicData.chapters.filter(c => c.avgScore < 60).length > 0 || 
                          chapterTopicData.topics.filter(t => t.avgScore < 60).length > 0) && (
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Weak Chapters */}
                                {chapterTopicData.chapters.filter(c => c.avgScore < 60).length > 0 && (
                                    <div className="bg-red-500/5 rounded-lg p-4 border border-red-500/20">
                                        <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Chapters to Focus On
                                        </h4>
                                        <div className="space-y-2">
                                            {chapterTopicData.chapters
                                                .filter(c => c.avgScore < 60)
                                                .slice(0, 3)
                                                .map((chapter, idx) => (
                                                    <div key={idx} className="flex justify-between items-center">
                                                        <span className="text-sm">{chapter.name}</span>
                                                        <span className="text-red-400 font-medium">{chapter.avgScore}%</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Weak Topics */}
                                {chapterTopicData.topics.filter(t => t.avgScore < 60).length > 0 && (
                                    <div className="bg-orange-500/5 rounded-lg p-4 border border-orange-500/20">
                                        <h4 className="font-semibold text-orange-400 mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Topics to Focus On
                                        </h4>
                                        <div className="space-y-2">
                                            {chapterTopicData.topics
                                                .filter(t => t.avgScore < 60)
                                                .slice(0, 3)
                                                .map((topic, idx) => (
                                                    <div key={idx} className="flex justify-between items-center">
                                                        <span className="text-sm">{topic.name}</span>
                                                        <span className="text-orange-400 font-medium">{topic.avgScore}%</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

// Helper component for the check icon
function CheckCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}

export default StudentAnalytics;
