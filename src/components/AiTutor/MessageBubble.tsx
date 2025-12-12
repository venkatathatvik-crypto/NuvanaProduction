import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
    sender: 'user' | 'ai';
    content: any; // string or AiResponseDto
    timestamp: Date;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ sender, content, timestamp }) => {
    const isAi = sender === 'ai';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}
        >
            <div className={`flex max-w-[85%] sm:max-w-[75%] ${isAi ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAi ? 'bg-primary/20 text-neon-blue neon-glow' : 'bg-secondary text-secondary-foreground'
                    }`}>
                    {isAi ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>

                {/* Message Content */}
                <div className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}>
                    <div className={`p-4 rounded-2xl relative shadow-sm ${isAi
                            ? 'bg-card border border-border text-foreground rounded-tl-none'
                            : 'bg-primary text-primary-foreground rounded-tr-none'
                        }`}>
                        {isAi && typeof content === 'object' ? (
                            // Structured AI Response
                            <div className="space-y-3">
                                {content.title && <h3 className="text-lg font-bold text-neon-purple leading-tight">{content.title}</h3>}

                                {content.keyPoints?.length > 0 && (
                                    <ul className="list-disc pl-4 space-y-1 text-sm bg-muted/30 p-2 rounded-md border border-border/50">
                                        {content.keyPoints.map((pt: string, i: number) => (
                                            <li key={i}>{pt}</li>
                                        ))}
                                    </ul>
                                )}

                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown>{content.explanation}</ReactMarkdown>
                                </div>

                                {content.personalizedFeedback && (
                                    <div className="mt-3 pt-3 border-t border-dashed border-border text-sm italic text-muted-foreground flex gap-2">
                                        <Sparkles className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                        <span>{content.personalizedFeedback}</span>
                                    </div>
                                )}

                                {content.followUpQuestion && (
                                    <div className="mt-2 text-sm font-medium text-neon-blue bg-neon-blue/10 p-2 rounded">
                                        🤔 {content.followUpQuestion}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Simple Text (User or raw)
                            <p className="whitespace-pre-wrap text-sm sm:text-base">{content}</p>
                        )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};
