export const feedbackService = {
    getQuestions: (): string[] => {
        const stored = localStorage.getItem('feedbackQuestions');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return [];
            }
        }
        return [];
    },
    setQuestions: (questions: string[]) => {
        localStorage.setItem('feedbackQuestions', JSON.stringify(questions));
    },
};
