import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Brain,
  BookOpen,
  PenTool,
  LayoutTemplate,
  Briefcase,
  FileCode,
  Users,
  Lightbulb,
  Loader2,
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  Mic,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aiService } from "@/services/aiService";
import { MessageBubble } from "@/components/AiTutor/MessageBubble";
import { useAuth } from "@/auth/AuthContext";
import { useAiChat } from "@/contexts/AiChatContext";
import { toast } from "sonner";
import VoiceModeOverlay from "./VoiceModeOverlay";
import { academicService } from "@/services/academicApiService";
import { GradingApprovalModal } from "./GradingApprovalModal";
import { schoolService } from "@/services/schoolService";
import { exportQuizPDF } from "@/lib/quizPdfExport";

const TEACHER_ACTION_MODES = [
  {
    id: "start",
    label: "Ask Assistant",
    icon: Sparkles,
    color: "text-neon-purple",
    desc: "General help",
  },
  {
    id: "grade_paper",
    label: "Grade Paper",
    icon: Camera,
    color: "text-red-500",
    desc: "Grade from photo",
  },
  {
    id: "lesson_plan",
    label: "Lesson Plan",
    icon: LayoutTemplate,
    color: "text-neon-blue",
    desc: "Create structured lessons",
  },
  {
    id: "create_quiz",
    label: "Create Quiz",
    icon: FileCode,
    color: "text-green-500",
    desc: "Generate test questions",
  },
  {
    id: "simplify",
    label: "Simplifier",
    icon: BookOpen,
    color: "text-yellow-500",
    desc: "Make content easier",
  },
  {
    id: "activity",
    label: "Activities",
    icon: Users,
    color: "text-pink-500",
    desc: "Classroom engagement",
  },
  {
    id: "email",
    label: "Email Draft",
    icon: Briefcase,
    color: "text-orange-500",
    desc: "Parent communication",
  },
];

const AiTeacherChat = () => {
  const { profile } = useAuth();
  
  // Use context for persistent state
  const {
    messages,
    setMessages,
    activeMode,
    setActiveMode,
    selectedImage,
    setSelectedImage,
    selectedSubject,
    setSelectedSubject,
    selectedClassId,
    setSelectedClassId,
    lastGradingData,
    setLastGradingData,
  } = useAiChat();
  
  // Local state for UI-only concerns (not persisted)
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceTranscription, setVoiceTranscription] = useState("");
  const [viewImageModal, setViewImageModal] = useState<string | null>(null);
  const [gradingApprovalOpen, setGradingApprovalOpen] = useState(false);

  // Teacher context data (not persisted in chat context)
  const [allSubjectsData, setAllSubjectsData] = useState<any[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  // Derived subjects list based on selected class
  const subjects = useMemo(() => {
    if (selectedClassId === "all") {
      return Array.from(
        new Set(
          allSubjectsData
            .map((ts) => ts.grade_subjects?.subjects_master?.name)
            .filter((name): name is string => !!name)
        )
      );
    }

    // Find the grade_id for the selected class
    const selectedClass = teacherClasses.find(
      (c) => c.class_id === selectedClassId
    );
    if (!selectedClass) return [];

    const gradeId = selectedClass.grade_id;

    // Filter subjects that belong to this grade level
    return Array.from(
      new Set(
        allSubjectsData
          .filter((ts) => ts.grade_subjects?.grade_level_id === gradeId)
          .map((ts) => ts.grade_subjects?.subjects_master?.name)
          .filter((name): name is string => !!name)
      )
    );
  }, [allSubjectsData, selectedClassId, teacherClasses]);

  // Reset subject if it's no longer available for the selected class
  useEffect(() => {
    if (selectedSubject !== "all" && !subjects.includes(selectedSubject)) {
      setSelectedSubject("all");
    }
  }, [selectedClassId, subjects, selectedSubject, setSelectedSubject]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Teacher Context (Subjects & Classes)
  useEffect(() => {
    const loadTeacherContext = async () => {
      if (profile?.id) {
        setIsContextLoading(true);
        try {
          // 1. Load Subjects
          const subjectsData = await academicService.getSubjectsByTeacher(
            profile.id
          );
          setAllSubjectsData(subjectsData);

          // 2. Load ALL teaching classes (both assigned and subject-based)
          const { getAllTeachingClasses } = await import("@/services/academic");
          const classesData = await getAllTeachingClasses(
            profile.id,
            profile.school_id
          );
          setTeacherClasses(classesData);

          // Auto-select first class if available (only if not already set)
          if (classesData.length > 0 && selectedClassId === "all") {
            setSelectedClassId(classesData[0].class_id);
          }

          // 3. Load School Info for PDF export
          if (profile.school_id) {
            const schoolData = await schoolService.getSchool(profile.school_id);
            setSchoolInfo(schoolData);
          }
        } catch (error) {
          console.error("Failed to load teacher context", error);
        } finally {
          setIsContextLoading(false);
        }
      }
    };
    loadTeacherContext();
  }, [profile, selectedClassId, setSelectedClassId]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");

        if (isVoiceModeOpen) {
          setVoiceTranscription(transcript);
        } else {
          setInput(transcript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (isVoiceModeOpen && voiceTranscription) {
          handleSend(voiceTranscription);
          setVoiceTranscription("");
        }
      };
    }
  }, [isVoiceModeOpen, voiceTranscription]);

  // Initial Greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          sender: "ai",
          content: {
            title: `Hello ${profile?.name?.split(" ")[0] || "Teacher"}! 🍎`,
            explanation:
              "I'm your **AI Teaching Assistant by Nuvana**. I can help you draft lesson plans, create quizzes, simplify complex topics, or even **grade papers from photos**.\n\nSelect a **Pro Mode** below to get started!",
            keyPoints: [],
          },
          timestamp: new Date(),
        },
      ]);
    }
  }, [profile]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Speech recognition error:", error);
      }
    } else {
      toast.error("Speech recognition not supported in this browser.");
    }
  };

  const speakResponse = (text: string) => {
    if ("speechSynthesis" in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.name.includes("Google US English") || v.name.includes("Samantha")
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onend = () => {
        setIsSpeaking(false);
        if (isVoiceModeOpen) {
          setTimeout(startListening, 500);
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        // Switch to grade mode if not already
        if (activeMode !== "grade_paper") setActiveMode("grade_paper");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() && !selectedImage) return;

    const userMsg = {
      sender: "user",
      content: textToSend,
      image: selectedImage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      let taskType = "explain";
      let query = userMsg.content;

      // Map teacher modes to appropriate task types
      if (activeMode === "lesson_plan") {
        taskType = "teacher_lesson_plan";
        // Keep original query without prefix for better processing
      } else if (activeMode === "email") {
        taskType = "teacher_email_draft";
        // Keep original query without prefix for better processing
      } else if (activeMode === "create_quiz") {
        taskType = "mock_test";
      } else if (activeMode === "simplify") {
        taskType = "explain";
      } else if (activeMode === "start") {
        taskType = "doubt";
      } else if (activeMode === "grade_paper" || userMsg.image) {
        taskType = "teacher_grade_paper";

        // Provide better default content for grading
        let paperContent = userMsg.content;

        // If only image without text, provide sample content
        if (
          userMsg.image &&
          (!paperContent || paperContent.trim().length < 10)
        ) {
          paperContent = `Student has submitted a handwritten paper. 
                    
Please grade this submission based on:
- Content understanding and accuracy
- Completeness of answer
- Clarity of explanation
- Overall presentation

Provide detailed feedback with marks breakdown. Since this is an image submission, assume it contains the student's written work on the assigned topic.`;
        }

        query =
          paperContent ||
          "Please grade this student submission with detailed feedback.";

        // Simulate OCR processing delay for image
        if (userMsg.image) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }

      const additionalContext = {
        role: "teacher",
        mode: activeMode,
        hasImage: !!userMsg.image,
      };

      const aiResponseEncoded = await aiService.processRequest({
        taskType: taskType as any,
        query: query,
        studentId: profile?.id,
        classId:
          selectedClassId && selectedClassId !== "all"
            ? selectedClassId
            : undefined,
        subject:
          selectedSubject && selectedSubject !== "all"
            ? selectedSubject
            : undefined,
        additionalContext: additionalContext,
      });

      // If it was a grading request, ensure the response looks like grading
      if (activeMode === "grade_paper") {
        // Determine layout based on mock backend response
        // If it's just text, wrap it. Ideally backend returns structured grading.
      }

      // Flatten response for speech
      let speakableText = aiResponseEncoded.explanation || "Output generated.";
      if (aiResponseEncoded.title)
        speakableText = `${aiResponseEncoded.title}. ${speakableText}`;

      // Parse marks from grading response if it's a grading task
      if (activeMode === "grade_paper") {
        const marksMatch = aiResponseEncoded.explanation?.match(
          /\*\*Marks Awarded:\*\*\s*(\d+)\/(\d+)/
        );
        if (marksMatch) {
          setLastGradingData({
            marksObtained: parseInt(marksMatch[1]),
            totalMarks: parseInt(marksMatch[2]),
            aiFeedback: aiResponseEncoded.explanation || "",
          });
        }
      }

      setMessages((prev) => [
        ...prev,
        { sender: "ai", content: aiResponseEncoded, timestamp: new Date() },
      ]);

      if (isVoiceModeOpen) {
        speakResponse(speakableText.replace(/[*#]/g, ""));
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          content: {
            explanation: "⚠️ I encountered an error. Please try again.",
          },
          timestamp: new Date(),
        },
      ]);
      if (isVoiceModeOpen) speakResponse("Oops, I had an error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportQuizPDF = async (quizMessage: any) => {
    try {
      toast.info("Generating quiz PDF...");
      
      // Get class name
      const selectedClass = teacherClasses.find(c => c.class_id === selectedClassId);
      const classDisplayName = selectedClass?.class_name || className || "All Classes";
      
      // Get subject display name
      const subjectDisplayName = selectedSubject !== "all" ? selectedSubject : "General";
      
      await exportQuizPDF({
        quizContent: quizMessage.content,
        schoolLogo: schoolInfo?.logo_url,
        schoolName: schoolInfo?.name || "School Name",
        subject: subjectDisplayName,
        className: classDisplayName,
        teacherName: profile?.name || "Teacher",
        filename: `Quiz_${subjectDisplayName}_${classDisplayName}_${new Date().toISOString().split('T')[0]}.pdf`,
      });
      
      toast.success("Quiz PDF generated successfully!");
    } catch (error) {
      console.error("Error generating quiz PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      <VoiceModeOverlay
        isOpen={isVoiceModeOpen}
        onClose={() => {
          setIsVoiceModeOpen(false);
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
          setIsListening(false);
          if (recognitionRef.current) recognitionRef.current.stop();
        }}
        isListening={isListening}
        isSpeaking={isSpeaking}
        transcription={voiceTranscription}
      />

      {/* Chat Area */}
      <Card className="flex-1 glass-card overflow-hidden flex flex-col border-white/10 shadow-2xl relative h-full rounded-none">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center shadow-neon-purple">
              <PenTool className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Drona</h2>
              <p className="text-xs text-muted-foreground">by Nuvana</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Class Selector */}
            <Select
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              disabled={isContextLoading}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                {isContextLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                ) : null}
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {teacherClasses.map((tc) => (
                  <SelectItem key={tc.class_id} value={tc.class_id}>
                    {tc.class_name || "Class"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject Selector */}
            <Select
              value={selectedSubject}
              onValueChange={setSelectedSubject}
              disabled={isContextLoading}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                {isContextLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                ) : null}
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.length > 0 ? (
                  subjects.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No subjects
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Voice Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
              onClick={() => {
                setIsVoiceModeOpen(true);
                startListening();
              }}
              title="Start Voice Conversation"
            >
              <Headphones className="w-5 h-5" />
            </Button>

            {/* Desktop Mode Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
              {(() => {
                const M = TEACHER_ACTION_MODES.find((m) => m.id === activeMode);
                if (M)
                  return (
                    <>
                      <M.icon className={`w-4 h-4 ${M.color}`} />
                      <span className="text-xs font-medium">{M.label}</span>
                    </>
                  );
              })()}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <div key={index}>
                {msg.sender === "user" && msg.image && (
                  <div className="flex justify-end mb-2">
                    <div
                      className="max-w-[80%] rounded-lg overflow-hidden border border-white/20 cursor-pointer hover:border-primary/50 transition-colors group"
                      onClick={() => setViewImageModal(msg.image)}
                    >
                      <img
                        src={msg.image}
                        alt="Uploaded paper"
                        className="w-full h-auto max-h-48 object-cover"
                      />
                      <div className="bg-black/50 p-1 text-[10px] text-white text-center group-hover:bg-primary/70 transition-colors">
                        Click to view full image
                      </div>
                    </div>
                  </div>
                )}
                <MessageBubble
                  sender={msg.sender}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />
                {/* Show Save to Marks button after grading response */}
                {msg.sender === "ai" &&
                  index === messages.length - 1 &&
                  activeMode === "grade_paper" &&
                  lastGradingData && (
                    <div className="flex justify-start ml-12 mt-2">
                      <Button
                        onClick={() => setGradingApprovalOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Save to Marks
                      </Button>
                    </div>
                  )}
                {/* Show Save as PDF button after quiz generation */}
                {msg.sender === "ai" &&
                  index === messages.length - 1 &&
                  activeMode === "create_quiz" &&
                  msg.content?.explanation && ( // Only show if there's actual quiz content
                    <div className="flex justify-start ml-12 mt-2">
                      <Button
                        onClick={() => handleExportQuizPDF(msg)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <FileCode className="w-4 h-4 mr-2" />
                        Save as PDF
                      </Button>
                    </div>
                  )}
              </div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-muted-foreground text-sm ml-12"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {activeMode === "grade_paper"
                    ? "Analyzing handwriting & grading..."
                    : "Generating..."}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview & Active Mode Indicator */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 pb-2 flex items-center gap-2"
            >
              <div className="relative group">
                <img
                  src={selectedImage}
                  alt="Selected"
                  className="h-16 w-16 object-cover rounded-md border border-white/20"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                Ready to grade
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Mode Selector */}
        {!isLoading && (
          <div className="p-2 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 px-2 pb-2 mx-auto w-max max-w-full">
              {TEACHER_ACTION_MODES.filter((m) => m.id !== "start").map(
                (mode) => (
                  <button
                    key={mode.id}
                    onClick={() =>
                      setActiveMode(mode.id === activeMode ? "start" : mode.id)
                    }
                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
                                        ${
                                          activeMode === mode.id
                                            ? `bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25`
                                            : "bg-background/60 hover:bg-secondary border-border text-muted-foreground"
                                        }
                                    `}
                  >
                    <mode.icon
                      className={`w-3.5 h-3.5 ${
                        activeMode === mode.id ? "text-white" : mode.color
                      }`}
                    />
                    {mode.label}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 relative group"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={`shrink-0 rounded-full ${
                isListening && !isVoiceModeOpen
                  ? "text-red-500 bg-red-500/10"
                  : "text-muted-foreground"
              }`}
              onClick={startListening}
              title="Voice Typing"
            >
              <Mic
                className={`w-5 h-5 ${
                  isListening && !isVoiceModeOpen ? "animate-pulse" : ""
                }`}
              />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className={`h-9 w-9 shrink-0 ${
                activeMode === "grade_paper"
                  ? "border-primary text-primary shadow-neon-blue"
                  : ""
              }`}
              onClick={() => fileInputRef.current?.click()}
              title="Upload Paper"
            >
              <Camera className="w-4 h-4" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                activeMode === "grade_paper"
                  ? "Add specific grading instructions..."
                  : activeMode === "start"
                  ? "Draft a lesson, grade a paper..."
                  : `Working on ${
                      TEACHER_ACTION_MODES.find((m) => m.id === activeMode)
                        ?.label
                    }...`
              }
              className="pr-12 py-6 bg-secondary/30 border-primary/20 focus-visible:ring-indigo-500/50 rounded-xl"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="absolute right-1.5 top-1.5 h-9 w-9 bg-primary hover:bg-primary/90 rounded-lg transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-muted-foreground">
              AI can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </Card>

      {/* Full Image Preview Modal */}
      {viewImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setViewImageModal(null)}
              className="absolute -top-12 right-0 text-white hover:text-primary transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={viewImageModal}
              alt="Full size preview"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
              <p className="text-white text-sm text-center">
                Click outside to close
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grading Approval Modal */}
      {gradingApprovalOpen && lastGradingData && profile && (
        <GradingApprovalModal
          isOpen={gradingApprovalOpen}
          onClose={() => setGradingApprovalOpen(false)}
          gradingData={lastGradingData}
          teacherId={profile.id}
          schoolId={profile.school_id || ""}
          selectedClassId={selectedClassId}
          selectedSubject={selectedSubject}
        />
      )}
    </div>
  );
};

export default AiTeacherChat;
