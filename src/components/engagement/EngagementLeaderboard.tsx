import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Star, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Participant {
  studentId: string;
  studentName: string;
  points: number;
  accuracy: number;
}

interface EngagementLeaderboardProps {
  responses: any[]; // Raw responses from the session
}

export const EngagementLeaderboard: React.FC<EngagementLeaderboardProps> = ({ responses }) => {
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
        studentStats[id].points += 10; // Simple point logic
        studentStats[id].accuracy += 1;
      }
    });

    return Object.values(studentStats)
      .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy)
      .slice(0, 10);
  }, [responses]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1: return <Medal className="w-5 h-5 text-gray-400" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="text-muted-foreground font-bold w-5 text-center">{index + 1}</span>;
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="w-5 h-5 text-yellow-500 animate-pulse" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence mode="popLayout">
          {leaderboardData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground italic">
              Competition heating up shortly...
            </div>
          ) : (
            leaderboardData.map((student, index) => (
              <motion.div
                key={student.studentId}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  index === 0 ? 'bg-yellow-500/10 border-yellow-500/20 shadow-lg' : 'bg-muted/30 border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{student.studentName}</p>
                      <p className="text-[10px] text-muted-foreground">Points: {student.points}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={index === 0 ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' : ''}>
                    {student.points} pts
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
