import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface StudentQuestionPopupProps {
  questionId: string;
  timeLimit: number;
  points: number;
  onAnswerNow: () => void;
  onDismiss: () => void;
}

export const StudentQuestionPopup: React.FC<StudentQuestionPopupProps> = ({
  questionId,
  timeLimit,
  points,
  onAnswerNow,
  onDismiss,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);

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
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="fixed top-4 right-4 z-[9998] w-80"
      >
        <Card className="glass-card p-4 shadow-2xl border-2 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Bell className="w-5 h-5 text-primary animate-pulse" />
            </div>
            
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg">New Question!</h3>
              <p className="text-sm text-muted-foreground">
                Your teacher sent a question. Click to answer and earn points!
              </p>
              
              <div className="flex items-center gap-2 pt-2">
                <Button
                  className="flex-1 neon-glow"
                  onClick={onAnswerNow}
                >
                  Answer Now
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  ⏱️ {timeRemaining}s to respond
                </span>
                <span className="flex items-center gap-1">
                  💰 {points} points
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
