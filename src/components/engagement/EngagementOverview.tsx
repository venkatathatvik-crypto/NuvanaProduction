import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  History, 
  Play, 
  TrendingUp, 
  ArrowLeft,
  Users,
  Zap,
  Award,
  Target as TargetIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/auth/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { engagementApi } from '@/services/engagementApi';
import { EngagementStats } from '@/components/engagement/EngagementStats';
import { LiveResponseFeed } from '@/components/engagement/LiveResponseFeed';
import { ReactionOverlay } from '@/components/engagement/ReactionOverlay';
import { EngagementLeaderboard } from '@/components/engagement/EngagementLeaderboard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { engagementSocket } from '@/services/engagementSocket';
import { SessionDetailDialog } from './SessionDetailDialog';

export const EngagementOverview: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [sessionResponses, setSessionResponses] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [drillDownSessionId, setDrillDownSessionId] = useState<string | null>(null);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['teacher-sessions', profile?.id],
    queryFn: async () => {
      const data = await engagementApi.getTeacherSessions(profile!.id, localStorage.getItem('access_token') || '');
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
        const sessionParticipation = analytics.reduce((sum: number, a: any) => sum + Number(a.participation_rate || 0), 0) / analytics.length;
        const sessionAccuracy = analytics.reduce((sum: number, a: any) => sum + Number(a.accuracy_rate || 0), 0) / analytics.length;
        
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
    if (selectedSessionId) {
      return sessionsArr.find((s: any) => s.id === selectedSessionId);
    }
    return sessionsArr.find((s: any) => s.status === 'active');
  }, [sessionsArr, selectedSessionId]);

  const stats = [
    { label: 'Sessions', value: sessionsArr.length, icon: Users, color: 'text-blue-500' },
    { label: 'Questions', value: studentSummary.totalQuestions, icon: Target, color: 'text-red-500' },
    { label: 'Participation', value: `${studentSummary.participation}%`, icon: Zap, color: 'text-yellow-500' },
    { label: 'Accuracy', value: `${studentSummary.accuracy}%`, icon: Award, color: 'text-green-500' },
  ];

  useEffect(() => {
    if (!profile?.id) return;
    engagementSocket.connect(profile.id, 'teacher');

    if (focusedSession && focusedSession.status === 'active') {
      engagementSocket.joinSession(focusedSession.id, profile.id);
    }

    const handleResponse = () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-sessions'] });
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

  return (
    <div className="space-y-8 relative">
      <ReactionOverlay />
      
      <div className="flex justify-between items-center relative z-10">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {selectedSessionId ? (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedSessionId(null)}
                  className="rounded-xl h-9 w-9 p-0 bg-muted/30 hover:bg-muted/50 border border-border/50"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span>Session Report</span>
              </div>
            ) : (
              sessionsLoading ? <div className="flex items-center gap-2"><div className="h-8 w-48 bg-primary/10 animate-pulse rounded-lg" /></div> : "Engagement Overview"
            )}
          </h2>
          <div className="text-muted-foreground text-sm font-medium opacity-70 italic">
            {sessionsLoading ? (
              <div className="h-4 w-64 bg-primary/5 animate-pulse rounded mt-2" />
            ) : selectedSessionId 
              ? `Reviewing deep-dive data for: ${focusedSession?.session_name || focusedSession?.id.slice(0, 8)}`
              : "Monitor live participation metrics and track student Engagement."}
          </div>
        </div>
        {/* <div className="flex gap-3">
           <Button className="neon-glow rounded-xl h-11 px-6 font-bold" onClick={() => navigate('/teacher/files')}>
             <Play className="w-4 h-4 mr-2" />
             Start New Session
           </Button>
        </div> */}
      </div>

      {!selectedSessionId && <EngagementStats stats={stats} isLoading={sessionsLoading} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {sessionsLoading ? (
            <Card className="glass-card h-[400px] flex items-center justify-center">
              <div className="w-full h-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-32 bg-primary/10 animate-pulse rounded" />
                  <div className="h-6 w-24 bg-primary/10 animate-pulse rounded" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 w-full bg-primary/5 animate-pulse rounded-xl" />
                  ))}
                </div>
              </div>
            </Card>
          ) : (focusedSession || selectedSessionId) ? (
            <div className="space-y-4">
              <LiveResponseFeed 
                sessionId={focusedSession?.id || ''} 
                onResponsesUpdate={setSessionResponses} 
                isHistory={focusedSession?.status !== 'active'}
              />
            </div>
          ) : (
            <Card className="glass-card border-dashed border-primary/50 py-12 text-center">
              <CardContent className="space-y-4">
                <TargetIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold">No Active Session</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Start a session from the PDF viewer to engage with your students in real-time.
                </p>
                <Button variant="outline" onClick={() => navigate('/teacher/files')}>Go to Files</Button>
              </CardContent>
            </Card>
          )}

          {!selectedSessionId && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Participation Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {sessionsLoading ? (
                   <div className="w-full h-full flex items-end gap-2 px-2 pb-4">
                     {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                       <div key={i} className="flex-1 bg-primary/5 animate-pulse rounded-t-lg" style={{ height: `${h}%` }} />
                     ))}
                   </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
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
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          {sessionsLoading ? (
             <Card className="glass-card">
               <CardHeader><div className="h-6 w-32 bg-primary/10 animate-pulse rounded" /></CardHeader>
               <CardContent className="space-y-4">
                 {[1, 2, 3, 4, 5].map(i => (
                   <div key={i} className="flex items-center gap-4">
                     <div className="h-10 w-10 bg-primary/10 animate-pulse rounded-full" />
                     <div className="flex-1 space-y-2">
                       <div className="h-3 w-24 bg-primary/10 animate-pulse rounded" />
                       <div className="h-2 w-full bg-primary/5 animate-pulse rounded" />
                     </div>
                   </div>
                 ))}
               </CardContent>
             </Card>
          ) : focusedSession && <EngagementLeaderboard responses={sessionResponses} isLoading={sessionsLoading} />}
          
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-accent" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-6">
                {sessionsLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-3 w-32 bg-primary/10 animate-pulse rounded" />
                        <div className="h-3 w-16 bg-primary/10 animate-pulse rounded" />
                      </div>
                      <div className="h-2 w-full bg-primary/5 animate-pulse rounded" />
                    </div>
                  ))
                ) : (
                  sessionsArr.slice(0, 5).map((session: any) => {
                    const analytics = session.engagement_analytics || [];
                    const avgAccuracy = analytics.length > 0 ? Math.round(analytics.reduce((sum: number, a: any) => sum + Number(a.accuracy_rate || 0), 0) / analytics.length) : 0;
                    const avgParticipation = analytics.length > 0 ? Math.round(analytics.reduce((sum: number, a: any) => sum + Number(a.participation_rate || 0), 0) / analytics.length) : 0;
                    const isSelected = selectedSessionId === session.id;
                    
                    return (
                      <div 
                        key={session.id} 
                        className={`space-y-2 group cursor-pointer p-2 rounded-lg transition-colors ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`} 
                        onClick={() => setDrillDownSessionId(session.id)}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-foreground truncate max-w-[140px] tracking-tight">{session.session_name || `Session ${session.id.slice(0, 8)}`}</span>
                          <span className="text-muted-foreground font-black text-[10px] uppercase opacity-60">{avgAccuracy}% Accuracy</span>
                        </div>
                        <div className="relative h-2.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/50">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${avgParticipation}%` }} className="absolute inset-y-0 left-0 bg-primary/60" />
                        </div>
                      </div>
                    );
                  })
                )}
                {!sessionsLoading && sessionsArr.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No recent sessions found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <SessionDetailDialog 
        sessionId={drillDownSessionId} 
        isOpen={!!drillDownSessionId} 
        onClose={() => setDrillDownSessionId(null)} 
      />
    </div>
  );
};
