import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { engagementSocket } from '@/services/engagementSocket';
import { useAuth } from '@/auth/AuthContext';

interface QuestionPanelProps {
  sessionId: string;
  onClose: () => void;
  fileName?: string;
  pageNumber?: number;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  sessionId,
  onClose,
  fileName,
  pageNumber,
}) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [timeLimit, setTimeLimit] = useState(30);
  const [points, setPoints] = useState(10);
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    if (!questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    setSending(true);

    const questionData = {
      session_id: sessionId,
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correctOption,
      time_limit_seconds: timeLimit,
      points: points,
    };

    engagementSocket.sendQuestion(questionData, (response) => {
      setSending(false);
      if (response.success) {
        toast.success('Question sent to students!');
        // Reset form
        setQuestionText('');
        setOptionA('');
        setOptionB('');
        setOptionC('');
        setOptionD('');
        setCorrectOption('A');
        onClose();
        // Redirect to engagement tab in analytics
        navigate('/teacher/analytics?tab=engagement');
      } else {
        toast.error(response.error || 'Failed to send question');
      }
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border shadow-2xl z-[101] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Quick Question</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Context */}
          {fileName && (
            <Card className="glass-card p-3">
              <p className="text-xs text-muted-foreground">
                About: <span className="font-medium text-foreground">{fileName}</span>
                {pageNumber && ` (Page ${pageNumber})`}
              </p>
            </Card>
          )}

          {/* Question Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Question</label>
            <textarea
              className="w-full p-3 rounded-lg bg-muted border border-border resize-none focus:ring-2 focus:ring-primary outline-none"
              rows={3}
              placeholder="Enter your question..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Options</label>
            
            {[
              { label: 'A', value: optionA, setter: setOptionA },
              { label: 'B', value: optionB, setter: setOptionB },
              { label: 'C', value: optionC, setter: setOptionC },
              { label: 'D', value: optionD, setter: setOptionD },
            ].map((option) => (
              <div key={option.label} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-all ${
                    correctOption === option.label
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  onClick={() => setCorrectOption(option.label as 'A' | 'B' | 'C' | 'D')}
                >
                  {option.label}
                </div>
                <Input
                  placeholder={`Option ${option.label}`}
                  value={option.value}
                  onChange={(e) => option.setter(e.target.value)}
                  className="flex-1"
                />
              </div>
            ))}
            
            <p className="text-xs text-muted-foreground">
              Click the letter to mark as correct answer
            </p>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Limit</label>
              <select
                className="w-full p-2 rounded-lg bg-muted border border-border"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
              >
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={20}>20 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
                <option value={120}>120 seconds</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Points</label>
              <select
                className="w-full p-2 rounded-lg bg-muted border border-border"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              >
                <option value={5}>5 points</option>
                <option value={10}>10 points</option>
                <option value={15}>15 points</option>
                <option value={20}>20 points</option>
                <option value={25}>25 points</option>
                <option value={30}>30 points</option>
                <option value={50}>50 points</option>
              </select>
            </div>
          </div>

          {/* Send Button */}
          <Button
            className="w-full neon-glow"
            size="lg"
            onClick={handleSend}
            disabled={sending}
          >
            <Target className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : 'Send to Class'}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
