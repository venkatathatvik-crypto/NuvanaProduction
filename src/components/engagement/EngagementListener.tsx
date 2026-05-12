import React, { useEffect, useState, useRef, useCallback } from 'react';
import { engagementSocket } from '@/services/engagementSocket';
import { StudentQuestionPopup } from './StudentQuestionPopup';
import { StudentQuestionModal } from './StudentQuestionModal';
import { useAuth } from '@/auth/AuthContext';
import { engagementApi } from '@/services/engagementApi';
import { logger } from '@/lib/logger';

interface EngagementListenerProps {
  classId: string;
}

export const EngagementListener: React.FC<EngagementListenerProps> = ({ classId }) => {
  const { profile } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  
  // Track questions we've already handled in this session to prevent loops
  const handledQuestionsRef = useRef<Set<string>>(new Set());
  
  // Use a ref to always have the latest question data in event handlers
  const currentQuestionRef = useRef<any>(null);

  // Listen for new questions
  const handleNewQuestion = useCallback((data: any) => {
    logger.log('[Engagement] New question received:', data);
    if (data.questionId) {
      handledQuestionsRef.current.add(data.questionId);
    }
    currentQuestionRef.current = data;
    setCurrentQuestion(data);
    setShowPopup(true);
    setShowModal(false); // Reset modal if a new question arrives
  }, []);

  // Listen for question expiration
  const handleQuestionExpired = useCallback((data: any) => {
    logger.log('[Engagement] Question expired:', data);
    const activeQ = currentQuestionRef.current;
    
    if (activeQ?.questionId === data.questionId) {
      // If popup is showing, hide it
      setShowPopup(false);
      
      // IMPORTANT: We do NOT clear currentQuestion or currentQuestionRef 
      // if the modal is open, to allow the student to finish their submission.
      // The modal has its own timer and will handle its own closing.
      logger.log('[Engagement] Question ID matched expiration. Current modal state:', showModal);
    }
  }, [showModal]);

  // 1. Setup Socket Listeners (Run once on mount/connect)
  useEffect(() => {
    if (!profile || !classId) return;

    engagementSocket.connect(profile.id, 'student');
    
    // Use the latest handlers via standard registration
    engagementSocket.onNewQuestion(handleNewQuestion);
    engagementSocket.onQuestionExpired(handleQuestionExpired);

    engagementSocket.joinClass(classId, profile.id, profile.name);

    return () => {
      engagementSocket.off('question:new', handleNewQuestion);
      engagementSocket.off('question:expired', handleQuestionExpired);
    };
  }, [profile?.id, classId]); // Only reset if student ID or class changes

  // 2. Separate Proactive Catch-up (Run once when entering a class)
  const catchupFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile || !classId) return;
    
    // Prevent re-running catch-up for the same class in this mount
    if (catchupFiredRef.current === classId) return;
    catchupFiredRef.current = classId;

    const checkActiveQuestion = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        logger.log('[Engagement] Running catch-up check for class:', classId);
        const response = await engagementApi.getActiveSession(classId, token);
        const activeSession = response?.data;

        if (activeSession?.pop_questions?.length > 0) {
          const q = activeSession.pop_questions[0];
          
          if (handledQuestionsRef.current.has(q.id)) {
            logger.log('[Engagement] Question already handled, skipping:', q.id);
            return;
          }
          
          const now = new Date();
          const expiresAt = q.expires_at ? new Date(q.expires_at) : null;
          const remainingMs = expiresAt ? expiresAt.getTime() - now.getTime() : 10000;
          
          // INCREASED BUFFER: If less than 5 seconds remain, don't show as catch-up
          // This avoids the "expired" error just as it opens.
          if (remainingMs < 5000) {
            logger.log('[Engagement] Question too close to expiry to catch up:', remainingMs);
            handledQuestionsRef.current.add(q.id);
            return;
          }

          if (!currentQuestionRef.current) {
            logger.log('[Engagement] Caught up with active question:', q.id);
            handledQuestionsRef.current.add(q.id);
            const formattedQuestion = {
              questionId: q.id,
              questionText: q.question_text,
              options: {
                A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d,
              },
              timeLimit: q.time_limit_seconds,
              points: q.points,
              expiresAt: q.expires_at,
              sessionId: activeSession.id
            };
            handleNewQuestion(formattedQuestion);
          }
        }
      } catch (error) {
        logger.error('[Engagement] Catch-up check failed:', error);
      }
    };

    // Small delay to let socket connect first
    const timer = setTimeout(checkActiveQuestion, 1500);
    return () => clearTimeout(timer);
  }, [profile?.id, classId, handleNewQuestion]);

  const handleAnswerNow = () => {
    setShowPopup(false);
    setShowModal(true);
  };

  const handleDismiss = () => {
    if (currentQuestion?.questionId) {
      handledQuestionsRef.current.add(currentQuestion.questionId);
      logger.log('[Engagement] Question marked as handled (dismissed):', currentQuestion.questionId);
    }
    setShowPopup(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentQuestion(null);
    currentQuestionRef.current = null;
  };

  return (
    <>
      {showPopup && currentQuestion && (
        <StudentQuestionPopup
          questionId={currentQuestion.questionId}
          timeLimit={currentQuestion.timeLimit}
          points={currentQuestion.points}
          expiresAt={currentQuestion.expiresAt}
          onAnswerNow={handleAnswerNow}
          onDismiss={handleDismiss}
        />
      )}

      {showModal && currentQuestion && profile && (
        <StudentQuestionModal
          questionId={currentQuestion.questionId}
          questionText={currentQuestion.questionText}
          options={currentQuestion.options}
          timeLimit={currentQuestion.timeLimit}
          points={currentQuestion.points}
          expiresAt={currentQuestion.expiresAt}
          studentId={profile.id}
          studentName={profile.name}
          sessionId={currentQuestion.sessionId || ''}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};
