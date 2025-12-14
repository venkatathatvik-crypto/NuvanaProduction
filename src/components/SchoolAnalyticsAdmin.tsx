import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, GraduationCap, Award, BookOpen } from 'lucide-react';

// Mock Data Generators - In a real app, this would come from your backend
const generateSchoolStats = () => ({
    totalStudents: 1250,
    totalTeachers: 85,
    averageAttendance: 92,
    averageGrade: 'B+',
    passPercentage: 94
});

const generateGradePerformanceData = () => [
    { name: 'Grade 6', math: 78, science: 82, english: 85, avg: 81.6 },
    { name: 'Grade 7', math: 75, science: 79, english: 83, avg: 79 },
    { name: 'Grade 8', math: 72, science: 76, english: 80, avg: 76 },
    { name: 'Grade 9', math: 80, science: 85, english: 78, avg: 81 },
    { name: 'Grade 10', math: 85, science: 88, english: 82, avg: 85 },
    { name: 'Grade 11', math: 70, science: 75, english: 76, avg: 73.6 },
    { name: 'Grade 12', math: 88, science: 90, english: 85, avg: 87.6 },
];

const generateSubjectPerformanceData = () => [
    { name: 'Mathematics', score: 82, attendance: 90 },
    { name: 'Science', score: 79, attendance: 88 },
    { name: 'English', score: 85, attendance: 92 },
    { name: 'History', score: 76, attendance: 85 },
    { name: 'Geography', score: 78, attendance: 86 },
    { name: 'Computer Sci', score: 88, attendance: 94 },
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

const SchoolAnalyticsAdmin = () => {
    const [stats, setStats] = useState(generateSchoolStats());
    const [gradeData, setGradeData] = useState(generateGradePerformanceData());
    const [subjectData, setSubjectData] = useState(generateSubjectPerformanceData());
    const [selectedGradeView, setSelectedGradeView] = useState('all');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="glass-card bg-primary/10 border-primary/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                            <h3 className="text-3xl font-bold mt-1 text-primary">{stats.totalStudents}</h3>
                        </div>
                        <Users className="w-8 h-8 text-primary/60" />
                    </CardContent>
                </Card>
                <Card className="glass-card bg-green-500/10 border-green-500/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Pass Rate</p>
                            <h3 className="text-3xl font-bold mt-1 text-green-500">{stats.passPercentage}%</h3>
                        </div>
                        <Award className="w-8 h-8 text-green-500/60" />
                    </CardContent>
                </Card>
                <Card className="glass-card bg-green-500/10 border-green-500/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg Attendance</p>
                            <h3 className="text-3xl font-bold mt-1 text-green-500">{stats.averageAttendance}%</h3>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-500/60" />
                    </CardContent>
                </Card>
                <Card className="glass-card bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">School Avg</p>
                            <h3 className="text-3xl font-bold mt-1 text-blue-500">{stats.averageGrade}</h3>
                        </div>
                        <GraduationCap className="w-8 h-8 text-blue-500/60" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle>Grade-wise Performance</CardTitle>
                        <CardDescription>Average scores across core subjects per grade</CardDescription>
                    </CardHeader>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend />
                                <Bar dataKey="avg" name="Overall Avg" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="math" name="Math" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="science" name="Science" fill="#ffc658" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="glass-card p-6">
                    <CardHeader className="px-0 pt-0">
                        <CardTitle>Subject Performance Trends</CardTitle>
                        <CardDescription>Overall performance distribution across key subjects</CardDescription>
                    </CardHeader>
                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={subjectData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="score" name="Avg Score" stroke="#8884d8" strokeWidth={3} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="attendance" name="Attendance" stroke="#82ca9d" strokeWidth={2} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card className="glass-card p-6">
                <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Detailed Grade Analytics</CardTitle>
                        <CardDescription>Deep dive into specific grade metrics</CardDescription>
                    </div>
                    <Select value={selectedGradeView} onValueChange={setSelectedGradeView}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Grade" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Grades Overview</SelectItem>
                            <SelectItem value="grade10">Grade 10</SelectItem>
                            <SelectItem value="grade12">Grade 12</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    <div className="h-[250px] w-full flex flex-col items-center">
                        <h4 className="mb-4 text-sm font-medium text-muted-foreground">Subject Distribution (Science Stream)</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Physics', value: 30 },
                                        { name: 'Chemistry', value: 25 },
                                        { name: 'Biology', value: 20 },
                                        { name: 'Math', value: 25 },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {[0, 1, 2, 3].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Legend style={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col justify-center space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Curriculum Completion</span>
                                <span className="text-green-500 font-bold">85%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-[85%]" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Assessment Compliance</span>
                                <span className="text-blue-500 font-bold">92%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[92%]" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Parent Engagement</span>
                                <span className="text-orange-500 font-bold">78%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-[78%]" />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SchoolAnalyticsAdmin;
