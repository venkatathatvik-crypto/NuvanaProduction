import { aiService } from './aiService';

/**
 * Get subjects that have uploaded PDF files for a student's class
 * Only returns subjects with actual materials in the RAG database
 */
export const getSubjectsWithMaterials = async (classId: string): Promise<string[]> => {
    try {
        const { apiClient } = await import('@/lib/apiClient');
        const subjects = await apiClient.get<string[]>(`/rag/subjects/class/${classId}`);
        
        console.log('[Subject Service] Subjects with uploaded materials for class', classId, ':', subjects);
        return subjects || [];
    } catch (error: any) {
        console.error('[Subject Service] Error fetching subjects with materials:', error);
        return [];
    }
};
