import { motion } from "framer-motion";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Award, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// Mock Data for the logged-in student
const studentData = {
    radar: [
        { subject: "Math", A: 140, fullMark: 150 },
        { subject: "Physics", A: 130, fullMark: 150 },
        { subject: "Chemistry", A: 120, fullMark: 150 },
        { subject: "Biology", A: 110, fullMark: 150 },
        { subject: "English", A: 100, fullMark: 150 },
        { subject: "History", A: 90, fullMark: 150 },
    ],
    performanceTrend: [
        { month: "Jan", score: 75 },
        { month: "Feb", score: 78 },
        { month: "Mar", score: 82 },
        { month: "Apr", score: 80 },
        { month: "May", score: 88 },
        { month: "Jun", score: 92 },
    ],
    strengths: [
        { subject: "Mathematics", desc: "Consistently scores above 90%" },
        { subject: "Physics", desc: "Strong conceptual understanding" }
    ],
    weaknesses: [
        { subject: "History", desc: "Struggles with dates and events" }
    ]
};

const NEON_COLORS = {
    primary: "#8884d8",
    secondary: "#82ca9d",
    accent: "#ffc658",
    danger: "#ff7373"
};

const StudentAnalytics = () => {
    const navigate = useNavigate();

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Overall GPA</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neon-purple">3.8</div>
                        <p className="text-xs text-green-500 flex items-center mt-1">
                            <TrendingUp className="w-3 h-3 mr-1" /> Top 10% of class
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tests Taken</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neon-cyan">12</div>
                        <p className="text-xs text-muted-foreground mt-1">This semester</p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Best Subject</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-neon-green">Mathematics</div>
                        <p className="text-xs text-muted-foreground mt-1">98% Average</p>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">92%</div>
                        <p className="text-xs text-muted-foreground mt-1">Excellent</p>
                    </CardContent>
                </Card>
            </div>

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
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={studentData.radar}>
                                    <PolarGrid stroke="#444" />
                                    <PolarAngleAxis dataKey="subject" stroke="#888" />
                                    <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="#888" />
                                    <Radar name="My Score" dataKey="A" stroke={NEON_COLORS.primary} fill={NEON_COLORS.primary} fillOpacity={0.6} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                </RadarChart>
                            </ResponsiveContainer>
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
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={studentData.performanceTrend}>
                                    <defs>
                                        <linearGradient id="colorScoreStudent" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={NEON_COLORS.secondary} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={NEON_COLORS.secondary} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="month" stroke="#888" />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                                    <Area type="monotone" dataKey="score" stroke={NEON_COLORS.secondary} fillOpacity={1} fill="url(#colorScoreStudent)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-neon-blue" /> Key Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {studentData.strengths.map((item, idx) => (
                            <div key={idx} className="bg-green-500/10 p-4 rounded-lg border border-green-500/20 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-green-400">{item.subject}</p>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-red-500" /> Areas for Improvement
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {studentData.weaknesses.map((item, idx) => (
                            <div key={idx} className="bg-red-500/10 p-4 rounded-lg border border-red-500/20 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-red-400">{item.subject}</p>
                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                </div>
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
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
