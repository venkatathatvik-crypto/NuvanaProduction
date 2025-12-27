import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { feedbackService } from '@/services/feedbackService';

export const StudentFeedbackForm = () => {
    const [questions, setQuestions] = useState<string[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);

    useEffect(() => {
        const qs = feedbackService.getQuestions();
        setQuestions(qs);
        setAnswers(qs.map(() => ''));
    }, []);

    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers];
        newAnswers[index] = value;
        setAnswers(newAnswers);
    };

    const handleSubmit = () => {
        // For demo, just log answers
        console.log('Feedback submitted', { questions, answers });
        toast.success('Feedback submitted');
    };

    if (questions.length === 0) return null;

    return (
        <Card className="glass-card p-6 mt-6">
            <h3 className="text-xl font-semibold mb-4">Annual Feedback</h3>
            {questions.map((q, idx) => (
                <div key={idx} className="mb-4">
                    <p className="font-medium mb-1">{q}</p>
                    <Input
                        placeholder="Your answer"
                        value={answers[idx]}
                        onChange={(e) => handleAnswerChange(idx, e.target.value)}
                    />
                </div>
            ))}
            <Button onClick={handleSubmit}>Submit Feedback</Button>
        </Card>
    );
};
