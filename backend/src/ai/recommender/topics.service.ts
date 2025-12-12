import { Injectable } from '@nestjs/common';

@Injectable()
export class TopicsService {
    // Mock Syllabus Data
    async getTopicsImportance(subject: string): Promise<Record<string, number>> {
        // 0 to 1 scale of importance/weight in exams
        return {
            'Algebra': 0.9,
            'Geometry': 0.8,
            'Calculus': 1.0,
            'Statistics': 0.6
        };
    }
}
