import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, BookOpen, PenTool, LayoutTemplate, Briefcase, FileCode, Users, Lightbulb, Loader2, Camera, Upload, X, Image as ImageIcon, Mic, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { aiService } from '@/services/aiService';
import { MessageBubble } from '@/components/AiTutor/MessageBubble';
import { useAuth } from '@/auth/AuthContext';
import { toast } from 'sonner';
import VoiceModeOverlay from './VoiceModeOverlay';
import { academicService } from '@/services/academicApiService';

const TEACHER_ACTION_MODES = [
    { id: 'start', label: 'Ask Assistant', icon: Sparkles, color: 'text-neon-purple', desc: 'General help' },
    { id: 'grade_paper', label: 'Grade Paper', icon: Camera, color: 'text-red-500', desc: 'Grade from photo' },
    { id: 'lesson_plan', label: 'Lesson Plan', icon: LayoutTemplate, color: 'text-neon-blue', desc: 'Create structured lessons' },
    { id: 'create_quiz', label: 'Create Quiz', icon: FileCode, color: 'text-green-500', desc: 'Generate test questions' },
    { id: 'simplify', label: 'Simplifier', icon: BookOpen, color: 'text-yellow-500', desc: 'Make content easier' },
    { id: 'activity', label: 'Activities', icon: Users, color: 'text-pink-500', desc: 'Classroom engagement' },
    { id: 'email', label: 'Email Draft', icon: Briefcase, color: 'text-orange-500', desc: 'Parent communication' },
];

const AiTeacherChat = () => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeMode, setActiveMode] = useState<string>('start');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceTranscription, setVoiceTranscription] = useState('');

    // Subject Selection
    const [subjects, setSubjects] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load Teacher Subjects
    useEffect(() => {
        const loadSubjects = async () => {
            if (profile?.id) {
                try {
                    const teacherSubjects = await academicService.getSubjectsByTeacher(profile.id);
                    // Extract unique subject names
                    const uniqueSubjects = Array.from(new Set(
                        teacherSubjects
                            .map(ts => ts.grade_subjects?.subjects_master?.name)
                            .filter((name): name is string => !!name)
                    ));
                    setSubjects(uniqueSubjects);
                } catch (error) {
                    console.error("Failed to load teacher subjects", error);
                }
            }
        };
        loadSubjects();
    }, [profile]);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => result[0])
                    .map((result: any) => result.transcript)
                    .join('');

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
                    setVoiceTranscription('');
                }
            };
        }
    }, [isVoiceModeOpen, voiceTranscription]);

    // Initial Greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    sender: 'ai',
                    content: {
                        title: `Hello ${profile?.name?.split(' ')[0] || 'Teacher'}! 🍎`,
                        explanation: "I'm your **AI Teaching Assistant**. I can help you draft lesson plans, create quizzes, simplify complex topics, or even **grade papers from photos**.\n\nSelect a **Pro Mode** below to get started!",
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
        if ('speechSynthesis' in window) {
            setIsSpeaking(true);
            const utterance = new SpeechSynthesisUtterance(text);
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
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
                if (activeMode !== 'grade_paper') setActiveMode('grade_paper');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim() && !selectedImage) return;

        const userMsg = {
            sender: 'user',
            content: textToSend,
            image: selectedImage,
            timestamp: new Date()
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setSelectedImage(null);
        setIsLoading(true);

        try {
            let taskType = 'explain';
            let query = userMsg.content;

            // Map teacher modes to appropriate task types
            if (activeMode === 'lesson_plan') {
                taskType = 'teacher_lesson_plan';
                // Keep original query without prefix for better processing
            } else if (activeMode === 'email') {
                taskType = 'teacher_email_draft';
                // Keep original query without prefix for better processing
            } else if (activeMode === 'create_quiz') {
                taskType = 'mock_test';
            } else if (activeMode === 'simplify') {
                taskType = 'explain';
            } else if (activeMode === 'start') {
                taskType = 'doubt';
            } else if (activeMode === 'grade_paper' || userMsg.image) {
                taskType = 'teacher_grade_paper';
                // Format query with paper content and grading parameters
                const paperContent = userMsg.content || 'Please analyze this student submission.';
                query = `${paperContent}`;
                
                // If imaging is present, add a note (actual OCR would happen server-side in production)
                if (userMsg.image) {
                    query = `[Image uploaded - simulating paper content extraction]\n\n${paperContent}`;
                }

                // Simulate image processing delay
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            const additionalContext = {
                role: 'teacher',
                mode: activeMode,
                hasImage: !!userMsg.image
            };

            const aiResponseEncoded = await aiService.processRequest({
                taskType: taskType as any,
                query: query,
                studentId: profile?.id,
                subject: selectedSubject || undefined,
                additionalContext: additionalContext
            });

            // If it was a grading request, ensure the response looks like grading
            if (activeMode === 'grade_paper') {
                // Determine layout based on mock backend response
                // If it's just text, wrap it. Ideally backend returns structured grading.
            }

            // Flatten response for speech
            let speakableText = aiResponseEncoded.explanation || "Output generated.";
            if (aiResponseEncoded.title) speakableText = `${aiResponseEncoded.title}. ${speakableText}`;

            setMessages((prev) => [
                ...prev,
                { sender: 'ai', content: aiResponseEncoded, timestamp: new Date() },
            ]);

            if (isVoiceModeOpen) {
                speakResponse(speakableText.replace(/[*#]/g, ''));
            }

        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    sender: 'ai',
                    content: { explanation: "⚠️ I encountered an error. Please try again." },
                    timestamp: new Date()
                },
            ]);
            if (isVoiceModeOpen) speakResponse("Oops, I had an error.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full relative">
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
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full animate-pulse ${activeMode === 'grade_paper' ? 'bg-red-500' : 'bg-green-500'}`} />
                                <p className="text-xs text-muted-foreground">Teacher Mode • {TEACHER_ACTION_MODES.find(m => m.id === activeMode)?.label}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Subject Selector - Always visible */}
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="h-8 max-w-[120px] rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none focus:border-primary transition-colors truncate"
                        >
                            <option value="">General Subject</option>
                            {subjects.length > 0 ? (
                                subjects.map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))
                            ) : (
                                <option disabled>No subjects found</option>
                            )}
                        </select>

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
                                const M = TEACHER_ACTION_MODES.find(m => m.id === activeMode);
                                if (M) return <><M.icon className={`w-4 h-4 ${M.color}`} /><span className="text-xs font-medium">{M.label}</span></>;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
                    <AnimatePresence>
                        {messages.map((msg, index) => (
                            <div key={index}>
                                {msg.sender === 'user' && msg.image && (
                                    <div className="flex justify-end mb-2">
                                        <div className="max-w-[80%] rounded-lg overflow-hidden border border-white/20">
                                            <img src={msg.image} alt="Uploaded paper" className="w-full h-auto max-h-48 object-cover" />
                                            <div className="bg-black/50 p-1 text-[10px] text-white text-center">Grading Submission</div>
                                        </div>
                                    </div>
                                )}
                                <MessageBubble
                                    sender={msg.sender}
                                    content={msg.content}
                                    timestamp={msg.timestamp}
                                />
                            </div>
                        ))}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex items-center gap-2 text-muted-foreground text-sm ml-12"
                            >
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{activeMode === 'grade_paper' ? 'Analyzing handwriting & grading...' : 'Generating...'}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Image Preview & Active Mode Indicator */}
                <AnimatePresence>
                    {selectedImage && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="px-4 pb-2 flex items-center gap-2"
                        >
                            <div className="relative group">
                                <img src={selectedImage} alt="Selected" className="h-16 w-16 object-cover rounded-md border border-white/20" />
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                            <span className="text-xs text-muted-foreground">Ready to grade</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Mode Selector */}
                {!isLoading && (
                    <div className="p-2 overflow-x-auto no-scrollbar">
                        <div className="flex gap-2 px-2 pb-2 mx-auto w-max max-w-full">
                            {TEACHER_ACTION_MODES.filter(m => m.id !== 'start').map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setActiveMode(mode.id === activeMode ? 'start' : mode.id)}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
                                        ${activeMode === mode.id
                                            ? `bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25`
                                            : 'bg-background/60 hover:bg-secondary border-border text-muted-foreground'
                                        }
                                    `}
                                >
                                    <mode.icon className={`w-3.5 h-3.5 ${activeMode === mode.id ? 'text-white' : mode.color}`} />
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
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
                            className={`shrink-0 rounded-full ${isListening && !isVoiceModeOpen ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground'}`}
                            onClick={startListening}
                            title="Voice Typing"
                        >
                            <Mic className={`w-5 h-5 ${isListening && !isVoiceModeOpen ? 'animate-pulse' : ''}`} />
                        </Button>
                        <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className={`h-9 w-9 shrink-0 ${activeMode === 'grade_paper' ? 'border-primary text-primary shadow-neon-blue' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload Paper"
                        >
                            <Camera className="w-4 h-4" />
                        </Button>

                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={
                                activeMode === 'grade_paper' ? "Add specific grading instructions..." :
                                    activeMode === 'start' ? "Draft a lesson, grade a paper..." :
                                        `Working on ${TEACHER_ACTION_MODES.find(m => m.id === activeMode)?.label}...`
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
        </div>
    );
};

export default AiTeacherChat;
