import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ArrowLeft,
  TrendingUp,
  Users,
  Target,
  Award,
  Zap,
  Clock,
  Search,
  School,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { engagementApi } from '@/services/engagementApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { engagementSocket } from '@/services/engagementSocket';
import { SessionDetailDialog } from '@/components/engagement/SessionDetailDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeacherEntry {
  name: string;
  sessions: number;
  participation: number;
  accuracy: number;
  avgResponseTime: number;
  score: number;
  grade: string;
  subject: string;
  classes: string[];
  subjects: string[];
}

type SortKey = 'score' | 'accuracy' | 'avgResponseTime' | 'participation';
type SortDir = 'asc' | 'desc';

// ─── Helper: rank badge colours ───────────────────────────────────────────────
const rankStyle = (rank: number) => {
  if (rank === 1) return 'border-yellow-400/60 bg-yellow-500/10 shadow-yellow-500/20';
  if (rank === 2) return 'border-slate-400/60 bg-slate-500/10 shadow-slate-500/20';
  return 'border-amber-700/60 bg-amber-700/10 shadow-amber-700/20';
};
const rankBadgeStyle = (rank: number) => {
  if (rank === 1) return 'bg-yellow-500 text-black';
  if (rank === 2) return 'bg-slate-400 text-black';
  return 'bg-amber-700 text-white';
};

// ─── Trend Sparkline (mini) ───────────────────────────────────────────────────
const TrendSparkline = ({ value }: { value: number }) => {
  const color = value >= 0 ? '#10b981' : '#ef4444';
  return (
    <div className="flex items-center gap-1">
      <svg width="48" height="20" viewBox="0 0 48 20" fill="none">
        <polyline
          points={value >= 0 ? '0,16 12,12 24,10 36,6 48,2' : '0,4 12,8 24,10 36,14 48,18'}
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-xs font-bold ${value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {value >= 0 ? '+' : ''}{value}%
      </span>
    </div>
  );
};

// ─── Sort toggle icon ─────────────────────────────────────────────────────────
const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// ═══════════════════════════════════════════════════════════════════════════════
const AdminEngagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const token = localStorage.getItem('access_token') || '';

  // ── State ──────────────────────────────────────────────────────────────────
  const [drillDownSessionId, setDrillDownSessionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: schoolStats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-school-stats', profile?.school_id],
    queryFn: () => engagementApi.getSchoolAnalytics(profile!.school_id, token),
    enabled: !!profile?.school_id,
  });

  const { data: leaderboard = [], isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['admin-teacher-leaderboard', profile?.school_id],
    queryFn: () => engagementApi.getTeacherLeaderboard(profile!.school_id, token),
    enabled: !!profile?.school_id,
  });

  const { data: classSubjectData, isLoading: loadingClassSubject } = useQuery({
    queryKey: ['admin-class-subject-analytics', profile?.school_id],
    queryFn: () => engagementApi.getClassSubjectAnalytics(profile!.school_id, token),
    enabled: !!profile?.school_id,
  });

  const { data: adminDashboard, isLoading: loadingAdminDashboard } = useQuery({
    queryKey: ['admin-dashboard', profile?.school_id],
    queryFn: () => engagementApi.getAdminDashboard(profile!.school_id, token),
    enabled: !!profile?.school_id,
  });

  // ── Socket ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile?.id || !profile?.school_id) return;
    engagementSocket.connect(profile.id, 'teacher');
    engagementSocket.joinSchool(profile.school_id, profile.id);
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-school-stats', profile.school_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-leaderboard', profile.school_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-class-subject-analytics', profile.school_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard', profile.school_id] });
    };
    engagementSocket.on('school:update', handleUpdate);
    return () => { engagementSocket.off('school:update', handleUpdate); };
  }, [profile?.id, profile?.school_id, queryClient]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const statsData = (schoolStats as any)?.data || schoolStats;
  const leaderboardArr: TeacherEntry[] = Array.isArray(leaderboard)
    ? leaderboard
    : (leaderboard as any)?.data || [];

  const csData = (classSubjectData as any)?.data || classSubjectData;
  const byClass: any[] = csData?.byClass || [];
  const bySubject: any[] = csData?.bySubject || [];

  const adminData = (adminDashboard as any)?.data || adminDashboard;
  const byGrade: any[] = adminData?.byGrade || [];
  const topTeacher = adminData?.topTeacher;

  // Aggregate school-level numbers
  const avgAccuracy = statsData?.avgAccuracy ?? 0;
  const avgResponseTime = statsData?.avgResponseTime ?? 0;

  // Compute Teacher Impact Score (avg of leaderboard scores)
  const teacherImpactScore = leaderboardArr.length > 0
    ? Math.round((leaderboardArr.reduce((s, t) => s + (t.score ?? 0), 0) / leaderboardArr.length) * 10) / 10
    : 0;

  // Institutional Engagement Index  = weighted composite
  const engagementIndex = avgAccuracy > 0
    ? Math.round(
        (avgAccuracy * 0.45 + Math.max(0, 100 - avgResponseTime / 100) * 0.25 + teacherImpactScore * 10 * 0.30) / 10
      )
    : 0;

  // Speed distribution for pie
  const speedDist = statsData?.speedDistribution || { elite: 0, fast: 0, medium: 0, slow: 0 };
  const speedData = [
    { name: 'Elite (<25%)', value: speedDist.elite, color: '#8b5cf6' },
    { name: 'Fast (25-50%)', value: speedDist.fast, color: '#3b82f6' },
    { name: 'Medium', value: speedDist.medium, color: '#f59e0b' },
    { name: 'Slow', value: speedDist.slow, color: '#ef4444' },
  ];

  const recentSessionsList = statsData?.recentSessions || [];
  const trendData = statsData?.trend || [];

  // Top 3 teachers
  const top3 = leaderboardArr.slice(0, 3);

  // All-unique classes & subjects for filter dropdowns
  const allClasses = useMemo(() => {
    const s = new Set<string>();
    leaderboardArr.forEach(t => t.classes?.forEach(c => s.add(c)));
    byClass.forEach((c: any) => s.add(c.className));
    return Array.from(s).sort();
  }, [leaderboardArr, byClass]);

  const allSubjects = useMemo(() => {
    const s = new Set<string>();
    leaderboardArr.forEach(t => t.subjects?.forEach(sub => s.add(sub)));
    bySubject.forEach((sub: any) => s.add(sub.subjectName));
    return Array.from(s).sort();
  }, [leaderboardArr, bySubject]);

  // Filtered + sorted teacher list
  const filteredTeachers = useMemo(() => {
    let list = [...leaderboardArr];
    if (search) list = list.filter(t => t.name?.toLowerCase().includes(search.toLowerCase()));
    if (filterClass !== 'all') list = list.filter(t => t.classes?.includes(filterClass));
    if (filterSubject !== 'all') list = list.filter(t => t.subjects?.includes(filterSubject));
    list.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [leaderboardArr, search, filterClass, filterSubject, sortKey, sortDir]);

  // Sort toggler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  const MetricSkeleton = () => (
    <Card className="glass-card">
      <CardContent className="pt-6 space-y-3">
        <Skeleton className="h-3 w-24 bg-primary/5" />
        <Skeleton className="h-8 w-16 bg-primary/5" />
        <Skeleton className="h-3 w-32 bg-primary/5" />
      </CardContent>
    </Card>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="glass rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <Shield className="w-7 h-7 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm opacity-70">
              Institutional engagement and teacher performance analytics
            </p>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 space-y-6">

        {/* ── Institutional Engagement Index ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card border-primary/20 bg-primary/5 overflow-hidden">
            <CardContent className="pt-6 pb-6">
              {loadingStats ? (
                <div className="text-center space-y-2">
                  <Skeleton className="h-5 w-48 mx-auto bg-primary/10" />
                  <Skeleton className="h-12 w-24 mx-auto bg-primary/10" />
                  <Skeleton className="h-4 w-36 mx-auto bg-primary/10" />
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                    Institutional Engagement Index
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-6xl font-black text-primary">{engagementIndex > 0 ? engagementIndex : '-'}</span>
                    <div className="text-left">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-bold text-xs">
                        ▲ Active
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Composite of accuracy, response efficiency & teacher impact
                  </p>
                  {/* 3 metric pills */}
                  <div className="grid grid-cols-3 gap-3 mt-4 max-w-2xl mx-auto">
                    {/* Student Accuracy */}
                    <div className="rounded-2xl bg-background/60 border border-border/50 p-3 text-center space-y-1">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Student Accuracy</p>
                      {loadingStats ? <Skeleton className="h-6 w-12 mx-auto bg-primary/5" /> : (
                        <p className="text-xl font-black text-green-400">{avgAccuracy}%</p>
                      )}
                    </div>
                    {/* Response Time */}
                    <div className="rounded-2xl bg-background/60 border border-border/50 p-3 text-center space-y-1">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Avg Response Time</p>
                      {loadingStats ? <Skeleton className="h-6 w-12 mx-auto bg-primary/5" /> : (
                        <p className="text-xl font-black text-blue-400">{(avgResponseTime / 1000).toFixed(1)}s</p>
                      )}
                    </div>
                    {/* Teacher Impact */}
                    <div className="rounded-2xl bg-background/60 border border-border/50 p-3 text-center space-y-1">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Teacher Impact</p>
                      {loadingLeaderboard ? <Skeleton className="h-6 w-12 mx-auto bg-primary/5" /> : (
                        <p className="text-xl font-black text-yellow-400">{teacherImpactScore > 0 ? teacherImpactScore : '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Top 3 Teacher Podium ── */}
        {!loadingLeaderboard && top3.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Top Performing Teachers
              </h2>
              <Badge variant="outline" className="font-bold text-xs">This Month</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {top3.map((teacher, i) => (
                <motion.div
                  key={teacher.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <Card className={`glass-card border shadow-lg ${rankStyle(i + 1)} relative overflow-hidden`}>
                    <CardContent className="pt-5 pb-5">
                      {/* Rank badge */}
                      <span className={`absolute top-3 left-3 text-xs font-black px-2 py-0.5 rounded-full ${rankBadgeStyle(i + 1)}`}>
                        #{i + 1}
                      </span>
                      <div className="text-center mt-3 space-y-2">
                        {/* Avatar placeholder */}
                        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 mx-auto flex items-center justify-center">
                          <Users className="w-7 h-7 text-primary opacity-60" />
                        </div>
                        <p className="text-3xl font-black text-primary">{teacher.score}</p>
                        <p className="font-black text-sm">{teacher.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                          {teacher.subject !== 'N/A' ? teacher.subject : teacher.grade}
                        </p>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="rounded-lg bg-muted/30 p-2 text-center">
                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide">Accuracy</p>
                            <p className={`text-sm font-black ${teacher.accuracy > 70 ? 'text-green-400' : teacher.accuracy > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {teacher.accuracy}%
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2 text-center">
                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wide">Sessions</p>
                            <p className="text-sm font-black text-primary">{teacher.sessions}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Tabs ── */}
        <Tabs defaultValue="teachers" className="space-y-6">
          <TabsList className="bg-muted/30 p-1 rounded-2xl border border-border/50 h-14">
            <TabsTrigger value="overview" className="rounded-xl px-6 h-12 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">
              <TrendingUp className="w-4 h-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="teachers" className="rounded-xl px-6 h-12 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">
              <Users className="w-4 h-4 mr-2" /> All Teachers
            </TabsTrigger>
            <TabsTrigger value="classes" className="rounded-xl px-6 h-12 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">
              <School className="w-4 h-4 mr-2" /> Classes
            </TabsTrigger>
            <TabsTrigger value="subjects" className="rounded-xl px-6 h-12 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">
              <BookOpen className="w-4 h-4 mr-2" /> Subjects
            </TabsTrigger>
          </TabsList>

          {/* ─── OVERVIEW TAB ─── */}
          <TabsContent value="overview" className="m-0 outline-none space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="glass-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Daily Engagement Trend
                    </div>
                    <Badge variant="outline" className="bg-primary/5 font-black text-[10px] uppercase text-primary">Last 7 Days</Badge>
                  </CardTitle>
                  <CardDescription>Average participation rate across the school</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {loadingStats ? (
                    <div className="flex items-end gap-4 h-full w-full px-8 pb-4">
                      {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="flex-1 bg-primary/5 rounded-t-lg" style={{ height: `${30 + (i*10)}%` }} />)}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} unit="%" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <Tooltip cursor={{ fill: 'hsl(var(--primary)/0.05)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="Avg Engagement" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-purple-500/20 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-500">
                    <Clock className="w-5 h-5" />
                    Speed Distribution
                  </CardTitle>
                  <CardDescription>Response speed across correct answers</CardDescription>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie data={speedData} innerRadius={55} outerRadius={90} paddingAngle={5} dataKey="value">
                        {speedData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {speedData.map(item => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[9px] uppercase font-bold opacity-70 truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions */}
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" />Recent School Sessions</CardTitle>
                    <CardDescription>Latest engagement activity across all classes</CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-bold">Last 10</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="font-bold">Session</TableHead>
                      <TableHead className="font-bold">Teacher</TableHead>
                      <TableHead className="font-bold">Class</TableHead>
                      <TableHead className="font-bold text-center">Accuracy</TableHead>
                      <TableHead className="font-bold text-center">Avg Speed</TableHead>
                      <TableHead className="text-right font-bold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingStats ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}><Skeleton className="h-4 w-full bg-primary/5" /></TableCell>
                        </TableRow>
                      ))
                    ) : recentSessionsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 opacity-50 italic">No recent sessions found.</TableCell>
                      </TableRow>
                    ) : (
                      recentSessionsList.map((s: any) => (
                        <TableRow key={s.id} className="border-border/50 hover:bg-primary/5 cursor-pointer transition-colors" onClick={() => setDrillDownSessionId(s.id)}>
                          <TableCell className="font-bold">{s.name}</TableCell>
                          <TableCell className="font-medium opacity-80">{s.teacher}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{s.class}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${s.accuracy > 70 ? 'text-green-500' : s.accuracy > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {s.accuracy}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-medium opacity-70">{s.speed}ms</TableCell>
                          <TableCell className="text-right text-xs opacity-60">{new Date(s.date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── ALL TEACHERS TAB ─── */}
          <TabsContent value="teachers" className="m-0 outline-none">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      Teacher Leaderboard
                    </CardTitle>
                    <CardDescription>Sorted by engagement score — filter by class or subject</CardDescription>
                  </div>
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative w-40">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-9 rounded-xl text-xs glass"
                      />
                    </div>
                    {/* Class filter */}
                    <Select value={filterClass} onValueChange={setFilterClass}>
                      <SelectTrigger className="h-9 w-36 rounded-xl text-xs glass">
                        <School className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {allClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {/* Subject filter */}
                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                      <SelectTrigger className="h-9 w-36 rounded-xl text-xs glass">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                        <SelectValue placeholder="All Subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {allSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                {loadingLeaderboard ? (
                  <div className="space-y-3 p-6 pt-0">
                    {Array(6).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl">
                        <Skeleton className="h-10 w-10 rounded-xl bg-primary/5" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40 bg-primary/5" />
                          <Skeleton className="h-3 w-24 bg-primary/5" />
                        </div>
                        <Skeleton className="h-4 w-16 bg-primary/5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/50">
                          <TableHead className="font-bold w-10">#</TableHead>
                          <TableHead className="font-bold">Name</TableHead>
                          <TableHead className="font-bold hidden sm:table-cell">Class</TableHead>
                          <TableHead className="font-bold hidden md:table-cell">Subject</TableHead>
                          <TableHead className="font-bold text-center cursor-pointer select-none" onClick={() => handleSort('score')}>
                            <span className="flex items-center justify-center gap-1">Score <SortIcon active={sortKey === 'score'} dir={sortDir} /></span>
                          </TableHead>
                          <TableHead className="font-bold text-center cursor-pointer select-none" onClick={() => handleSort('accuracy')}>
                            <span className="flex items-center justify-center gap-1">Accuracy <SortIcon active={sortKey === 'accuracy'} dir={sortDir} /></span>
                          </TableHead>
                          <TableHead className="font-bold text-center cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort('avgResponseTime')}>
                            <span className="flex items-center justify-center gap-1">Avg Response <SortIcon active={sortKey === 'avgResponseTime'} dir={sortDir} /></span>
                          </TableHead>
                          <TableHead className="font-bold text-center hidden lg:table-cell">Sessions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeachers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-10 opacity-50 italic">
                              No teachers match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredTeachers.map((teacher, i) => (
                            <TableRow key={teacher.name + i} className="border-border/50 hover:bg-primary/5 transition-colors">
                              {/* Rank */}
                              <TableCell>
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black border ${
                                  i === 0 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                                  i === 1 ? 'bg-slate-500/10 border-slate-500/30 text-slate-400' :
                                  i === 2 ? 'bg-amber-700/10 border-amber-700/30 text-amber-600' :
                                  'bg-muted/30 border-border/30 text-muted-foreground'
                                }`}>
                                  {i + 1}
                                </div>
                              </TableCell>
                              {/* Name */}
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-primary opacity-60" />
                                  </div>
                                  <div>
                                    <p className="font-black text-sm">{teacher.name}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-wide sm:hidden">
                                      {teacher.subject !== 'N/A' ? teacher.subject : teacher.grade}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              {/* Class */}
                              <TableCell className="hidden sm:table-cell">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-bold">
                                  {teacher.grade || 'N/A'}
                                </Badge>
                              </TableCell>
                              {/* Subject */}
                              <TableCell className="hidden md:table-cell">
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs font-bold">
                                  {teacher.subject || 'N/A'}
                                </Badge>
                              </TableCell>
                              {/* Score */}
                              <TableCell className="text-center">
                                <span className="font-black text-primary text-base">{teacher.score}</span>
                              </TableCell>
                              {/* Accuracy */}
                              <TableCell className="text-center">
                                <span className={`font-bold ${teacher.accuracy > 70 ? 'text-green-500' : teacher.accuracy > 50 ? 'text-yellow-500' : 'text-red-400'}`}>
                                  {teacher.accuracy}%
                                </span>
                              </TableCell>
                              {/* Avg Response */}
                              <TableCell className="text-center hidden lg:table-cell">
                                <span className="font-medium opacity-70 text-sm">
                                  {teacher.avgResponseTime > 0 ? `${(teacher.avgResponseTime / 1000).toFixed(1)}s` : '—'}
                                </span>
                              </TableCell>
                              {/* Sessions */}
                              <TableCell className="text-center hidden lg:table-cell">
                                <span className="font-bold text-sm">{teacher.sessions}</span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── CLASSES TAB ─── */}
          <TabsContent value="classes" className="m-0 outline-none space-y-6">
            {loadingAdminDashboard ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="glass-card">
                    <CardHeader><Skeleton className="h-6 w-24" /><Skeleton className="h-4 w-32" /></CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : byGrade.length === 0 ? (
              <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border/50">
                <School className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground italic">No class data available for this school yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {byGrade.map((gradeData: any) => (
                  <Card key={gradeData.grade} className="glass-card border-primary/10 hover:border-primary/30 transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl font-black text-primary">{gradeData.grade}</CardTitle>
                          <CardDescription className="font-bold text-xs">
                            {gradeData.totalSessions} Total Sessions
                          </CardDescription>
                        </div>
                        <Badge className="bg-primary/10 text-primary border-primary/20 font-black">
                          {Math.round(gradeData.avgParticipation)}% Avg
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-2 flex justify-between">
                        <span>Classroom</span>
                        <span>Engagement</span>
                      </div>
                      <div className="space-y-2">
                        {gradeData.classes.map((cls: any) => (
                          <div 
                            key={cls.classId} 
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-primary/5 transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary" />
                              <span className="font-bold text-sm">{cls.className}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-muted-foreground opacity-60">{cls.avgAccuracy}% Acc.</span>
                              <Badge variant="outline" className="font-black h-6 bg-background border-primary/10 group-hover:border-primary/30 transition-all">
                                {cls.avgParticipation}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── SUBJECTS TAB ─── */}
          <TabsContent value="subjects" className="m-0 outline-none space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar chart */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    Engagement by Subject
                  </CardTitle>
                  <CardDescription>Average participation rate per subject</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {loadingClassSubject ? (
                    <div className="flex items-end gap-3 h-full w-full px-4 pb-4">
                      {[1,2,3,4].map(i => <Skeleton key={i} className="flex-1 bg-primary/5 rounded-t-lg" style={{ height: `${30 + i * 15}%` }} />)}
                    </div>
                  ) : bySubject.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground italic opacity-50">
                      No subject data yet. Subject data is linked when sessions use files with a subject.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bySubject} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                        <XAxis type="number" unit="%" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                        <YAxis type="category" dataKey="subjectName" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="avgParticipation" name="Avg Participation" radius={[0,4,4,0]}>
                          {bySubject.map((_: any, index: number) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Subject breakdown list */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Subject-wise Breakdown</CardTitle>
                  <CardDescription>Accuracy and participation by subject</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingClassSubject ? (
                    <div className="space-y-3">
                      {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl bg-primary/5" />)}
                    </div>
                  ) : bySubject.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground italic opacity-50">No data yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {bySubject.map((item: any, i: number) => (
                        <div key={item.subjectName} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <div>
                              <p className="font-bold text-sm">{item.subjectName}</p>
                              <p className="text-[10px] text-muted-foreground font-bold">{item.sessions} sessions</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                              <p className="text-[10px] text-muted-foreground font-bold uppercase">Accuracy</p>
                              <p className={`text-sm font-black ${item.avgAccuracy > 70 ? 'text-green-500' : item.avgAccuracy > 50 ? 'text-yellow-500' : 'text-red-400'}`}>
                                {item.avgAccuracy}%
                              </p>
                            </div>
                            <Badge variant="outline" className="font-black bg-background">
                              {item.avgParticipation}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SessionDetailDialog
        sessionId={drillDownSessionId}
        isOpen={!!drillDownSessionId}
        onClose={() => setDrillDownSessionId(null)}
      />
    </div>
  );
};

export default AdminEngagement;
