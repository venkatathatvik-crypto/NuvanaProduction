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
  expiresAt?: string | Date;
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
  expiresAt,
  onClose,
}) => {
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  
  // Calculate initial time remaining based on expiresAt for late joiners
  const calculateInitialTime = () => {
    if (expiresAt) {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      return Math.min(remaining + 4, timeLimit); 
    }
    return timeLimit;
  };

  const [timeRemaining, setTimeRemaining] = useState(calculateInitialTime());
  const [submitted, setSubmitted] = useState(false);
  const [submissionTime, setSubmissionTime] = useState<number | null>(null);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    correctOption: string;
    pointsEarned: number;
  } | null>(null);
  const [startTime] = useState(Date.now());
  const [wasExpired, setWasExpired] = useState(false);

  useEffect(() => {
    if (submitted) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [submitted]);

  useEffect(() => {
    if (timeRemaining === 0 && !submitted && !wasExpired) {
      setWasExpired(true);
      toast.error('Time expired!');
      setTimeout(onClose, 3000);
    }
  }, [timeRemaining, submitted, wasExpired, onClose]);

  useEffect(() => {
    const handleResult = (data: any) => {
      setResult(data);
      setSubmitted(true);
      if (data.isCorrect) {
        toast.success(`Correct! +${data.pointsEarned} points 🎉`);
      } else {
        toast.error(`Incorrect. Correct answer: ${data.correctOption}`);
      }
      setTimeout(onClose, 10000); // 10 seconds to see results
    };

    engagementSocket.onResponseResult(handleResult);
    return () => engagementSocket.off('response:result', handleResult);
  }, [onClose]);

  const handleSubmit = () => {
    if (!questionId || !selectedOption) return;
    
    const timeTaken = Date.now() - startTime;
    setSubmissionTime(timeTaken);
    
    engagementSocket.submitResponse({
      question_id: questionId,
      student_id: studentId,
      selected_option: selectedOption,
      response_time_ms: timeTaken,
    }, (response) => {
      if (!response.success) {
        toast.error(`Submission failed: ${response.error || 'Unknown error'}`);
        setSubmitted(false);
      }
    });

    setSubmitted(true);
  };


  const progressPercentage = (timeRemaining / timeLimit) * 100;
  const progressColor = progressPercentage > 50 ? 'text-green-500' : progressPercentage > 25 ? 'text-yellow-500' : 'text-red-500';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-background/60 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="w-full max-w-4xl"
        >
          <Card className="bg-card/40 border-white/10 shadow-2xl backdrop-blur-2xl p-6 md:p-8 relative overflow-y-auto max-h-[85vh] rounded-[2rem] border-t-white/5 mx-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
            {/* Ambient Background Effects - Softened */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              
              {/* Left Column: Info, Timer, Results */}
              <div className="flex flex-col gap-6 justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/5" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPercentage / 100)}`} className={`${progressColor} transition-all duration-1000`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-black ${progressColor}`}>{timeRemaining}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-white/40 text-[9px] font-black tracking-widest uppercase">Live Challenge</h3>
                      <div className="flex items-center gap-1.5">
                         <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded-md border border-primary/20">{points} PTS</span>
                         {submitted && (
                           <span className="text-[10px] font-bold text-green-500 px-1.5 py-0.5 bg-green-500/10 rounded-md border border-green-500/20 uppercase">Locked In</span>
                         )}
                      </div>
                    </div>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight text-white">
                    {questionText}
                  </h2>
                </div>

                {result && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`p-6 rounded-[1.5rem] border flex flex-col items-center justify-center text-center gap-4 ${
                      result.isCorrect 
                        ? 'bg-green-500/[0.03] border-green-500/20' 
                        : 'bg-primary/[0.03] border-primary/20'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <h3 className={`text-3xl font-black italic tracking-tighter ${result.isCorrect ? 'text-green-500' : 'text-primary'}`}>
                        {result.isCorrect ? "SPOT ON!" : "NICE TRY!"}
                      </h3>
                      <p className="text-[9px] font-black tracking-[0.2em] uppercase text-white/30">Class Verdict</p>
                    </div>
                    
                    <div className="space-y-2 w-full">
                       <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500 text-white flex items-center justify-center text-3xl font-black shadow-lg">
                         {result.correctOption}
                       </div>
                       <p className="text-sm font-medium text-white/60 truncate max-w-full px-2">
                         {options[result.correctOption as keyof typeof options]}
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                       <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[8px] font-bold text-white/20 uppercase tracking-wider mb-1">Time</p>
                          <p className="text-base font-black text-white">{(submissionTime! / 1000).toFixed(1)}s</p>
                       </div>
                       <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-[8px] font-bold text-white/20 uppercase tracking-wider mb-1">Score</p>
                          <p className={`text-base font-black ${result.isCorrect ? 'text-green-500' : 'text-white'}`}>
                            +{result.isCorrect ? result.pointsEarned : 0}
                          </p>
                       </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Interaction & Stats */}
              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                     <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Select Answer</span>
                     {submitted && (
                        <span className="text-[9px] font-black text-white/40 uppercase items-center flex gap-1">
                          <Check className="w-2 h-2" /> Answer Recorded
                        </span>
                     )}
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {(Object.keys(options) as Array<'A' | 'B' | 'C' | 'D'>).map((key) => {
                      const isSelected = selectedOption === key;
                      const isCorrect = result?.correctOption === key;
                      
                      let buttonClass = 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20';
                      let iconClass = 'bg-white/10 text-white/40';
                      let icon: React.ReactNode = key;

                      if (isCorrect) {
                        buttonClass = 'border-green-500/50 bg-green-500/10 shadow-sm';
                        iconClass = 'bg-green-500 text-white';
                        icon = <Check className="w-4 h-4" />;
                      } else if (isSelected) {
                        buttonClass = 'border-primary/50 bg-primary/10 shadow-sm ring-1 ring-primary/20';
                        iconClass = 'bg-primary text-primary-foreground';
                        icon = submitted ? <Check className="w-3 h-3" /> : key;
                      }

                      return (
                        <motion.button
                          key={key}
                          whileHover={!submitted ? { x: 4, backgroundColor: 'rgba(255,255,255,0.08)' } : {}}
                          whileTap={!submitted ? { scale: 0.99 } : {}}
                          onClick={() => !submitted && setSelectedOption(key)}
                          disabled={submitted}
                          className={`group w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${buttonClass} ${submitted ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-base transition-transform ${iconClass}`}>
                            {icon}
                          </div>
                          <span className="flex-1 font-semibold text-base leading-tight text-white/90">{options[key]}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {!submitted ? (
                  <Button
                    className="w-full h-14 rounded-xl text-sm font-bold uppercase tracking-wider glow-sm"
                    onClick={handleSubmit}
                    disabled={!selectedOption || submitted}
                  >
                    Lock It In
                  </Button>
                ) : (
                  submitted && !result && (
                    <div className="flex-1 flex items-center justify-center p-8 border border-white/5 bg-white/[0.02] rounded-[1.5rem]">
                      <div className="text-center space-y-2">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto opacity-50" />
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Analyzing Performance...</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Bottom Status Bar - Compact */}
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between opacity-40">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white">{studentName}</span>
               </div>
               <div className="text-[9px] font-bold uppercase tracking-widest text-white">
                  {selectedOption ? `LOCKED: ${selectedOption}` : 'AWAITING SELECTION'}
               </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
