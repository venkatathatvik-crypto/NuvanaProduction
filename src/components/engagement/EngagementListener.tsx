import React, { useEffect, useState, useRef, useCallback } from 'react';
import { engagementSocket } from '@/services/engagementSocket';
import { StudentQuestionPopup } from './StudentQuestionPopup';
import { StudentQuestionModal } from './StudentQuestionModal';
import { useAuth } from '@/auth/AuthContext';

interface EngagementListenerProps {
  classId: string;
}

export const EngagementListener: React.FC<EngagementListenerProps> = ({ classId }) => {
  const { profile } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  
  // Use a ref to always have the latest question data in event handlers
  const currentQuestionRef = useRef<any>(null);

  // Listen for new questions
  const handleNewQuestion = useCallback((data: any) => {
    console.log('[Engagement] New question received:', data);
    currentQuestionRef.current = data;
    setCurrentQuestion(data);
    setShowPopup(true);
    setShowModal(false); // Reset modal if a new question arrives
  }, []);

  // Listen for question expiration
  const handleQuestionExpired = useCallback((data: any) => {
    console.log('[Engagement] Question expired:', data);
    const activeQ = currentQuestionRef.current;
    
    if (activeQ?.questionId === data.questionId) {
      // If popup is showing, hide it
      setShowPopup(false);
      
      // IMPORTANT: We do NOT clear currentQuestion or currentQuestionRef 
      // if the modal is open, to allow the student to finish their submission.
      // The modal has its own timer and will handle its own closing.
      console.log('[Engagement] Question ID matched expiration. Current modal state:', showModal);
    }
  }, [showModal]);

  useEffect(() => {
    if (!profile || !classId) return;

    // 1. Connect and Setup listeners BEFORE joining
    engagementSocket.connect(profile.id, 'student');
    
    // Register event handlers
    engagementSocket.onNewQuestion(handleNewQuestion);
    engagementSocket.onQuestionExpired(handleQuestionExpired);

    // 2. Join class room (This triggers the catch-up logic on backend)
    engagementSocket.joinClass(
      classId,
      profile.id,
      profile.name
    );

    return () => {
      engagementSocket.off('question:new', handleNewQuestion);
      engagementSocket.off('question:expired', handleQuestionExpired);
    };
  }, [profile, classId, handleNewQuestion, handleQuestionExpired]);

  const handleAnswerNow = () => {
    setShowPopup(false);
    setShowModal(true);
  };

  const handleDismiss = () => {
    setShowPopup(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentQuestion(null);
    currentQuestionRef.current = null;
  };

  if (!currentQuestion) return null;

  return (
    <>
      {showPopup && (
        <StudentQuestionPopup
          questionId={currentQuestion.questionId}
          timeLimit={currentQuestion.timeLimit}
          points={currentQuestion.points}
          onAnswerNow={handleAnswerNow}
          onDismiss={handleDismiss}
        />
      )}

      {showModal && profile && (
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
