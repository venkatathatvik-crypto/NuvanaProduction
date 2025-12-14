import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Brain, X, MessageCircle, PenTool, Maximize2, Move } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import AiTutorChat from "./AiTutorChat";
import AiTeacherChat from "./AiTeacherChat";

const AiTutorWidget = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Constraint ref for dragging
    const constraintsRef = useRef(null);

    // Visibility Logic
    useEffect(() => {
        // Show for students AND teachers
        if (!profile || (profile.role !== "student" && profile.role !== "teacher")) {
            setIsVisible(false);
            return;
        }

        // Hide on Test Taking pages for students
        if (profile.role === "student" && pathname.includes("/student/tests/take")) {
            setIsVisible(false);
            setIsOpen(false);
            return;
        }

        // Hide on the full page view itself to avoid recursion/duplication
        if (pathname === '/ai-tutor') {
            setIsVisible(false);
            return;
        }

        setIsVisible(true);
    }, [pathname, profile]);

    if (!isVisible) return null;

    const isTeacher = profile?.role === "teacher";

    return (
        <div ref={constraintsRef} className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
            {/* Chat Window Popup */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        drag
                        dragMomentum={false}
                        dragConstraints={constraintsRef}
                        initial={{ opacity: 0, scale: 0.9, y: 0, x: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, x: 20 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="pointer-events-auto absolute bottom-24 right-6 w-full h-[80vh] sm:w-[400px] sm:h-[600px] sm:rounded-xl shadow-2xl overflow-hidden glass border border-white/10 bg-background/95 backdrop-blur-xl flex flex-col z-50"
                    >
                        {/* Drag Handle & Controls Header */}
                        <div className="flex items-center justify-between p-2 bg-secondary/30 border-b border-border/50 cursor-move"
                            onPointerDownCapture={(e) => { }} // Just identifying this as the drag area visually, framer handles drag on the whole div by default, but we might want controls.
                        >
                            <div className="flex items-center gap-2 text-muted-foreground px-2">
                                <Move className="w-4 h-4" />
                                <span className="text-xs font-medium">Drag me</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-primary/20 hover:text-primary rounded-full"
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate('/ai-tutor');
                                    }}
                                    title="Expand to Full Page"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive rounded-full"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Conditionally Render Chat Interface */}
                        <div className="flex-1 overflow-hidden">
                            {isTeacher ? <AiTeacherChat /> : <AiTutorChat />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="pointer-events-auto fixed bottom-6 right-6 z-50"
            >
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    size="lg"
                    className={`
                        h-14 w-14 rounded-full shadow-lg transition-all duration-300
                        ${isOpen
                            ? 'bg-secondary text-secondary-foreground rotate-90'
                            : 'bg-gradient-to-r from-neon-purple to-neon-blue text-white animate-pulse-slow hover:shadow-neon-blue/50'
                        }
                    `}
                >
                    {isOpen ? (
                        <X className="w-6 h-6" />
                    ) : (
                        isTeacher ? <PenTool className="w-7 h-7" /> : <Brain className="w-8 h-8" />
                    )}
                </Button>
            </motion.div>
        </div>
    );
};

export default AiTutorWidget;

