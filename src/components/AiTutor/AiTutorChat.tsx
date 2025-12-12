import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain, BookOpen, Calculator, HelpCircle, GraduationCap, Zap, MoreHorizontal, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { aiService, AiRequestDto } from '@/services/aiService';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '@/auth/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

const ACTION_MODES = [
    { id: 'start', label: 'Ask Anything', icon: Sparkles, color: 'text-neon-purple', desc: 'General queries' },
    { id: 'explain', label: 'Explain', icon: BookOpen, color: 'text-neon-blue', desc: 'Understand concepts' },
    { id: 'solve', label: 'Solve', icon: Calculator, color: 'text-green-500', desc: 'Step-by-step math' },
    { id: 'doubt', label: 'Doubt', icon: HelpCircle, color: 'text-yellow-500', desc: 'Clear confusion' },
    { id: 'study_plan', label: 'Study Plan', icon: TrendingUp, color: 'text-pink-500', desc: 'Get organized' },
    { id: 'life_skill', label: 'Life Coach', icon: Lightbulb, color: 'text-orange-500', desc: 'Motivation & tips' },
];

const AiTutorChat = () => {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeMode, setActiveMode] = useState<string>('start');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { sender: 'user', content: input, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Determine task type based on active mode
            // If mode is 'start' (default), we might infer intent, but for now map 'start' -> 'doubt' as generic fallback
            const taskType = (activeMode === 'start' ? 'doubt' : activeMode) as any;

            const aiResponseEncoded = await aiService.processRequest({
                taskType: taskType,
                query: userMsg.content,
                studentId: profile?.id,
                // subject: "Math", // We could infer this from current page context in a real app
                classBand: 'middle', // Could be dynamic from profile
            });

            setMessages((prev) => [
                ...prev,
                { sender: 'ai', content: aiResponseEncoded, timestamp: new Date() },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    sender: 'ai',
                    content: { explanation: "⚠️ Oops! I encountered an error connecting to my brain. Please try again." },
                    timestamp: new Date()
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flexflex-col h-[calc(100vh-100px)] max-h-[800px] gap-4">
            {/* 1. Chat Area */}
            <Card className="flex-1 glass-card overflow-hidden flex flex-col border-white/10 shadow-2xl relative">
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

                    {/* Mode Indicator (Desktop) */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                        {(() => {
                            const M = ACTION_MODES.find(m => m.id === activeMode);
                            if (M) return <><M.icon className={`w-4 h-4 ${M.color}`} /><span className="text-xs font-medium">{M.label} Mode</span></>;
                        })()}
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
