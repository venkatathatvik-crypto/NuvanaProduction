import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Timer, Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface StudentQuestionPopupProps {
  questionId: string;
  timeLimit: number;
  points: number;
  expiresAt?: string | Date;
  onAnswerNow: () => void;
  onDismiss: () => void;
}

export const StudentQuestionPopup: React.FC<StudentQuestionPopupProps> = ({
  questionId,
  timeLimit,
  points,
  expiresAt,
  onAnswerNow,
  onDismiss,
}) => {
  const calculateRemainingTime = () => {
    if (expiresAt) {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      // Buffer for clock drift + UI transitions (matching modal logic)
      return Math.min(remaining + 4, timeLimit);
    }
    return timeLimit;
  };

  const [timeRemaining, setTimeRemaining] = useState(calculateRemainingTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/60 backdrop-blur-md"
          onClick={onDismiss}
        />

        {/* Large Centered Card */}
        <motion.div
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-lg"
        >
          <Card className="glass-card p-10 shadow-2xl border-4 border-primary/30 relative overflow-hidden group">
            {/* Decorative background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors duration-500" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-neon-purple/20 rounded-full blur-3xl group-hover:bg-neon-purple/30 transition-colors duration-500" />

            <div className="relative space-y-8 text-center">
              {/* Icon & Title */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping opacity-25" />
                  <Bell className="w-10 h-10 text-primary animate-bounce-subtle" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight bg-gradient-to-r from-primary to-neon-purple bg-clip-text text-transparent">
                    CHALLENGE INBOUND!
                  </h3>
                  <p className="text-muted-foreground text-lg">
                    A new question has just been fired by your teacher.
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card border border-primary/20 p-4 rounded-xl flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-primary">
                    <Timer className="w-5 h-5" />
                    <span className="font-bold">TIME LIMIT</span>
                  </div>
                  <span className="text-2xl font-black">{timeRemaining}s</span>
                </div>
                <div className="glass-card border border-neon-purple/20 p-4 rounded-xl flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-neon-purple">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold">BOUNTY</span>
                  </div>
                  <span className="text-2xl font-black">{points} Points</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full h-16 text-xl font-bold rounded-xl neon-glow gap-3 group/btn hover:scale-[1.02] transition-transform"
                  onClick={onAnswerNow}
                >
                  LOCK IN ANSWER
                  <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-12 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"
                  onClick={onDismiss}
                >
                  <X className="w-4 h-4 mr-2" />
                  Dismiss Challenge
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
