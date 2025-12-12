import { Injectable } from '@nestjs/common';
import { MasteryService } from './mastery.service';
import { TopicsService } from './topics.service';

@Injectable()
export class RecommendationService {
    constructor(
        private masteryService: MasteryService,
        private topicsService: TopicsService,
    ) { }

    async generateRecommendations(studentId: string, subject: string) {
        const masteryData = await this.masteryService.getMasteryProfile(studentId, subject);
        const importanceData = await this.topicsService.getTopicsImportance(subject);

        const recommendations = [];

        for (const [topic, importance] of Object.entries(importanceData)) {
            const mastery = masteryData.topics[topic] || 0;
            // Formula: Importance * (1 - Mastery)
            // High importance + Low mastery = High Priority
            const priorityScore = (importance as number) * (1 - mastery);

            recommendations.push({
                topic,
                priorityScore,
                currentMastery: mastery,
                importance
            });
        }

        // Sort by priority score descending
        recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

        return {
            primaryFocus: recommendations.slice(0, 3).map(r => r.topic),
            secondaryFocus: recommendations.slice(3, 5).map(r => r.topic),
            debugScores: recommendations
        };
    }
}
