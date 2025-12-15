import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, BookOpen, Calculator, HelpCircle, GraduationCap, Zap, MoreHorizontal, Lightbulb, TrendingUp, Loader2, Mic, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { aiService, AiRequestDto } from '@/services/aiService';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '@/auth/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import VoiceModeOverlay from './VoiceModeOverlay';
import { toast } from 'sonner';
import { getStudentData, type StudentData } from '@/services/studentDataService';

const ACTION_MODES = [
    { id: 'start', label: 'Ask Anything', icon: Sparkles, color: 'text-neon-purple', desc: 'General queries' },
    { id: 'explain', label: 'Explain', icon: BookOpen, color: 'text-neon-blue', desc: 'Understand concepts' },
    { id: 'solve', label: 'Solve', icon: Calculator, color: 'text-green-500', desc: 'Step-by-step math' },
    { id: 'doubt', label: 'Doubt', icon: HelpCircle, color: 'text-yellow-500', desc: 'Clear confusion' },
    { id: 'study_plan', label: 'Study Plan', icon: TrendingUp, color: 'text-indigo-500', desc: 'Get organized' },
    { id: 'life_skill', label: 'Life Coach', icon: Lightbulb, color: 'text-orange-500', desc: 'Motivation & tips' },
];

const AiTutorChat = () => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeMode, setActiveMode] = useState<string>('start');
    const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceTranscription, setVoiceTranscription] = useState('');
    const [studentData, setStudentData] = useState<StudentData | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string>('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    // Load student data on mount
    useEffect(() => {
        const loadStudentData = async () => {
            if (profile?.id && profile?.role === 'student') {
                console.log('[AiTutorChat] Loading student data...');
                try {
                    const data = await getStudentData(profile.id);
                    setStudentData(data);
                    console.log('[AiTutorChat] Student data loaded:', data);
                } catch (error) {
                    console.error('[AiTutorChat] Failed to load student data:', error);
                }
            }
        };
        loadStudentData();
    }, [profile]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
                    // Auto-send in voice mode
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
                        title: `Hi ${profile?.name?.split(' ')[0] || 'Scholar'}! 🎓`,
                        explanation: "I'm your **Nuvana AI Tutor**. I can explain concepts, solve problems, or even build a study plan for you.\n\nType your question directly or pick a **Super Mode** below for specialized help!",
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
            // Select a good voice if available
            const voices = window.speechSynthesis.getVoices();
            // Try to find a natural sounding English voice
            const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
            if (preferredVoice) utterance.voice = preferredVoice;

            utterance.rate = 1;
            utterance.pitch = 1;

            utterance.onend = () => {
                setIsSpeaking(false);
                if (isVoiceModeOpen) {
                    // Auto-listen after speaking in voice mode
                    setTimeout(startListening, 500);
                }
            };

            window.speechSynthesis.speak(utterance);
        }
    };

    /**
     * Infer class band from class name (e.g., "Class 8B" -> "middle")
     */
    const inferClassBand = (className?: string): string => {
        if (!className) return 'middle';
        const lower = className.toLowerCase();
        if (lower.includes('1') || lower.includes('2') || lower.includes('3') || 
            lower.includes('4') || lower.includes('5') || lower.includes('kg') || lower.includes('nursery')) {
            return 'primary';
        } else if (lower.includes('6') || lower.includes('7') || lower.includes('8')) {
            return 'middle';
        } else if (lower.includes('9') || lower.includes('10') || lower.includes('11') || lower.includes('12')) {
            return 'high';
        }
        return 'middle';
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        console.log('[AiTutorChat] ========================================');
        console.log('[AiTutorChat] 📤 User sending message');
        console.log('[AiTutorChat] Message:', textToSend);
        console.log('[AiTutorChat] Active Mode:', activeMode);
        console.log('[AiTutorChat] Student Data:', studentData);
        console.log('[AiTutorChat] Selected Subject:', selectedSubject);

        const userMsg = { sender: 'user', content: textToSend, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Determine task type based on active mode
            const taskType = (activeMode === 'start' ? 'doubt' : activeMode) as any;

            // Infer class band from student's class name
            const classBand = studentData?.class_name 
                ? inferClassBand(studentData.class_name)
                : 'middle';

            console.log('[AiTutorChat] Inferred class band:', classBand);

            // Build AI request
            const aiRequest: AiRequestDto = {
                taskType: taskType,
                query: userMsg.content,
                studentId: profile?.id,
                subject: selectedSubject || undefined, // Use selected subject if available
                classBand: classBand,
            };

            console.log('[AiTutorChat] AI Request:', JSON.stringify(aiRequest, null, 2));

            const aiResponseEncoded = await aiService.processRequest(aiRequest);

            // Flatten response for speech
            let speakableText = aiResponseEncoded.explanation || "I found some information for you.";
            if (aiResponseEncoded.title) speakableText = `${aiResponseEncoded.title}. ${speakableText}`;

            setMessages((prev) => [
                ...prev,
                { sender: 'ai', content: aiResponseEncoded, timestamp: new Date() },
            ]);

            // Speak if in voice mode
            if (isVoiceModeOpen) {
                speakResponse(speakableText.replace(/[*#]/g, '')); // Clean markdown for speech
            }

        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    sender: 'ai',
                    content: { explanation: "⚠️ Oops! I encountered an error connecting to my brain. Please try again." },
                    timestamp: new Date()
                },
            ]);
            if (isVoiceModeOpen) speakResponse("Oops, I had an error. Please try again.");
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

            {/* 1. Chat Area */}
            <Card className="flex-1 glass-card overflow-hidden flex flex-col border-white/10 shadow-2xl relative h-full rounded-none">
                {/* Header */}
                <div className="p-4 border-b border-border/50 bg-background/50 backdrop-blur-md flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-neon-blue">
                            <Brain className="w-6 h-6 text-neon-blue animate-pulse" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Nuvana AI</h2>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <p className="text-xs text-muted-foreground">Online • {ACTION_MODES.find(m => m.id === activeMode)?.label || 'Ready'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
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

                        {/* Mode Indicator (Desktop) */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                            {(() => {
                                const M = ACTION_MODES.find(m => m.id === activeMode);
                                if (M) return <><M.icon className={`w-4 h-4 ${M.color}`} /><span className="text-xs font-medium">{M.label} Mode</span></>;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
                    <AnimatePresence>
                        {messages.map((msg, index) => (
                            <MessageBubble
                                key={index}
                                sender={msg.sender}
                                content={msg.content}
                                timestamp={msg.timestamp}
                            />
                        ))}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex items-center gap-2 text-muted-foreground text-sm ml-12"
                            >
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Thinking...</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Floating Mode Selector (Inside Chat for better UX) */}
                {!isLoading && (
                    <div className="p-2 overflow-x-auto">
                        <div className="flex gap-2 px-2 pb-2 mx-auto w-max max-w-full">
                            {ACTION_MODES.filter(m => m.id !== 'start').map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setActiveMode(mode.id === activeMode ? 'start' : mode.id)}
                                    className={`
                     flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
                     ${activeMode === mode.id
                                            ? `bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25` // Active
                                            : 'bg-background/60 hover:bg-secondary border-border text-muted-foreground' // Inactive
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

                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={activeMode === 'start' ? "Ask something..." : `Asking in ${ACTION_MODES.find(m => m.id === activeMode)?.label} mode...`}
                            className="pr-12 py-6 bg-secondary/30 border-primary/20 focus-visible:ring-neon-purple/50 rounded-xl"
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !input.trim()}
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

export default AiTutorChat;
