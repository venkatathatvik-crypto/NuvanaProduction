import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  Target, 
  Award,
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
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import { engagementSocket } from '@/services/engagementSocket';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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


  // Connect to socket and listen for updates
  useEffect(() => {
    if (!profile?.id) return;

    engagementSocket.connect(profile.id, 'school_admin' as any);

    const handleUpdate = () => {
      console.log('[AdminEngagement] Activity detected, refreshing analytics...');
      queryClient.invalidateQueries({ queryKey: ['admin-school-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-leaderboard'] });
    };

    engagementSocket.onResponseReceived(handleUpdate);

    return () => {
      engagementSocket.off('response:received', handleUpdate);
    };
  }, [profile?.id, queryClient]);

  // Extract from envelope
  const statsData = (schoolStats as any)?.data || schoolStats;
  const leaderboardArr = Array.isArray(leaderboard) ? leaderboard : (leaderboard as any)?.data || [];

  const stats = {
    totalSessions: statsData?.totalSessions || 0,
    totalQuestions: statsData?.totalQuestions || 0,
    avgParticipation: `${statsData?.avgParticipation || 0}%`,
    avgAccuracy: `${statsData?.avgAccuracy || 0}%`,
  };

  // Real usage data from API
  const usageData = statsData?.usageBySubject || [];
  const trendData = statsData?.trend || [];

  const displayUsageData = usageData.length > 0 ? usageData : [
    { subject: 'Math', engagement: 0 },
    { subject: 'Science', engagement: 0 },
    { subject: 'English', engagement: 0 },
    { subject: 'History', engagement: 0 },
    { subject: 'Geography', engagement: 0 },
  ];

  const COLORS = ['#1e40af', '#15803d', '#ea580c', '#dc2626', '#7c3aed'];

  return (
    <div className="min-h-screen p-6 space-y-8 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="glass">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold neon-text">Engagement Analytics</h1>
            <p className="text-muted-foreground text-sm">School-wide performance and participation overview</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="glass">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button className="neon-glow">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </motion.div>

      <div className="relative z-10 space-y-8">
        <EngagementStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Usage by Subject */}
          <Card className="glass-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="w-5 h-5 text-primary" />
                Participation by Subject
              </CardTitle>
              <CardDescription>Average engagement per department</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayUsageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="engagement"
                    label={({ subject, percent }) => `${subject} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {displayUsageData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Teacher Leaderboard */}
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Top Performing Teachers
                </CardTitle>
                <CardDescription>Based on engagement metrics</CardDescription>
              </div>
              <div className="relative w-48 hidden sm:block">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search teachers..." className="pl-8 h-9 text-xs glass" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {leaderboardArr.map((teacher, i) => (
                  <div key={teacher.name} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate">{teacher.name}</p>
                        <Badge variant="outline" className="bg-primary/5">{teacher.grade}</Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{teacher.sessions} sessions</span>
                        <span>{teacher.participation}% participation</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/20">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${teacher.participation}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Engagement Score Trends
            </CardTitle>
            <CardDescription>Correlation between participation and accuracy school-wide</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="subject" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="engagement" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Engagement %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEngagement;
