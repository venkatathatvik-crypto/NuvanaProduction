import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MasteryService {
    private readonly logger = new Logger(MasteryService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * Calculate student mastery profile from graded test submissions
     * Only includes tests where is_graded = true
     * Includes both recent and historical data
     */
    async getMasteryProfile(studentId: string, subject: string): Promise<any> {
        try {
            // Get all graded test submissions for this student in the specified subject
            // Join through: test_submissions -> tests -> grade_subjects -> subjects_master
            const gradedSubmissions = await this.prisma.test_submissions.findMany({
                where: {
                    student_id: studentId,
                    is_graded: true, // Only graded tests
                    tests: {
                        grade_subjects: {
                            subjects_master: {
                                name: {
                                    equals: subject,
                                    mode: 'insensitive', // Case-insensitive matching
                                },
                            },
                        },
                    },
                },
                include: {
                    student_answers: {
                        include: {
                            questions: {
                                select: {
                                    id: true,
                                    topic: true,
                                    chapter: true,
                                    marks: true, // Total marks for this question
                                    correct_option_index: true,
                                },
                            },
                        },
                    },
                    tests: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: {
                    submitted_at: 'desc', // Most recent first
                },
            });

            // If no graded submissions found, return neutral profile
            if (gradedSubmissions.length === 0) {
                this.logger.debug(
                    `No graded test submissions found for student ${studentId} in subject ${subject}`,
                );
                return {
                    studentId,
                    subject,
                    topics: {}, // Empty means "no data yet"
                    overallScore: 0.5, // Neutral score
                    totalQuestions: 0,
                    totalTests: 0,
                };
            }

            // Calculate mastery scores
            const topicScores: Record<
                string,
                { obtainedMarks: number; totalMarks: number; questionCount: number }
            > = {};
            let totalObtainedMarks = 0;
            let totalPossibleMarks = 0;
            let totalQuestions = 0;

            // Process all submissions (recent + historical)
            gradedSubmissions.forEach((submission) => {
                submission.student_answers.forEach((answer) => {
                    const question = answer.questions;
                    const questionMarks = question.marks || 0;
                    const marksAwarded = answer.marks_awarded || 0;

                    // Use topic from question, fallback to 'General' if null
                    const topic = question.topic?.trim() || question.chapter?.trim() || 'General';

                    // Initialize topic if not exists
                    if (!topicScores[topic]) {
                        topicScores[topic] = {
                            obtainedMarks: 0,
                            totalMarks: 0,
                            questionCount: 0,
                        };
                    }

                    // Accumulate scores
                    topicScores[topic].obtainedMarks += marksAwarded;
                    topicScores[topic].totalMarks += questionMarks;
                    topicScores[topic].questionCount += 1;

                    // Overall scores
                    totalObtainedMarks += marksAwarded;
                    totalPossibleMarks += questionMarks;
                    totalQuestions += 1;
                });
            });

            // Convert topic scores to mastery percentages (0-1 scale)
            const topics: Record<string, number> = {};
            Object.entries(topicScores).forEach(([topic, scores]) => {
                // Calculate mastery: obtained / total marks
                // If no marks available, default to 0.5 (neutral)
                topics[topic] =
                    scores.totalMarks > 0 ? scores.obtainedMarks / scores.totalMarks : 0.5;
            });

            // Calculate overall mastery score
            const overallScore =
                totalPossibleMarks > 0 ? totalObtainedMarks / totalPossibleMarks : 0.5;

            this.logger.debug(
                `Mastery calculated for student ${studentId}, subject ${subject}: ` +
                    `overall=${overallScore.toFixed(2)}, topics=${Object.keys(topics).length}, ` +
                    `questions=${totalQuestions}, tests=${gradedSubmissions.length}`,
            );

        return {
            studentId,
            subject,
                topics, // Topic-level mastery scores (0-1 scale)
                overallScore, // Overall mastery (0-1 scale)
                totalQuestions,
                totalTests: gradedSubmissions.length,
                // Additional metadata for debugging/analytics
                topicDetails: Object.entries(topicScores).map(([topic, scores]) => ({
                    topic,
                    mastery: topics[topic],
                    questions: scores.questionCount,
                    obtainedMarks: scores.obtainedMarks,
                    totalMarks: scores.totalMarks,
                })),
            };
        } catch (error) {
            this.logger.error(
                `Error calculating mastery for student ${studentId}, subject ${subject}:`,
                error,
            );
            // Return neutral profile on error (graceful degradation)
            return {
                studentId,
                subject,
                topics: {},
                overallScore: 0.5,
                totalQuestions: 0,
                totalTests: 0,
                error: 'Failed to calculate mastery',
            };
        }
    }
}
