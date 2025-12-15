

export interface AiRequestDto {
    taskType: 'explain' | 'solve' | 'doubt' | 'summary' | 'expand' | 'study_plan' | 'predict' | 'mock_test' | 'life_skill';
    query: string;
    subject?: string;
    topic?: string;
    classBand?: string;
    studentId?: string;
    additionalContext?: any;
}

export interface AiResponseDto {
    title: string;
    keyPoints: string[];
    explanation: string;
    personalizedFeedback?: string;
    followUpQuestion?: string;
    rawResponse?: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const aiService = {
    async processRequest(dto: AiRequestDto): Promise<AiResponseDto> {
        try {
            // 1. Try hitting the real backend
            const response = await fetch(`${BACKEND_URL}/ai/${dto.taskType.replace('_', '')}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'x-api-key': 'your-api-key' // If we enforced it
                },
                body: JSON.stringify(dto),
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("AI Backend request failed:", error);
            throw error; // Propagate error to UI instead of faking a success
        }
    }
};
