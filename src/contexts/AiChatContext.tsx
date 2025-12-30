import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useAuth } from "@/auth/AuthContext";

// Message type
interface Message {
  sender: "user" | "ai";
  content: any;
  image?: string | null;
  timestamp: Date;
}

// Separate state for teacher and student chats
interface ChatState {
  messages: Message[];
  activeMode: string;
  selectedImage: string | null;
  selectedSubject: string;
  selectedClassId: string;
  lastGradingData: any;
}

interface AiChatContextType {
  // State getters
  messages: Message[];
  activeMode: string;
  selectedImage: string | null;
  selectedSubject: string;
  selectedClassId: string;
  lastGradingData: any;
  
  // State setters
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setActiveMode: (mode: string) => void;
  setSelectedImage: (image: string | null) => void;
  setSelectedSubject: (subject: string) => void;
  setSelectedClassId: (classId: string) => void;
  setLastGradingData: (data: any) => void;
  
  // Utility methods
  addMessage: (message: Message) => void;
  clearChat: () => void;
}

const AiChatContext = createContext<AiChatContextType | null>(null);

const getInitialState = (): ChatState => ({
  messages: [],
  activeMode: "start",
  selectedImage: null,
  selectedSubject: "all",
  selectedClassId: "all",
  lastGradingData: null,
});

export const AiChatProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();
  
  // Separate state for teacher and student
  const [teacherState, setTeacherState] = useState<ChatState>(getInitialState());
  const [studentState, setStudentState] = useState<ChatState>(getInitialState());
  
  // Determine which state to use based on user role
  const isTeacher = profile?.role === "teacher";
  const currentState = isTeacher ? teacherState : studentState;
  const setCurrentState = isTeacher ? setTeacherState : setStudentState;
  
  // State setters
  const setMessages = useCallback((updater: React.SetStateAction<Message[]>) => {
    setCurrentState(prev => ({
      ...prev,
      messages: typeof updater === 'function' ? updater(prev.messages) : updater
    }));
  }, [setCurrentState]);
  
  const setActiveMode = useCallback((mode: string) => {
    setCurrentState(prev => ({ ...prev, activeMode: mode }));
  }, [setCurrentState]);
  
  const setSelectedImage = useCallback((image: string | null) => {
    setCurrentState(prev => ({ ...prev, selectedImage: image }));
  }, [setCurrentState]);
  
  const setSelectedSubject = useCallback((subject: string) => {
    setCurrentState(prev => ({ ...prev, selectedSubject: subject }));
  }, [setCurrentState]);
  
  const setSelectedClassId = useCallback((classId: string) => {
    setCurrentState(prev => ({ ...prev, selectedClassId: classId }));
  }, [setCurrentState]);
  
  const setLastGradingData = useCallback((data: any) => {
    setCurrentState(prev => ({ ...prev, lastGradingData: data }));
  }, [setCurrentState]);
  
  // Utility methods
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, [setMessages]);
  
  const clearChat = useCallback(() => {
    setCurrentState(getInitialState());
  }, [setCurrentState]);
  
  return (
    <AiChatContext.Provider
      value={{
        messages: currentState.messages,
        activeMode: currentState.activeMode,
        selectedImage: currentState.selectedImage,
        selectedSubject: currentState.selectedSubject,
        selectedClassId: currentState.selectedClassId,
        lastGradingData: currentState.lastGradingData,
        setMessages,
        setActiveMode,
        setSelectedImage,
        setSelectedSubject,
        setSelectedClassId,
        setLastGradingData,
        addMessage,
        clearChat,
      }}
    >
      {children}
    </AiChatContext.Provider>
  );
};

export const useAiChat = () => {
  const context = useContext(AiChatContext);
  if (!context) {
    throw new Error("useAiChat must be used within an AiChatProvider");
  }
  return context;
};
