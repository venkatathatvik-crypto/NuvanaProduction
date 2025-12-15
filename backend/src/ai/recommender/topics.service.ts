import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TopicsService {
    private readonly logger = new Logger(TopicsService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Calculate topic importance based on total marks weight in all tests
     * Topics with more marks are considered more important
     * Returns importance scores normalized to 0-1 scale
     */
    async getTopicsImportance(subject: string, schoolId?: string): Promise<Record<string, number>> {
        try {
            // Get all questions for this subject across all tests
            // Join through: questions -> tests -> grade_subjects -> subjects_master
            const questions = await this.prisma.questions.findMany({
                where: {
                    tests: {
                        grade_subjects: {
                            subjects_master: {
                                name: {
                                    equals: subject,
                                    mode: 'insensitive', // Case-insensitive matching
                                },
                                ...(schoolId && { school_id: schoolId }),
                            },
                        },
                    },
                },
                select: {
                    topic: true,
                    chapter: true,
                    marks: true,
                },
            });

            // If no questions found, return empty importance
            if (questions.length === 0) {
                this.logger.debug(`No questions found for subject: ${subject}`);
                return {};
            }

            // Calculate total marks per topic
            const topicWeights: Record<string, number> = {};
            let totalMarks = 0;

            questions.forEach((question) => {
                const marks = question.marks || 0;
                // Use topic, fallback to chapter, fallback to 'General'
                const topic = question.topic?.trim() || question.chapter?.trim() || 'General';

                if (!topicWeights[topic]) {
                    topicWeights[topic] = 0;
                }

                topicWeights[topic] += marks;
                totalMarks += marks;
            });

            // Normalize to 0-1 scale (importance = topic_marks / total_marks)
            const importance: Record<string, number> = {};
            Object.entries(topicWeights).forEach(([topic, weight]) => {
                // Normalize: importance is the proportion of total marks
                importance[topic] = totalMarks > 0 ? weight / totalMarks : 0.1; // Default 0.1 if no marks
            });

            this.logger.debug(
                `Topic importance calculated for subject ${subject}: ` +
                    `${Object.keys(importance).length} topics, total marks: ${totalMarks}`,
            );

            return importance;
        } catch (error) {
            this.logger.error(`Error calculating topic importance for subject ${subject}:`, error);
            // Return empty on error (graceful degradation)
            return {};
        }
    }
}
