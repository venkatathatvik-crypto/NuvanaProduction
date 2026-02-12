import React, { useEffect } from 'react';
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
  Filter,
  Download,
  Search,
  School
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EngagementStats } from '@/components/engagement/EngagementStats';
import { engagementApi } from '@/services/engagementApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import { engagementSocket } from '@/services/engagementSocket';
import { SessionDetailDialog } from '@/components/engagement/SessionDetailDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminEngagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const token = localStorage.getItem('access_token') || '';

  // Real school-wide stats
  const { data: schoolStats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-school-stats', profile?.school_id],
    queryFn: () => engagementApi.getSchoolAnalytics(profile!.school_id, token),
    enabled: !!profile?.school_id,
  });

  // Real teacher leaderboard
  const { data: leaderboard = [], isLoading: loadingLeaderboard } = useQuery({
    queryKey: ['admin-teacher-leaderboard', profile?.school_id],
    queryFn: () => engagementApi.getTeacherLeaderboard(profile!.school_id, token),
    enabled: !!profile?.school_id,
  });

  const [drillDownSessionId, setDrillDownSessionId] = React.useState<string | null>(null);


  // Connect to socket and listen for updates
  useEffect(() => {
    if (!profile?.id || !profile?.school_id) return;

    engagementSocket.connect(profile.id, 'teacher'); // Using teacher role for base connection
    engagementSocket.joinSchool(profile.school_id, profile.id);

    const handleUpdate = (data: any) => {
      console.log('🔔 [AdminEngagement] REAL-TIME UPDATE RECEIVED:', data?.type || 'update');
      console.log('[AdminEngagement] Details:', data);
      queryClient.invalidateQueries({ queryKey: ['admin-school-stats', profile.school_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-leaderboard', profile.school_id] });
    };

    engagementSocket.on('school:update', handleUpdate);

    return () => {
      engagementSocket.off('school:update', handleUpdate);
    };
  }, [profile?.id, profile?.school_id, queryClient]);

  // Extract from envelope
  const statsData = (schoolStats as any)?.data || schoolStats;
  const leaderboardArr = Array.isArray(leaderboard) ? leaderboard : (leaderboard as any)?.data || [];

  console.log('📊 [AdminEngagement] Stats Data Received:', statsData);
  console.log('🏆 [AdminEngagement] Leaderboard Data Received:', leaderboardArr);

  // Extract stats
  const stats = [
    { label: 'Sessions', value: statsData?.totalSessions || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Questions', value: statsData?.totalQuestions || 0, icon: Target, color: 'text-red-500' },
    { label: 'Participation', value: `${statsData?.avgParticipation || 0}%`, icon: Zap, color: 'text-yellow-500' },
    { label: 'Accuracy', value: `${statsData?.avgAccuracy || 0}%`, icon: Award, color: 'text-green-500' },
    { label: 'Avg Speed', value: `${statsData?.avgResponseTime || 0}ms`, icon: Clock, color: 'text-purple-500' },
  ];

  console.log('📈 [AdminEngagement] UI Stats assigned:', stats);

  // Real usage data from API
  const usageData = statsData?.usageBySubject || [];
  const trendData = statsData?.trend || [];
  const speedDist = statsData?.speedDistribution || { elite: 0, fast: 0, medium: 0, slow: 0 };
  const recentSessionsList = statsData?.recentSessions || [];

  const speedData = [
    { name: 'Elite (<25%)', value: speedDist.elite, color: '#8b5cf6' },
    { name: 'Fast (25-50%)', value: speedDist.fast, color: '#3b82f6' },
    { name: 'Medium (50-75%)', value: speedDist.medium, color: '#f59e0b' },
    { name: 'Slow (>75%)', value: speedDist.slow, color: '#ef4444' },
  ];

  const displayUsageData = usageData.length > 0 ? usageData : [
    { subject: 'Math', engagement: 45 },
    { subject: 'Science', engagement: 38 },
    { subject: 'English', engagement: 62 },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen p-6 space-y-8 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
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
            <h1 className="text-3xl font-bold tracking-tight">Engagement Hub</h1>
            <p className="text-muted-foreground text-sm font-medium opacity-70">Monitor school-wide student participation and content mastery</p>
          </div>
        </div>
        
      </motion.div>

      <div className="relative z-10 space-y-8">
        <EngagementStats stats={stats} isLoading={loadingStats} />

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-muted/30 p-1 rounded-2xl border border-border/50 h-14">
            <TabsTrigger value="overview" className="rounded-xl px-8 h-12 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">
              <TrendingUp className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="teachers" className="rounded-xl px-8 h-12 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">
              <Users className="w-4 h-4 mr-2" />
              Teachers
            </TabsTrigger>
            <TabsTrigger value="classes" className="rounded-xl px-8 h-12 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all">
              <School className="w-4 h-4 mr-2" />
              Classes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8 m-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="glass-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Usage Trends (Activity)
                    </div>
                    <Badge variant="outline" className="bg-primary/5 font-black text-[10px] uppercase text-primary">Live Daily Engagement</Badge>
                  </CardTitle>
                  <CardDescription>Average participation rate across the school in the last 7 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  {loadingStats ? (
                    <div className="flex flex-col gap-4 w-full h-full pt-4">
                      <div className="flex items-end gap-4 h-full w-full px-8 pb-4">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                          <Skeleton key={i} className="flex-1 bg-primary/5 rounded-t-lg" style={{ height: `${20 + Math.random() * 60}%` }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis 
                          dataKey="subject" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          unit="%"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        />
                        <Tooltip 
                          cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="engagement" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Avg Engagement" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-purple-500/20 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-600">
                    <Clock className="w-5 h-5" />
                    Speed Performance
                  </CardTitle>
                  <CardDescription>Response speed distribution across corrected answers</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={speedData}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {speedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {speedData.map(item => (
                      <div key={item.name} className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[10px] whitespace-nowrap opacity-70 font-bold uppercase truncate">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-500" />
                      Recent School Sessions
                    </CardTitle>
                    <CardDescription>Latest engagement activity across all classes</CardDescription>
                  </div>
                  <Badge variant="secondary" className="font-bold">Last 10 Sessions</Badge>
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
                        <TableRow 
                          key={s.id} 
                          className="border-border/50 transition-colors hover:bg-primary/5 cursor-pointer"
                          onClick={() => setDrillDownSessionId(s.id)}
                        >
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
                          <TableCell className="text-right text-xs opacity-60">
                            {new Date(s.date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teachers" className="m-0 outline-none">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    Teacher Leaderboard
                  </CardTitle>
                  <CardDescription>Ranking based on active session engagement and accuracy</CardDescription>
                </div>
                <div className="relative w-64 hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search teachers..." className="pl-10 h-10 rounded-xl glass text-xs" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {loadingLeaderboard ? (
                    Array(5).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center gap-6 p-4">
                        <Skeleton className="h-12 w-12 rounded-2xl bg-primary/5 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-32 bg-primary/5" />
                            <Skeleton className="h-4 w-20 bg-primary/5" />
                          </div>
                          <Skeleton className="h-2 w-full bg-primary/5 rounded-full" />
                        </div>
                      </div>
                    ))
                  ) : leaderboardArr.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground italic">No teacher data recorded yet.</div>
                  ) : (
                    leaderboardArr.map((teacher, i) => (
                      <div key={teacher.name} className="flex items-center gap-6 p-4 rounded-xl hover:bg-muted/30 transition-all border border-transparent hover:border-border/50 group">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary font-black border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                          {i + 1}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-black tracking-tight">{teacher.name}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-widest">{teacher.grade}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-primary">{teacher.sessions} Sessions</p>
                              <p className="text-[10px] font-bold text-muted-foreground">{teacher.participation}% Engagement</p>
                            </div>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50 border border-border/50">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${teacher.participation}%` }}
                              className="h-full bg-gradient-to-r from-primary to-primary/60" 
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="m-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="w-5 h-5 text-primary" />
                    Participation by Class
                  </CardTitle>
                  <CardDescription>Engagement breakdown across different classes</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {loadingStats ? (
                    <div className="flex items-center justify-center w-full h-full">
                      <Skeleton className="h-64 w-64 rounded-full bg-primary/5 flex items-center justify-center">
                        <Skeleton className="h-40 w-40 rounded-full bg-background" />
                      </Skeleton>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayUsageData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={8}
                          dataKey="engagement"
                          label={({ class: className }) => className}
                        >
                          {displayUsageData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Class-wise Breakdown</CardTitle>
                  <CardDescription>Detailed engagement list by group</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {displayUsageData.map((item: any, i: number) => (
                      <div key={item.subject} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-bold">{item.subject}</span>
                        </div>
                        <Badge variant="outline" className="font-black bg-background">{item.engagement}%</Badge>
                      </div>
                    ))}
                  </div>
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
