import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Award, Calendar, Users, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
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
    if (accuracy >= 90) return { icon: <Award className="w-3.5 h-3.5" />, label: 'Gold Rank', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' };
    if (accuracy >= 75) return { icon: <Award className="w-3.5 h-3.5" />, label: 'Silver Rank', color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };
    if (accuracy >= 60) return { icon: <Award className="w-3.5 h-3.5" />, label: 'Bronze Rank', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    return null;
  };

  const historyItems = Array.isArray(history) ? history : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Engagement Journey</h2>
          <p className="text-sm text-muted-foreground mt-1">Your track record of live classroom participation</p>
        </div>
        {!isLoading && historyItems.length > 0 && (
          <Badge variant="outline" className="glass bg-primary/5 text-primary border-primary/20 px-3 py-1">
            {historyItems.length} Sessions Completed
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full glass-card rounded-2xl" />
          ))}
        </div>
      ) : historyItems.length === 0 ? (
        <Card className="glass-card border-dashed bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-muted-foreground opacity-30" />
            </div>
            <h3 className="text-lg font-semibold">No Sessions Joined Yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-2">
              Your engagement journey starts when you participate in your first live session. Keep an eye out for teacher questions!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {historyItems.map((record, index) => {
              const medal = getMedal(record.accuracyRate);
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className="glass-card overflow-hidden h-full group transition-all duration-300 hover:border-primary/40">
                    <CardHeader className="pb-4 border-b border-border/50 bg-primary/[0.01]">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base font-bold truncate group-hover:text-primary transition-colors">
                            {record.sessionName}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1 opacity-60">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[10px] font-medium uppercase tracking-wider">
                              {format(new Date(record.startedAt), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                        {medal && (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-tighter shadow-sm ${medal.color}`}>
                            {medal.icon}
                            {medal.label}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Accuracy</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xl font-black ${record.accuracyRate >= 80 ? 'text-green-500' : 'text-primary'}`}>
                              {record.accuracyRate}%
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest opacity-60">Points</p>
                          <div className="flex items-center justify-end gap-1.5 font-black text-xl text-primary">
                            <Zap className="w-4 h-4" />
                            +{record.pointsEarned}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                          <span>Participation</span>
                          <span>{record.participationRate}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/50">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${record.participationRate}%` }} 
                            className="h-full bg-primary/60"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-primary" />
                          <span>Dr. {record.teacherName}</span>
                        </div>
                        <span>{record.answeredCount}/{record.totalQuestions} Questions</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
