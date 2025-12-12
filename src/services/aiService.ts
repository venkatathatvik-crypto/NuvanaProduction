import { supabase } from "@/lib/mockBackend";

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

const BACKEND_URL = 'http://localhost:3000'; // Default NestJS port

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
            console.warn("AI Backend unreachable, falling back to mock response.", error);

            // 2. Fallback Mock Response (for UI development/testing without backend)
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        title: `Mock ${dto.taskType} Response`,
                        keyPoints: ["Point 1: Conceptual understanding", "Point 2: Practical application", "Point 3: Critical analysis"],
                        explanation: `This is a **simulated response** because the backend at ${BACKEND_URL} is offline.\n\nYou asked: *"${dto.query}"*\n\nIn a real scenario, the AI would analyse your mastery profile and RAG context to give a precise answer.`,
                        personalizedFeedback: "You seem strong in this area, try tackling harder problems!",
                        followUpQuestion: "How would you apply this concept to a real-world scenario?",
                        rawResponse: "..."
                    });
                }, 1500);
            });
        }
    }
};
