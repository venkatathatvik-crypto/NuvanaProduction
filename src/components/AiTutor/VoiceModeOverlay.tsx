import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceModeOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    isListening: boolean;
    isSpeaking: boolean;
    transcription: string;
}

const VoiceModeOverlay: React.FC<VoiceModeOverlayProps> = ({ isOpen, onClose, isListening, isSpeaking, transcription }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 hover:bg-destructive/20 hover:text-destructive rounded-full"
                onClick={onClose}
            >
                <X className="w-6 h-6" />
            </Button>

            <div className="flex-1 flex flex-col items-center justify-center space-y-12">
                <div className="relative">
                    {/* Visualizer Orb */}
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500
                        ${isListening ? 'bg-primary/20 scale-110 shadow-[0_0_50px_rgba(var(--primary),0.3)]' :
                            isSpeaking ? 'bg-neon-purple/20 scale-125 shadow-[0_0_80px_rgba(var(--neon-purple),0.3)]' :
                                'bg-secondary/30 scale-100'}
                    `}>
                        {isSpeaking ? (
                            <div className="flex items-center gap-2 h-16">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="w-3 bg-neon-purple rounded-full"
                                        animate={{ height: [20, 60, 20] }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 0.8,
                                            delay: i * 0.1,
                                            ease: "easeInOut"
                                        }}
                                    />
                                ))}
                            </div>
                        ) : isListening ? (
                            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
                        ) : (
                            <div className="w-4 h-4 rounded-full bg-muted-foreground animate-pulse" />
                        )}
                    </div>
                </div>

                <div className="space-y-4 max-w-sm">
                    <h2 className="text-2xl font-semibold">
                        {isSpeaking ? 'Nuvana is speaking...' : isListening ? 'Listening...' : 'Tap to speak'}
                    </h2>
                    <p className="text-muted-foreground min-h-[3rem]">
                        {transcription || "Start speaking..."}
                    </p>
                </div>
            </div>

            <div className="pb-8">
                {/* Provide manual controls if needed, but usually immersive mode is auto */}
                <div className="text-xs text-muted-foreground">Voice Mode Active</div>
            </div>
        </div>
    );
};

export default VoiceModeOverlay;
