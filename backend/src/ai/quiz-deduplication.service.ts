import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

interface QuizQuestion {
  question: string;
  type: string;
  bloomLevel?: string;
  options?: string[];
  correctAnswer?: string;
  expectedAnswer?: string;
}

interface QuizData {
  school_id: string;
  teacher_id: string;
  subject?: string;
  topic: string;
  difficulty?: string;
  question_count: number;
  questions: QuizQuestion[];
  quiz_metadata?: {
    questionTypes?: { mcq?: number; shortAnswer?: number; essay?: number };
    bloomLevels?: string[];
    totalMarks?: number;
    duration?: number;
  };
}

@Injectable()
export class QuizDeduplicationService {
  private readonly logger = new Logger(QuizDeduplicationService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Get previous questions for a teacher on a specific topic
   * Used to avoid generating duplicate questions
   * OPTIMIZED: Cached for 5 minutes to reduce DB queries
   */
  async getPreviousQuestions(
    teacherId: string,
    subject: string,
    topic: string,
    limit: number = 20
  ): Promise<string[]> {
    // Check cache first (5-minute TTL)
    const cacheKey = `prev_questions:${teacherId}:${subject}:${topic}`;
    try {
      const cached = await this.cacheManager.get<string[]>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for previous questions (${cached.length} questions)`);
        return cached;
      }
    } catch (cacheError) {
      this.logger.warn(`Cache check failed: ${cacheError.message}`);
    }

    try {
      this.logger.log(`Getting previous questions for teacher ${teacherId}, subject: ${subject}, topic: ${topic}`);
      
      const history = await this.prisma.quiz_history.findMany({
        where: {
          teacher_id: teacherId,
          subject,
          topic: {
            contains: topic,
            mode: 'insensitive'
          }
        },
        orderBy: { created_at: 'desc' },
        take: 5, // Last 5 quizzes
        select: { questions: true }
      });

      // Extract question texts from JSON
      const questions: string[] = [];
      for (const quiz of history) {
        const quizQuestions = quiz.questions as unknown as QuizQuestion[];
        quizQuestions.forEach(q => {
          if (q.question) {
            questions.push(q.question);
          }
        });
      }

      const limitedQuestions = questions.slice(0, limit);
      this.logger.log(`Found ${limitedQuestions.length} previous questions`);
      
      // Cache for 5 minutes (300000ms)
      try {
        await this.cacheManager.set(cacheKey, limitedQuestions, 300000);
        this.logger.log(`Cached previous questions for 5 minutes`);
      } catch (cacheError) {
        this.logger.warn(`Failed to cache previous questions: ${cacheError.message}`);
      }
      
      return limitedQuestions;
    } catch (error) {
      this.logger.error(`Error getting previous questions: ${error.message}`);
      return []; // Return empty array on error, don't block quiz generation
    }
  }

  /**
   * Save a generated quiz to history
   */
  async saveQuiz(quizData: QuizData): Promise<void> {
    try {
      this.logger.log(`Saving quiz: ${quizData.topic} (${quizData.question_count} questions)`);
      
      await this.prisma.quiz_history.create({
        data: {
          school_id: quizData.school_id,
          teacher_id: quizData.teacher_id,
          subject: quizData.subject,
          topic: quizData.topic,
          difficulty: quizData.difficulty,
          question_count: quizData.question_count,
          questions: quizData.questions as any, // Prisma will handle JSON serialization
          quiz_metadata: quizData.quiz_metadata as any,
          used_count: 0
        }
      });

      this.logger.log(`Quiz saved successfully`);
    } catch (error) {
      this.logger.error(`Error saving quiz: ${error.message}`);
      // Don't throw - saving to history is optional, shouldn't block quiz generation
    }
  }

  /**
   * Calculate similarity between two questions using Jaccard similarity
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  calculateSimilarity(q1: string, q2: string): number {
    const words1 = new Set(q1.toLowerCase().split(/\s+/));
    const words2 = new Set(q2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Check if a question is too similar to previous questions
   * Returns true if similarity > threshold (default 0.8 = 80% similar)
   */
  isTooSimilar(newQuestion: string, previousQuestions: string[], threshold: number = 0.8): boolean {
    for (const prevQ of previousQuestions) {
      const similarity = this.calculateSimilarity(newQuestion, prevQ);
      if (similarity > threshold) {
        this.logger.warn(`Question too similar (${(similarity * 100).toFixed(0)}%): "${newQuestion.substring(0, 50)}..."`);
        return true;
      }
    }
    return false;
  }

  /**
   * Get quiz history for a teacher (for question bank UI)
   */
  async getQuizHistory(
    teacherId: string,
    schoolId: string,
    filters?: {
      subject?: string;
      topic?: string;
      difficulty?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    try {
      const where: any = {
        teacher_id: teacherId,
        school_id: schoolId
      };

      if (filters?.subject) {
        where.subject = filters.subject;
      }

      if (filters?.topic) {
        where.topic = {
          contains: filters.topic,
          mode: 'insensitive'
        };
      }

      if (filters?.difficulty) {
        where.difficulty = filters.difficulty;
      }

      const [quizzes, total] = await Promise.all([
        this.prisma.quiz_history.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: filters?.limit || 20,
          skip: filters?.offset || 0,
          select: {
            id: true,
            subject: true,
            topic: true,
            difficulty: true,
            question_count: true,
            used_count: true,
            created_at: true,
            quiz_metadata: true
          }
        }),
        this.prisma.quiz_history.count({ where })
      ]);

      return {
        quizzes,
        total,
        page: Math.floor((filters?.offset || 0) / (filters?.limit || 20)) + 1,
        totalPages: Math.ceil(total / (filters?.limit || 20))
      };
    } catch (error) {
      this.logger.error(`Error getting quiz history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a specific quiz by ID (for viewing/editing)
   */
  async getQuizById(quizId: string, teacherId: string) {
    try {
      const quiz = await this.prisma.quiz_history.findFirst({
        where: {
          id: quizId,
          teacher_id: teacherId // Ensure teacher can only access their own quizzes
        }
      });

      if (quiz) {
        // Increment used_count
        await this.prisma.quiz_history.update({
          where: { id: quizId },
          data: { used_count: { increment: 1 } }
        });
      }

      return quiz;
    } catch (error) {
      this.logger.error(`Error getting quiz by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a quiz from history
   */
  async deleteQuiz(quizId: string, teacherId: string): Promise<boolean> {
    try {
      await this.prisma.quiz_history.deleteMany({
        where: {
          id: quizId,
          teacher_id: teacherId // Ensure teacher can only delete their own quizzes
        }
      });
      
      this.logger.log(`Quiz ${quizId} deleted`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting quiz: ${error.message}`);
      return false;
    }
  }

  /**
   * Get statistics for teacher's quiz generation
   */
  async getQuizStats(teacherId: string, schoolId: string) {
    try {
      const [totalQuizzes, totalQuestions, bySubject, byDifficulty] = await Promise.all([
        // Total quizzes generated
        this.prisma.quiz_history.count({
          where: { teacher_id: teacherId, school_id: schoolId }
        }),
        
        // Total questions generated
        this.prisma.quiz_history.aggregate({
          where: { teacher_id: teacherId, school_id: schoolId },
          _sum: { question_count: true }
        }),
        
        // Quizzes by subject
        this.prisma.quiz_history.groupBy({
          by: ['subject'],
          where: { teacher_id: teacherId, school_id: schoolId },
          _count: true
        }),
        
        // Quizzes by difficulty
        this.prisma.quiz_history.groupBy({
          by: ['difficulty'],
          where: { teacher_id: teacherId, school_id: schoolId },
          _count: true
        })
      ]);

      return {
        totalQuizzes,
        totalQuestions: totalQuestions._sum.question_count || 0,
        bySubject: bySubject.map(s => ({ subject: s.subject, count: s._count })),
        byDifficulty: byDifficulty.map(d => ({ difficulty: d.difficulty, count: d._count }))
      };
    } catch (error) {
      this.logger.error(`Error getting quiz stats: ${error.message}`);
      throw error;
    }
  }
}
