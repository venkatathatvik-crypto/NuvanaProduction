import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { engagementSocket } from '@/services/engagementSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, LayoutGrid, List } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { engagementApi } from '@/services/engagementApi';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip } from 'recharts';

interface Response {
  studentId: string;
  studentName: string;
  responseTime: number;
  isCorrect: boolean;
  selectedOption: string;
}

export const LiveResponseFeed: React.FC<{ 
  sessionId: string; 
  onResponsesUpdate?: (responses: Response[]) => void;
}> = ({ sessionId, onResponsesUpdate }) => {
  const [liveResponses, setLiveResponses] = useState<Response[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('chart');

  const { data: sessionDataRaw, isLoading } = useQuery({
    queryKey: ['session-details', sessionId],
    queryFn: () => engagementApi.getSession(sessionId, localStorage.getItem('access_token') || ''),
    enabled: !!sessionId,
  });

  const historicalResponses = useMemo(() => {
    if (!sessionDataRaw) return [];
    
    // Support both wrapped {data: ...} and direct array
    const data = (sessionDataRaw as any).data || sessionDataRaw;
    const questions = data?.pop_questions || [];
    
    const allResps: Response[] = [];
    questions.forEach((q: any) => {
      (q.student_responses || []).forEach((r: any) => {
        allResps.push({
          studentId: r.student_id,
          studentName: r.profiles?.name || 'Unknown',
          responseTime: r.response_time_ms,
          isCorrect: r.is_correct,
          selectedOption: r.selected_option,
        });
      });
    });
    return allResps;
  }, [sessionDataRaw]);

  const allResponses = useMemo(() => {
    // Merge live and historical, removing duplicates by studentId (preferring live if needed)
    const seen = new Set();
    const merged = [...liveResponses];
    merged.forEach(r => seen.add(r.studentId));
    
    historicalResponses.forEach(r => {
      if (!seen.has(r.studentId)) {
        merged.push(r);
        seen.add(r.studentId);
      }
    });

    return merged.sort((a, b) => b.responseTime - a.responseTime);
  }, [liveResponses, historicalResponses]);

  useEffect(() => {
    onResponsesUpdate?.(allResponses);
  }, [allResponses, onResponsesUpdate]);

  // Aggregate data for the bar chart
  const chartData = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    allResponses.forEach(r => {
      const opt = r.selectedOption as keyof typeof counts;
      if (counts[opt] !== undefined) counts[opt]++;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [allResponses]);

  useEffect(() => {
    if (!sessionId) return;

    const handleResponse = (data: any) => {
      console.log('[LiveResponseFeed] New response received:', data);
      setLiveResponses((prev) => [
        {
          studentId: data.studentId,
          studentName: data.studentName,
          responseTime: data.responseTime,
          isCorrect: data.isCorrect,
          selectedOption: data.selectedOption,
        },
        ...prev,
      ]);
    };

    engagementSocket.onResponseReceived(handleResponse);
    return () => {
      engagementSocket.off('response:received', handleResponse);
    };
  }, [sessionId]);

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-4">
          <CardTitle className="text-lg font-semibold">Live Pulse</CardTitle>
          <div className="flex bg-muted rounded-lg p-1">
            <Button 
              variant={viewMode === 'chart' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('chart')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-500 border-green-500/20">
          Live
        </Badge>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : allResponses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
            <p>Waiting for students to respond...</p>
          </div>
        ) : viewMode === 'chart' ? (
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 14, fontWeight: 600 }}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="glass p-2 rounded-lg border border-primary/20 shadow-xl">
                          <p className="font-bold text-primary">Option {payload[0].payload.name}</p>
                          <p className="text-xs">{payload[0].value} votes</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={1000}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444'][index % 4]}
                      fillOpacity={0.8}
                    />
                  ))}
                  <LabelList 
                    dataKey="count" 
                    position="top" 
                    fill="hsl(var(--foreground))" 
                    fontSize={16} 
                    fontWeight={700}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence initial={false}>
              {allResponses.map((resp, i) => (
                <motion.div
                  key={`${resp.studentId}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    {resp.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{resp.studentName}</p>
                      <p className="text-xs text-muted-foreground">Selected: {resp.selectedOption}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {resp.responseTime}ms
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
