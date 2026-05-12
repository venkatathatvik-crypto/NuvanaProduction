import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface Participant {
  studentId: string;
  studentName: string;
  points: number;
  accuracy: number;
}

interface EngagementLeaderboardProps {
  responses: any[]; // Raw responses from the session
  isLoading?: boolean;
}

export const EngagementLeaderboard: React.FC<EngagementLeaderboardProps> = ({ responses, isLoading }) => {
  const leaderboardData = useMemo(() => {
    const studentStats: Record<string, Participant> = {};
    
    responses.forEach((resp) => {
      const id = resp.studentId;
      if (!studentStats[id]) {
        studentStats[id] = {
          studentId: id,
          studentName: resp.studentName,
          points: 0,
          accuracy: 0,
        };
      }
      
      if (resp.isCorrect) {
        studentStats[id].points += (resp.points ?? 10);
        studentStats[id].accuracy += 1;
      }
    });

    return Object.values(studentStats)
      .sort((a, b) => b.accuracy - a.accuracy || b.points - a.points)
      .slice(0, 10);
  }, [responses]);

  const top3 = leaderboardData.slice(0, 3);
  const others = leaderboardData.slice(3);

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return { icon: <Trophy className="w-5 h-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20', label: '1st' };
      case 1: return { icon: <Medal className="w-4 h-4" />, color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20', label: '2nd' };
      case 2: return { icon: <Medal className="w-4 h-4" />, color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20', label: '3rd' };
      default: return { icon: null, color: 'text-muted-foreground', bg: 'bg-muted/10 border-border/50', label: `${index + 1}th` };
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Star className="w-5 h-5 text-yellow-500" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 pb-6 pt-2 space-y-6">
            <div className="flex items-end justify-center gap-2 sm:gap-4 mt-8 mb-4">
              {/* 2nd Place Skeleton */}
              <div className="flex flex-col items-center gap-2 w-24 sm:w-28">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2 w-12" />
                <div className="w-full h-16 bg-muted/20 animate-pulse rounded-t-xl" />
              </div>
              {/* 1st Place Skeleton */}
              <div className="flex flex-col items-center gap-2 w-28 sm:w-32 -mb-2">
                <Skeleton className="w-18 h-18 rounded-3xl" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2 w-14" />
                <div className="w-full h-24 bg-muted/30 animate-pulse rounded-t-xl" />
              </div>
              {/* 3rd Place Skeleton */}
              <div className="flex flex-col items-center gap-2 w-24 sm:w-28">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2 w-12" />
                <div className="w-full h-12 bg-muted/10 animate-pulse rounded-t-xl" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/5 rounded-xl animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-muted/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-muted/10 rounded" />
                    <div className="h-2 w-full bg-muted/5 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground italic text-sm">
            Waiting for first blood...
          </div>
        ) : (
          <div className="px-4 pb-6 pt-2 space-y-6">
            {/* Podium View */}
            <div className="flex items-end justify-center gap-2 sm:gap-4 mt-8 mb-4">
              {/* 2nd Place */}
              {top3[1] && (
                <div className="flex flex-col items-center gap-2 w-24 sm:w-28">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-slate-400/10 border border-slate-400/20 flex items-center justify-center">
                      <User className="w-7 h-7 text-slate-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-slate-400 text-white flex items-center justify-center shadow-lg">
                      <Medal className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold truncate w-full px-1">{top3[1].studentName}</p>
                    <p className="text-[10px] font-black text-slate-400">{top3[1].points} PTS</p>
                  </div>
                  <div className="w-full h-16 bg-slate-400/5 border-x border-t border-slate-400/20 rounded-t-xl" />
                </div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <div className="flex flex-col items-center gap-2 w-28 sm:w-32 -mb-2">
                  <div className="relative">
                    <div className="w-18 h-18 rounded-3xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                      <User className="w-9 h-9 text-yellow-500" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-xl bg-yellow-500 text-white flex items-center justify-center shadow-xl ring-4 ring-background">
                      <Trophy className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black truncate w-full px-1">{top3[0].studentName}</p>
                    <p className="text-xs font-black text-yellow-500">{top3[0].points} PTS</p>
                  </div>
                  <div className="w-full h-24 bg-yellow-500/10 border-x border-t border-yellow-500/20 rounded-t-2xl shadow-[0_-10px_20px_rgba(234,179,8,0.05)]" />
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div className="flex flex-col items-center gap-2 w-24 sm:w-28">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <User className="w-7 h-7 text-orange-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-lg">
                      <Medal className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold truncate w-full px-1">{top3[2].studentName}</p>
                    <p className="text-[10px] font-black text-orange-500">{top3[2].points} PTS</p>
                  </div>
                  <div className="w-full h-12 bg-orange-500/5 border-x border-t border-orange-500/20 rounded-t-xl" />
                </div>
              )}
            </div>

            {/* List for the rest */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {others.map((student, index) => {
                  const style = getRankStyle(index + 3);
                  return (
                    <motion.div
                      key={student.studentId}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50 hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-[10px] font-black text-muted-foreground text-center">{index + 4}</span>
                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary opacity-40" />
                        </div>
                        <p className="font-bold text-sm tracking-tight">{student.studentName}</p>
                      </div>
                      <Badge variant="outline" className="font-black text-[11px] bg-primary/5 text-primary border-primary/20">
                        {student.points} PTS
                      </Badge>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
