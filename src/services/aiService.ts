import { logger } from '@/lib/logger';

export interface AiRequestDto {
    taskType: 'start' | 'explain' | 'solve' | 'doubt' | 'summary' | 'expand' | 'study_plan' | 'predict' | 'mock_test' | 'life_skill';
    query: string;
    classId?: string;
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
        logger.log('[Frontend AI Service] ========================================');
        logger.log('[Frontend AI Service] 🚀 Sending AI request');
        logger.log('[Frontend AI Service] Task Type:', dto.taskType);
        logger.log('[Frontend AI Service] Query:', dto.query);
        logger.log('[Frontend AI Service] Subject:', dto.subject || 'Not provided');
        logger.log('[Frontend AI Service] Student ID:', dto.studentId || 'Not provided');

        try {
            const { apiClient } = await import('@/lib/apiClient');
            
            // Convert task type to endpoint (e.g., 'study_plan' -> 'studyplan')
            const endpoint = `/ai/${dto.taskType.replace(/_/g, '')}`;
            logger.log('[Frontend AI Service] Endpoint:', endpoint);

            const startTime = Date.now();
            logger.log('[Frontend AI Service] Request payload:', JSON.stringify(dto, null, 2));
            const response = await apiClient.post<AiResponseDto>(endpoint, dto);
            const duration = Date.now() - startTime;

            logger.log('[Frontend AI Service] ✅ Response received');
            logger.log('[Frontend AI Service] Duration:', duration, 'ms');
            logger.log('[Frontend AI Service] Response title:', response.title);
            logger.log('[Frontend AI Service] ========================================');

            return response;
        } catch (error: any) {
            logger.error('[Frontend AI Service] ❌ Request failed:', error);
            logger.error('[Frontend AI Service] Error details:', {
                message: error.message,
                status: error.status,
                data: error.data,
            });
            throw error;
        }
    }
};
