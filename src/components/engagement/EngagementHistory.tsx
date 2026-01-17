import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Award, Calendar, Users, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface EngagementRecord {
  id: string;
  sessionId: string;
  sessionName: string;
  teacherName: string;
  startedAt: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  pointsEarned: number;
  accuracyRate: number;
  participationRate: number;
  engagementScore: number;
}

interface EngagementHistoryProps {
  history: EngagementRecord[];
  isLoading: boolean;
}

export const EngagementHistory: React.FC<EngagementHistoryProps> = ({ history, isLoading }) => {
  const getMedal = (accuracy: number) => {
    if (accuracy >= 90) return { icon: <Award className="w-5 h-5 text-yellow-500" />, label: 'Gold', color: 'bg-yellow-500/10 text-yellow-600' };
    if (accuracy >= 75) return { icon: <Award className="w-5 h-5 text-slate-400" />, label: 'Silver', color: 'bg-slate-400/10 text-slate-500' };
    if (accuracy >= 60) return { icon: <Award className="w-5 h-5 text-amber-600" />, label: 'Bronze', color: 'bg-amber-600/10 text-amber-700' };
    return null;
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Engagement Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse bg-muted/20 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const historyItems = Array.isArray(history) ? history : [];

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" /> Engagement Journey
          </CardTitle>
          <p className="text-sm text-muted-foreground">Your history of live classroom interactions</p>
        </div>
      </CardHeader>
      <CardContent>
        {historyItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground italic">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
            No engagement history found yet. Join a live session to start your journey!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[250px]">Session</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right w-[100px]">Medal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {historyItems.map((record, index) => {
                    const medal = getMedal(record.accuracyRate);
                    return (
                      <motion.tr
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/30 border-border/50 transition-colors cursor-default"
                      >
                        <TableCell className="font-semibold">{record.sessionName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            {record.teacherName}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(record.startedAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`font-mono ${record.accuracyRate >= 80 ? 'text-green-500 border-green-500/20' : 'text-blue-500'}`}>
                            {record.accuracyRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          +{record.pointsEarned}
                        </TableCell>
                        <TableCell className="text-right">
                          {medal ? (
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${medal.color}`}>
                              {medal.icon}
                              {medal.label}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
