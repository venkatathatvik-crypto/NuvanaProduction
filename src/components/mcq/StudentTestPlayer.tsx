import { useState, useEffect, useCallback, useRef } from "react";
import { StudentTestWithQuestions, StudentTestQuestion } from "@/services/academic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { logger } from '@/lib/logger';

interface StudentTestPlayerProps {
    test: StudentTestWithQuestions;
    onComplete: (answers: Record<string, number | string>, timeTakenSeconds: number) => void;
    isSubmitting?: boolean;
}

export const StudentTestPlayer = ({ test, onComplete, isSubmitting = false }: StudentTestPlayerProps) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number | string>>({});
    const [timeLeft, setTimeLeft] = useState(test.durationMinutes * 60);

    const currentQuestion = test.questions[currentQuestionIndex];
    const isMCQ = currentQuestion.questionType === "MCQ";

    const isSubmittedRef = useRef(false);

    const handleSubmit = useCallback(() => {
        isSubmittedRef.current = true;
        const timeTakenSeconds = (test.durationMinutes * 60) - timeLeft;
        logger.log('[StudentTestPlayer] Submitting with answers:', answers);
        logger.log('[StudentTestPlayer] Answers object keys:', Object.keys(answers));
        logger.log('[StudentTestPlayer] Answers entries:', Object.entries(answers));
        onComplete(answers, timeTakenSeconds);
    }, [answers, onComplete, test.durationMinutes, timeLeft]);

    const [showLeaveWarning, setShowLeaveWarning] = useState(false);

    // Lock page — prevent back button/swipe-back during active test
    useEffect(() => {
        const url = window.location.href;

        // Flood the history stack so rapid back presses can't escape
        for (let i = 0; i < 50; i++) {
            window.history.pushState({ testLock: true }, "", url);
        }

        const handlePopState = () => {
            if (!isSubmittedRef.current) {
                // Re-flood on every back press to stay trapped
                for (let i = 0; i < 10; i++) {
                    window.history.pushState({ testLock: true }, "", url);
                }
                setShowLeaveWarning(true);
            }
        };

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [handleSubmit]);

    const handleOptionSelect = (value: string) => {
        const optionIndex = parseInt(value, 10);
        logger.log('[StudentTestPlayer] Option selected:', {
            questionId: currentQuestion.id,
            value,
            parsedIndex: optionIndex,
            isNaN: isNaN(optionIndex),
        });
        setAnswers(prev => {
            const newAnswers = {
                ...prev,
                [currentQuestion.id]: optionIndex
            };
            logger.log('[StudentTestPlayer] Updated answers:', newAnswers);
            return newAnswers;
        });
    };

    const handleTextAnswerChange = (value: string) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: value
        }));
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progress = ((Object.keys(answers).length) / test.questions.length) * 100;

    const getQuestionTypeBadge = (type: string) => {
        switch (type) {
            case "MCQ":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">MCQ</Badge>;
            case "Essay":
                return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">Essay</Badge>;
            case "Short Answer":
                return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Short Answer</Badge>;
            case "Very Short Answer":
                return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">Very Short</Badge>;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card p-4 rounded-lg border shadow-sm sticky top-4 z-10">
                <div>
                    <h2 className="font-bold text-lg">{test.title}</h2>
                    <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {test.questions.length}</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                            <Clock className="w-5 h-5" />
                            {formatTime(timeLeft)}
                        </div>
                        <span className="text-xs text-muted-foreground">Time Remaining</span>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                                variant={Object.keys(answers).length === test.questions.length ? "default" : "secondary"}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Submitting..." : "Submit Test"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Submit Test?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You have answered {Object.keys(answers).length} out of {test.questions.length} questions.
                                    Once submitted, you cannot change your answers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? "Submitting..." : "Submit"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <Progress value={progress} className="h-2" />

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    <Card className="glass-card min-h-[400px] flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">Question {currentQuestionIndex + 1}</span>
                                    {getQuestionTypeBadge(currentQuestion.questionType)}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">{currentQuestion.marks} Marks</span>
                            </div>
                            <CardTitle className="text-xl leading-relaxed pt-2">
                                {currentQuestion.text}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            {isMCQ ? (
                                <RadioGroup
                                    value={answers[currentQuestion.id]?.toString()}
                                    onValueChange={handleOptionSelect}
                                    className="space-y-4"
                                >
                                    {currentQuestion.options.map((option, index) => (
                                        <div key={index} className={`flex items-center space-x-2 border rounded-lg p-4 transition-colors ${answers[currentQuestion.id] === index ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                                            <RadioGroupItem value={index.toString()} id={`opt-${index}`} />
                                            <Label htmlFor={`opt-${index}`} className="flex-1 cursor-pointer text-base">
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        {currentQuestion.questionType === "Essay" 
                                            ? "Write a detailed answer (minimum 100 words recommended)"
                                            : currentQuestion.questionType === "Short Answer"
                                            ? "Write a brief answer (2-3 sentences)"
                                            : "Write a very short answer (1-2 words or a phrase)"}
                                    </p>
                                    <Textarea
                                        placeholder="Type your answer here..."
                                        value={(answers[currentQuestion.id] as string) || ""}
                                        onChange={(e) => handleTextAnswerChange(e.target.value)}
                                        className={`min-h-[200px] ${currentQuestion.questionType === "Very Short Answer" ? "min-h-[80px]" : currentQuestion.questionType === "Short Answer" ? "min-h-[120px]" : "min-h-[250px]"}`}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex justify-between items-center">
                <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                </Button>

                <div className="flex gap-2 overflow-x-auto max-w-[200px] md:max-w-md px-2">
                    {test.questions.map((q, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentQuestionIndex(idx)}
                            className={`w-8 h-8 rounded-full text-xs font-medium shrink-0 transition-colors ${currentQuestionIndex === idx
                                    ? 'bg-primary text-primary-foreground'
                                    : answers[q.id] !== undefined
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>

                <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
                    disabled={currentQuestionIndex === test.questions.length - 1}
                >
                    Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            </div>

            {/* Back button warning dialog */}
            <AlertDialog open={showLeaveWarning} onOpenChange={setShowLeaveWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Test in Progress</AlertDialogTitle>
                        <AlertDialogDescription>
                            You cannot leave while the test is active. Please complete and submit your test before navigating away.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setShowLeaveWarning(false)}>
                            Continue Test
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
