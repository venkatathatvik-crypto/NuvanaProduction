import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { engagementSocket } from '@/services/engagementSocket';
import { toast } from 'sonner';

interface StudentQuestionModalProps {
  questionId: string;
  questionText: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  timeLimit: number;
  points: number;
  studentId: string;
  studentName: string;
  sessionId: string;
  onClose: () => void;
}

export const StudentQuestionModal: React.FC<StudentQuestionModalProps> = ({
  questionId,
  questionText,
  options,
  timeLimit,
  points,
  studentId,
  studentName,
  sessionId,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctOption: string;
    pointsEarned: number;
  } | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submitted) {
            toast.error('Time expired!');
            setTimeout(onClose, 1000);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [submitted, onClose]);

  // Listen for result
  useEffect(() => {
    const handleResult = (data: any) => {
      setResult(data);
      setSubmitted(true);
      
      if (data.isCorrect) {
        toast.success(`Correct! +${data.pointsEarned} points 🎉`);
      } else {
        toast.error(`Incorrect. Correct answer: ${data.correctOption}`);
      }
      
      // Auto-close after 2 seconds
      setTimeout(onClose, 2000);
    };

    engagementSocket.onResponseResult(handleResult);

    return () => {
      engagementSocket.off('response:result', handleResult);
    };
  }, [onClose]);

  const handleSubmit = () => {
    console.log('[StudentQuestionModal] Submitting response. QuestionID:', questionId, 'StudentID:', studentId);
    
    if (!questionId) {
      console.error('[StudentQuestionModal] CRITICAL: questionId is missing in handleSubmit!');
      toast.error('Internal error: Question ID missing. Please refresh.');
      return;
    }

    if (!selectedOption) {
      toast.error('Please select an answer');
      return;
    }

    const responseTime = Date.now() - startTime;
    
    engagementSocket.submitResponse({
      question_id: questionId,
      student_id: studentId,
      selected_option: selectedOption,
      response_time_ms: responseTime,
    });

    setSubmitted(true);
  };

  const sendReaction = (emoji: string) => {
    engagementSocket.sendReaction({
      sessionId,
      emoji,
      studentName,
    });
  };

  const progressPercentage = (timeRemaining / timeLimit) * 100;
  const progressColor = progressPercentage > 50 ? 'text-green-500' : progressPercentage > 25 ? 'text-yellow-500' : 'text-red-500';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-gradient-to-br from-primary/10 to-neon-purple/10 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-2xl"
        >
          <Card className="glass-card p-8 space-y-6 relative overflow-hidden">
            {/* Confetti effect for correct answer */}
            {result?.isCorrect && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -20, x: Math.random() * 100 + '%', opacity: 1 }}
                    animate={{ y: '100vh', opacity: 0 }}
                    transition={{ duration: 2, delay: i * 0.1 }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][i % 4],
                    }}
                  />
                ))}
              </div>
            )}

            {/* Timer */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercentage / 100)}`}
                    className={`${progressColor} transition-all duration-1000`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${progressColor}`}>
                    {timeRemaining}
                  </span>
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{questionText}</h2>
              {!submitted && (
                <p className="text-sm text-muted-foreground">
                  Select your answer below
                </p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              {(Object.keys(options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
                const isSelected = selectedOption === key;
                const isCorrect = result?.correctOption === key;
                const isWrong = submitted && selectedOption === key && !result?.isCorrect;

                return (
                  <motion.button
                    key={key}
                    whileHover={!submitted ? { scale: 1.02 } : {}}
                    whileTap={!submitted ? { scale: 0.98 } : {}}
                    onClick={() => !submitted && setSelectedOption(key)}
                    disabled={submitted}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                      isCorrect
                        ? 'border-green-500 bg-green-500/10'
                        : isWrong
                        ? 'border-red-500 bg-red-500/10'
                        : isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted hover:border-primary/50'
                    } ${submitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        isCorrect
                          ? 'bg-green-500 text-white'
                          : isWrong
                          ? 'bg-red-500 text-white'
                          : isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted-foreground/20 text-foreground'
                      }`}
                    >
                      {isCorrect ? <Check className="w-5 h-5" /> : isWrong ? <X className="w-5 h-5" /> : key}
                    </div>
                    <span className="flex-1 font-medium">{options[key]}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Result Message */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-center p-4 rounded-lg ${
                  result.isCorrect ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}
              >
                <p className="text-2xl font-bold">
                  {result.isCorrect ? `Correct! +${result.pointsEarned} points 🎉` : 'Incorrect'}
                </p>
              </motion.div>
            )}

            {/* Submit Button */}
            {!submitted && (
              <Button
                className="w-full neon-glow"
                size="lg"
                onClick={handleSubmit}
                disabled={!selectedOption || submitted}
              >
                Submit Answer
              </Button>
            )}

            {/* Points Info */}
            <div className="text-center text-sm text-muted-foreground flex items-center justify-between">
              <span>💰 {points} points available</span>
              
              <div className="flex gap-2">
                {['❤️', '🔥', '👏', '😮'].map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => sendReaction(emoji)}
                    className="text-xl hover:grayscale-0 grayscale transition-all"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
