import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  ArrowLeft, 
  History, 
  Play, 
  BarChart3, 
  TrendingUp, 
  Users,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/auth/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { engagementApi } from '@/services/engagementApi';
import { EngagementStats } from '@/components/engagement/EngagementStats';
import { LiveResponseFeed, Response } from '@/components/engagement/LiveResponseFeed';
import { ReactionOverlay } from '@/components/engagement/ReactionOverlay';
import { EngagementLeaderboard } from '@/components/engagement/EngagementLeaderboard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import { engagementSocket } from '@/services/engagementSocket';
import { useQueryClient } from '@tanstack/react-query';

const TeacherEngagement = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');
  const [liveResponses, setLiveResponses] = useState<Response[]>([]);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['teacher-sessions', profile?.id],
    queryFn: async () => {
      const data = await engagementApi.getTeacherSessions(profile!.id, localStorage.getItem('access_token') || '');
      console.log('[DEBUG] Fetched Teacher Sessions:', data);
      return data;
    },
    enabled: !!profile?.id,
  });

  const sessionsArr = Array.isArray(sessions) ? sessions : (sessions as any)?.data || [];

  const studentSummary = useMemo(() => {
    if (!sessionsArr.length) return { participation: 0, accuracy: 0, totalQuestions: 0 };
    
    let totalQuestions = 0;
    let totalParticipation = 0;
    let totalAccuracy = 0;
    let sessionsWithAnalytics = 0;

    sessionsArr.forEach((s: any) => {
      const questions = s.pop_questions || s.popQuestions || [];
      const analytics = s.engagement_analytics || s.engagementAnalytics || [];
      
      totalQuestions += (questions.length || 0);
      
      if (analytics.length > 0) {
        sessionsWithAnalytics++;
        const sessionParticipation = analytics.reduce((sum: number, a: any) => sum + Number(a.participation_rate || a.participationRate || 0), 0) / analytics.length;
        const sessionAccuracy = analytics.reduce((sum: number, a: any) => sum + Number(a.accuracy_rate || a.accuracyRate || 0), 0) / analytics.length;
        
        totalParticipation += sessionParticipation;
        totalAccuracy += sessionAccuracy;
      }
    });

    return {
      participation: sessionsWithAnalytics > 0 ? Math.round(totalParticipation / sessionsWithAnalytics) : 0,
      accuracy: sessionsWithAnalytics > 0 ? Math.round(totalAccuracy / sessionsWithAnalytics) : 0,
      totalQuestions
    };
  }, [sessionsArr]);

  const focusedSession = useMemo(() => {
    if (sessionId) {
      return sessionsArr.find((s: any) => s.id === sessionId);
    }
    return sessionsArr.find((s: any) => s.status === 'active');
  }, [sessionsArr, sessionId]);

  const stats = {
    totalSessions: sessionsArr.length,
    totalQuestions: studentSummary.totalQuestions,
    avgParticipation: `${studentSummary.participation}%`,
    avgAccuracy: `${studentSummary.accuracy}%`,
  };

  useEffect(() => {
    if (!profile?.id) return;
    engagementSocket.connect(profile.id, 'teacher');

    if (focusedSession && focusedSession.status === 'active') {
      engagementSocket.joinSession(focusedSession.id, profile.id);
    }

    const handleResponse = (data: any) => {
      console.log('[TeacherEngagement] New live response:', data);
      // Capture live response immediately to avoid losing it during sub-component re-renders
      setLiveResponses(prev => [data, ...prev]);
      
      // Still invalidate to get the latest historical/aggregated data
      queryClient.invalidateQueries({ queryKey: ['teacher-sessions'] });
      if (focusedSession?.id) {
        queryClient.invalidateQueries({ queryKey: ['session-details', focusedSession.id] });
      }
    };

    engagementSocket.onResponseReceived(handleResponse);
    return () => {
      engagementSocket.off('response:received', handleResponse);
    };
  }, [profile?.id, focusedSession?.id, queryClient]);

  const trendData = [...sessionsArr]
    .reverse()
    .slice(-7)
    .map((s: any) => {
      const analytics = s.engagement_analytics || [];
      const score = analytics.length > 0
        ? Math.round(analytics.reduce((sum: number, a: any) => sum + Number(a.participation_rate || 0), 0) / analytics.length)
        : 0;
      
      return {
        name: new Date(s.started_at).toLocaleDateString('en-US', { weekday: 'short' }),
        score
      };
    });

  const displayTrendData = trendData.length > 0 ? trendData : [
    { name: 'Mon', score: 0 }, { name: 'Tue', score: 0 }, { name: 'Wed', score: 0 }, { name: 'Thu', score: 0 }, { name: 'Fri', score: 0 },
  ];

  if (loadingSessions) return <LoadingSpinner />;

  return (
    <div className="min-h-screen p-6 space-y-8 bg-background relative overflow-hidden">
      <ReactionOverlay />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')} className="glass">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold neon-text">Engagement Hub</h1>
            <p className="text-muted-foreground text-sm">Monitor live participation and student performance</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {sessionId && (
            <Button variant="outline" onClick={() => navigate('/teacher/engagement')} className="glass">
              Back to Overview
            </Button>
          )}
          <Button className="neon-glow" onClick={() => navigate('/teacher/files')}>
            <Play className="w-4 h-4 mr-2" />
            Start Session
          </Button>
        </div>
      </motion.div>

      <div className="relative z-10 space-y-8">
        <EngagementStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {focusedSession ? (
              <div className="space-y-4">
                {focusedSession.status !== 'active' && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-4 py-1">
                    Viewing Historical Session: {focusedSession.session_name || focusedSession.id.slice(0, 8)}
                  </Badge>
                )}
                <LiveResponseFeed 
                  sessionId={focusedSession.id} 
                  externalLiveResponses={liveResponses}
                  onResponsesUpdate={setLiveResponses} 
                />
              </div>
            ) : (
              <Card className="glass-card border-dashed border-primary/50 py-12 text-center">
                <CardContent className="space-y-4">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold">No Active Session</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Start a session from the PDF viewer to engage with your students in real-time.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/teacher/files')}>Go to Files</Button>
                </CardContent>
              </Card>
            )}

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Participation Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={displayTrendData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {focusedSession && <EngagementLeaderboard responses={liveResponses} />}
            
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-accent" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 space-y-6">
                  {sessionsArr.slice(0, 5).map((session: any) => {
                    const analytics = session.engagement_analytics || [];
                    const avgAccuracy = analytics.length > 0 ? Math.round(analytics.reduce((sum: number, a: any) => sum + Number(a.accuracy_rate || 0), 0) / analytics.length) : 0;
                    const avgParticipation = analytics.length > 0 ? Math.round(analytics.reduce((sum: number, a: any) => sum + Number(a.participation_rate || 0), 0) / analytics.length) : 0;
                    return (
                      <div key={session.id} className="space-y-2 group cursor-pointer" onClick={() => navigate(`/teacher/engagement/${session.id}`)}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-foreground truncate max-w-[140px]">{session.session_name || `Session ${session.id.slice(0, 8)}`}</span>
                          <span className="text-muted-foreground">{avgAccuracy}% Accuracy</span>
                        </div>
                        <div className="relative h-3 w-full bg-muted/30 rounded-full overflow-hidden border border-border/50">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${avgParticipation}%` }} className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/60 to-primary neon-glow" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {!focusedSession && (
              <Card className="glass-card bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="w-5 h-5 text-primary" /></div>
                    <div><h4 className="font-semibold text-sm">Quick Insights</h4><p className="text-xs text-muted-foreground">AI-powered engagement tips</p></div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-background/50 text-xs border border-border/50 leading-relaxed font-medium">Participation peaks during morning classes (Avg 92%).</div>
                    <div className="p-3 rounded-lg bg-background/50 text-xs border border-border/50 leading-relaxed font-medium">Accuracy in Science dropped by 12% this week.</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherEngagement;
