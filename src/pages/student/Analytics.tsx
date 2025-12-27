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
import { ExpandableChartWidget } from "@/components/charts/ExpandableChart";
import { TrendingUp, AlertCircle, Award, Target, BookOpen, Loader2, ArrowLeft } from "lucide-react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

const NEON_COLORS = {
    primary: "#8884d8",
    secondary: "#82ca9d",
    accent: "#ffc658",
    danger: "#ff7373"
};

const StudentAnalytics = () => {
    const navigate = useNavigate();
    const { profile, profileLoading } = useAuth();

    const queryClient = useQueryClient();

    // Stats Summary Query
    const { data: stats = { overallPercentage: 0, totalTests: 0, bestSubject: "N/A", attendancePercentage: 0 }, isLoading: statsLoading } = useQuery({
        queryKey: ["student-analytics-stats", profile?.id],
        queryFn: () => getStudentStatsSummary(profile!.id),
        enabled: !!profile,
    });

    // Subject Performance Query
    const { data: subjectData = [], isLoading: subjectLoading } = useQuery({
        queryKey: ["student-analytics-subjects", profile?.id],
        queryFn: () => getStudentSubjectPerformance(profile!.id),
        enabled: !!profile,
    });

    // Progress Trend Query
    const { data: trendData = [], isLoading: trendLoading } = useQuery({
        queryKey: ["student-analytics-trend", profile?.id],
        queryFn: () => getStudentProgressTrend(profile!.id),
        enabled: !!profile,
    });

    // Strengths & Weaknesses Query
    const { data: swData = { strengths: [], weaknesses: [] }, isLoading: swLoading } = useQuery({
        queryKey: ["student-analytics-sw", profile?.id],
        queryFn: () => getStudentStrengthsWeaknesses(profile!.id),
        enabled: !!profile,
    });

    // Chapter & Topic Analytics Query
    const { data: chapterTopicData = { chapters: [], topics: [] }, isLoading: ctLoading } = useQuery({
        queryKey: ["student-analytics-ct", profile?.id],
        queryFn: () => getStudentChapterTopicAnalytics(profile!.id),
        enabled: !!profile,
    });

    const strengths = swData.strengths || [];
    const weaknesses = swData.weaknesses || [];
    const loading = statsLoading || subjectLoading || trendLoading || swLoading || ctLoading;

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
        <div className="min-h-screen p-3 sm:p-6 space-y-4 sm:space-y-8 pt-16 sm:pt-20">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 sm:gap-4"
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/student")}
                    className="shrink-0"
                >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">Analytics Dashboard 📊</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Deep insights into your performance</p>
                </div>
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">My Performance 📈</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Track your academic progress</p>
                </div>

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
                    <ExpandableChartWidget
                        title="Subject Performance"
                        description="Your strengths across different subjects"
                        insights="A balanced performance across subjects indicates a strong foundation. Focus on maintaining consistency in your top subjects while gradually improving others."
                        className="h-[400px]"
                        renderSmall={() => (
                            radarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#444" />
                                        <PolarAngleAxis dataKey="subject" stroke="#888" tick={{ fontSize: 10 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#888" tick={false} axisLine={false} />
                                        <Radar name="My Score" dataKey="A" stroke={NEON_COLORS.primary} fill={NEON_COLORS.primary} fillOpacity={0.6} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No subject data available yet. Complete some tests to see your performance.
                                </div>
                            )
                        )}
                        renderExpanded={() => (
                            radarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#555" gridType="polygon" />
                                        <PolarAngleAxis dataKey="subject" stroke="#CCC" tick={{ fontSize: 14, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#888" tick={{ fill: '#888' }} />
                                        <Radar
                                            name="My Score"
                                            dataKey="A"
                                            stroke={NEON_COLORS.primary}
                                            strokeWidth={3}
                                            fill={NEON_COLORS.primary}
                                            fillOpacity={0.5}
                                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(26, 26, 26, 0.95)',
                                                border: '1px solid #333',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                            }}
                                            itemStyle={{ color: '#fff', fontSize: '14px' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No data available.
                                </div>
                            )
                        )}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <ExpandableChartWidget
                        title="Progress Trend"
                        description="Your overall score improvement over time"
                        insights="Your learning curve is looking positive! Consistent scores in recent months show good retention. Keep practicing to maintain this upward trajectory."
                        className="h-[400px]"
                        renderSmall={() => (
                            trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorScoreStudent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={NEON_COLORS.secondary} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={NEON_COLORS.secondary} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 10 }} />
                                        <YAxis stroke="#888" domain={[0, 100]} tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                        <Area type="monotone" dataKey="score" stroke={NEON_COLORS.secondary} fillOpacity={1} fill="url(#colorScoreStudent)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No trend data available yet. Your progress will appear after completing tests.
                                </div>
                            )
                        )}
                        renderExpanded={() => (
                            trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorScoreStudentExpanded" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={NEON_COLORS.secondary} stopOpacity={0.6} />
                                                <stop offset="95%" stopColor={NEON_COLORS.secondary} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            stroke="#CCC"
                                            tick={{ fontSize: 14 }}
                                            tickMargin={12}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#CCC"
                                            domain={[0, 100]}
                                            tick={{ fontSize: 14 }}
                                            tickFormatter={(val) => `${val}%`}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(26, 26, 26, 0.95)',
                                                border: '1px solid #333',
                                                borderRadius: '8px',
                                                padding: '12px',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                            }}
                                            itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                                            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="score"
                                            stroke={NEON_COLORS.secondary}
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorScoreStudentExpanded)"
                                            activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No data available.
                                </div>
                            )
                        )}
                    />
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ExpandableChartWidget
                        title="Chapter Performance"
                        description="Average scores by chapter"
                        insights="Understanding chapter-wise performance helps identify specific knowledge gaps. Focus on chapters with lower scores."
                        className="h-[400px]"
                        renderSmall={() => (
                            chapterTopicData.chapters.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chapterTopicData.chapters.slice(0, 8)} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1a1a1a',
                                                border: '1px solid #333'
                                            }}
                                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload[0]) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-background border rounded p-2 text-xs">
                                                            <p className="font-semibold">{data.name}</p>
                                                            <p>Score: {data.avgScore}%</p>
                                                            <p>Questions: {data.totalQuestions}</p>
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
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No chapter data available.
                                </div>
                            )
                        )}
                        renderExpanded={() => (
                            chapterTopicData.chapters.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chapterTopicData.chapters} layout="vertical" margin={{ left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                                        <XAxis type="number" domain={[0, 100]} stroke="#888" />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 14 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1a1a1a',
                                                border: '1px solid #333',
                                                fontSize: '14px'
                                            }}
                                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                                        />
                                        <Bar dataKey="avgScore" radius={[0, 4, 4, 0]} barSize={30}>
                                            {chapterTopicData.chapters.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.avgScore >= 80 ? "#00C49F" : entry.avgScore >= 60 ? "#8884d8" : "#ff7373"}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No  data available.
                                </div>
                            )
                        )}
                    />

                    <ExpandableChartWidget
                        title="Topic Performance"
                        description="Average scores by topic"
                        insights="Drill down into specific topics to pinpoint precisely what concepts need review."
                        className="h-[400px]"
                        renderSmall={() => (
                            chapterTopicData.topics.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chapterTopicData.topics.slice(0, 8)} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload[0]) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-background border rounded p-2 text-xs">
                                                            <p className="font-semibold">{data.name}</p>
                                                            <p>Score: {data.avgScore}%</p>
                                                            <p className="text-muted-foreground">{data.chapters.join(', ')}</p>
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
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No topic data available.
                                </div>
                            )
                        )}
                        renderExpanded={() => (
                            chapterTopicData.topics.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chapterTopicData.topics} layout="vertical" margin={{ left: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                                        <XAxis type="number" domain={[0, 100]} stroke="#888" />
                                        <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 14 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                                        />
                                        <Bar dataKey="avgScore" radius={[0, 4, 4, 0]} barSize={30}>
                                            {chapterTopicData.topics.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.avgScore >= 80 ? "#00C49F" : entry.avgScore >= 60 ? "#82ca9d" : "#ff7373"}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    No data available.
                                </div>
                            )
                        )}
                    />
                </div>

                {/* Weak Areas Summary */}
                {(chapterTopicData.chapters.filter(c => c.avgScore < 60).length > 0 ||
                    chapterTopicData.topics.filter(t => t.avgScore < 60).length > 0) && (
                        <Card className="glass-card mt-6">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-500" /> Focus Areas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            </CardContent>
                        </Card>
                    )}
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
