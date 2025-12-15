export interface AiRequestDto {
    taskType: 'explain' | 'solve' | 'doubt' | 'summary' | 'expand' | 'study_plan' | 'predict' | 'mock_test' | 'life_skill';
    query: string;
    subject?: string;
    topic?: string;
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

export const aiService = {
    async processRequest(dto: AiRequestDto): Promise<AiResponseDto> {
        console.log('[Frontend AI Service] ========================================');
        console.log('[Frontend AI Service] 🚀 Sending AI request');
        console.log('[Frontend AI Service] Task Type:', dto.taskType);
        console.log('[Frontend AI Service] Query:', dto.query);
        console.log('[Frontend AI Service] Subject:', dto.subject || 'Not provided');
        console.log('[Frontend AI Service] Student ID:', dto.studentId || 'Not provided');

        try {
            const { apiClient } = await import('@/lib/apiClient');
            
            // Convert task type to endpoint (e.g., 'study_plan' -> 'studyplan')
            const endpoint = `/ai/${dto.taskType.replace('_', '')}`;
            console.log('[Frontend AI Service] Endpoint:', endpoint);

            const startTime = Date.now();
            console.log('[Frontend AI Service] Request payload:', JSON.stringify(dto, null, 2));
            const response = await apiClient.post<AiResponseDto>(endpoint, dto);
            const duration = Date.now() - startTime;

            console.log('[Frontend AI Service] ✅ Response received');
            console.log('[Frontend AI Service] Duration:', duration, 'ms');
            console.log('[Frontend AI Service] Response title:', response.title);
            console.log('[Frontend AI Service] ========================================');

            return response;
        } catch (error: any) {
            console.error('[Frontend AI Service] ❌ Request failed:', error);
            console.error('[Frontend AI Service] Error details:', {
                message: error.message,
                status: error.status,
                data: error.data,
            });
            throw error;
        }
    }
};
