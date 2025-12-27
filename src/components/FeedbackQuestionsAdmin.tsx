import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { feedbackService } from '@/services/feedbackService';

const FeedbackQuestionsAdmin = () => {
    const [questions, setQuestions] = useState<string[]>([]);
    const [newQuestion, setNewQuestion] = useState('');

    useEffect(() => {
        setQuestions(feedbackService.getQuestions());
    }, []);

    const addQuestion = () => {
        if (!newQuestion.trim()) return;
        const updated = [...questions, newQuestion.trim()];
        setQuestions(updated);
        feedbackService.setQuestions(updated);
        setNewQuestion('');
        toast.success('Question added');
    };

    const deleteQuestion = (index: number) => {
        const updated = questions.filter((_, i) => i !== index);
        setQuestions(updated);
        feedbackService.setQuestions(updated);
        toast.success('Question removed');
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <Input
                    placeholder="New question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                />
                <Button onClick={addQuestion}>Add</Button>
            </div>
            {questions.length === 0 ? (
                <p className="text-muted-foreground">No feedback questions defined.</p>
            ) : (
                <ul className="space-y-2">
                    {questions.map((q, idx) => (
                        <li key={idx} className="flex items-center justify-between bg-secondary/30 p-2 rounded">
                            <span>{q}</span>
                            <Button variant="destructive" size="icon" onClick={() => deleteQuestion(idx)}>
                                ✕
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default FeedbackQuestionsAdmin;
