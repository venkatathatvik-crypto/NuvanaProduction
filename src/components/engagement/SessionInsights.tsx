import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Target, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TopicHealthPoint {
  questionNumber: number;
  accuracy: number;
  totalResponses: number;
}

interface AtRiskStudent {
  studentId: string;
  name: string;
  engagementScore: number;
  accuracy: number;
  responseTime: number;
}

interface SessionInsightsProps {
  topicHealth: TopicHealthPoint[];
  atRiskStudents: AtRiskStudent[];
  isLoading?: boolean;
}

export const SessionInsights: React.FC<SessionInsightsProps> = ({
  topicHealth,
  atRiskStudents,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card animate-pulse h-[350px]" />
        <Card className="glass-card animate-pulse h-[350px]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Topic Health (Accuracy per Question) ── */}
      <Card className="glass-card border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Topic Health
          </CardTitle>
          <CardDescription>Accuracy percentage for each pop question</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] pt-4">
          {topicHealth.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground italic opacity-50">
              No questions sent in this session yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicHealth}>
                <XAxis 
                  dataKey="questionNumber" 
                  tick={{ fontSize: 10, fontWeight: 'bold' }} 
                  label={{ value: 'Q#', position: 'insideBottom', offset: -5, fontSize: 10 }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 10 }} 
                  unit="%" 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} barSize={30}>
                  {topicHealth.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.accuracy > 70 ? '#10b981' : entry.accuracy > 40 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── At-Risk Students ── */}
      <Card className="glass-card border-red-500/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black flex items-center gap-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            At-Risk Students
          </CardTitle>
          <CardDescription>Students with low engagement or high response times</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[250px] overflow-y-auto pt-4 space-y-3">
          {atRiskStudents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground italic opacity-50 py-10">
              No students flagged as at-risk. Great job!
            </div>
          ) : (
            atRiskStudents.map((student) => (
              <motion.div 
                key={student.studentId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{student.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                      Score: {student.engagementScore} | {(student.responseTime / 1000).toFixed(1)}s avg
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-red-500 border-red-500/20 font-black text-[10px]">
                    {student.accuracy}% ACC
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
