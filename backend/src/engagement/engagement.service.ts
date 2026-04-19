import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendQuestionDto } from './dto/send-question.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(private prisma: PrismaService) {}

  // Create a new engagement session
  async createSession(dto: CreateSessionDto) {
    const session = await this.prisma.engagement_sessions.create({
      data: {
        school_id: dto.school_id,
        teacher_id: dto.teacher_id,
        class_id: dto.class_id,
        file_id: dto.file_id,
        session_name: dto.session_name,
        status: 'active',
      },
      include: {
        classes: true,
        profiles: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return session;
  }

  // End a session (wraps finalization in a $transaction)
  async endSession(sessionId: string) {
    const session = await this.prisma.engagement_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'ended') throw new BadRequestException('Session already ended');

    const updated = await this.finalizeSession(sessionId);
    return updated;
  }

  // Send a question
  async sendQuestion(dto: SendQuestionDto) {
    const session = await this.prisma.engagement_sessions.findUnique({
      where: { id: dto.session_id },
      include: { classes: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status !== 'active') {
      throw new BadRequestException('Session is not active');
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + dto.time_limit_seconds);

    const question = await this.prisma.pop_questions.create({
      data: {
        session_id: dto.session_id,
        question_text: dto.question_text,
        option_a: dto.option_a,
        option_b: dto.option_b,
        option_c: dto.option_c,
        option_d: dto.option_d,
        correct_option: dto.correct_option,
        time_limit_seconds: dto.time_limit_seconds,
        points: dto.points,
        expires_at: expiresAt,
      },
    });

    return {
      ...question,
      class_name: session.classes.name,
    };
  }

  // Submit student response
  async submitResponse(dto: SubmitResponseDto) {
    // Validate question_id is present
    if (!dto.question_id) {
      throw new BadRequestException('Question ID is required');
    }

    const question = await this.prisma.pop_questions.findUnique({
      where: { id: dto.question_id },
      include: {
        engagement_sessions: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Check if question has expired
    if (new Date() > question.expires_at) {
      throw new BadRequestException('Question has expired');
    }

    // Check if student already answered
    const existing = await this.prisma.student_responses.findUnique({
      where: {
        question_id_student_id: {
          question_id: dto.question_id,
          student_id: dto.student_id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Already answered this question');
    }

    // ── Combined Scoring Engine ───────────────────────────────────────────────
    // progress   = fraction of time limit used (0 = instant, 1 = at limit)
    // speedFactor= continuous speed measure (0 = slowest, 1 = instant)
    // baseScore  = 70-100 continuous (spec formula)
    // tier       = 4-bracket multiplier to keep tier-distribution analytics
    const isCorrect = dto.selected_option === question.correct_option;
    let pointsEarned = 0;

    if (isCorrect) {
      const timeLimit = question.time_limit_seconds ?? 30;
      const progress  = dto.response_time_ms / (timeLimit * 1000);
      const speedFactor = Math.max(0, Math.min(1, 1 - progress));
      const baseScore   = 70 + speedFactor * 30; // 70–100

      let tierMultiplier: number;
      let tierLabel: string;
      if (progress <= 0.25)      { tierMultiplier = 1.00; tierLabel = 'Elite (<25%)'; }
      else if (progress <= 0.50) { tierMultiplier = 0.75; tierLabel = 'Fast (25-50%)'; }
      else if (progress <= 0.75) { tierMultiplier = 0.50; tierLabel = 'Medium (50-75%)'; }
      else                       { tierMultiplier = 0.25; tierLabel = 'Slow (>75%)'; }

      pointsEarned = Math.floor(baseScore * tierMultiplier);

      this.logger.log(`[SCORING] Student ${dto.student_id} | Time: ${dto.response_time_ms}ms / ${timeLimit}s | Progress: ${(progress * 100).toFixed(1)}% | SpeedFactor: ${speedFactor.toFixed(3)} | BaseScore: ${baseScore.toFixed(1)} | Tier: ${tierLabel} (×${tierMultiplier}) | Points: ${pointsEarned}`);
    }

    this.logger.log(`[DEBUG] Submitting response for student ${dto.student_id}, question ${dto.question_id}, Correct: ${isCorrect}`);

    // Save response
    const response = await this.prisma.student_responses.create({
      data: {
        question_id: dto.question_id,
        student_id: dto.student_id,
        selected_option: dto.selected_option,
        response_time_ms: dto.response_time_ms,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      },
      include: {
        profiles: {
          select: {
            id: true,
            name: true,
          },
        },
        pop_questions: {
          select: {
            session_id: true,
          },
        },
      },
    });

    // Update analytics synchronously to ensure real-time dashboards see the latest data
    await this.updateAnalytics(question.session_id, dto.student_id).catch((err) =>
      this.logger.error('Failed to update analytics:', err),
    );

    return {
      ...response,
      correct_option: question.correct_option,
    };
  }

  // Check if a student has already responded to a specific question
  async hasStudentResponded(questionId: string, studentId: string): Promise<boolean> {
    const existing = await this.prisma.student_responses.findUnique({
      where: {
        question_id_student_id: {
          question_id: questionId,
          student_id: studentId,
        },
      },
    });
    return !!existing;
  }

  // Get session details
  async getSession(sessionId: string) {
    const session = await this.prisma.engagement_sessions.findUnique({
      where: { id: sessionId },
      include: {
        classes: true,
        profiles: {
          select: {
            id: true,
            name: true,
          },
        },
        pop_questions: {
          orderBy: { sent_at: 'desc' },
          include: {
            student_responses: {
              include: {
                profiles: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  // Get real-time analytics for a session
  async getSessionAnalytics(sessionId: string) {
    const session = await this.prisma.engagement_sessions.findUnique({
      where: { id: sessionId },
      include: {
        pop_questions: {
          include: {
            student_responses: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const totalQuestions = session.pop_questions.length;
    const totalResponses = session.pop_questions.reduce(
      (sum, q) => sum + q.student_responses.length,
      0,
    );
    const correctResponses = session.pop_questions.reduce(
      (sum, q) => sum + q.student_responses.filter((r) => r.is_correct).length,
      0,
    );

    const avgResponseTime =
      totalResponses > 0
        ? session.pop_questions.reduce(
            (sum, q) =>
              sum +
              q.student_responses.reduce((s, r) => s + r.response_time_ms, 0),
            0,
          ) / totalResponses
        : 0;

    return {
      session_id: sessionId,
      total_questions: totalQuestions,
      total_responses: totalResponses,
      correct_responses: correctResponses,
      accuracy_rate: totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0,
      avg_response_time_ms: Math.round(avgResponseTime),
    };
  }

  // Get teacher's sessions
  async getTeacherSessions(teacherId: string, limit = 10) {
    const sessions = await this.prisma.engagement_sessions.findMany({
      where: { teacher_id: teacherId },
      orderBy: { started_at: 'desc' },
      take: limit,
      include: {
        classes: true,
        engagement_analytics: true,
        pop_questions: {
          select: {
            id: true,
          },
        },
      },
    });

    this.logger.log(`[DEBUG] Found ${sessions.length} sessions for teacher ${teacherId}`);
    if (sessions.length > 0) {
      this.logger.log(`[DEBUG] First session status: ${sessions[0].status}, Questions: ${sessions[0].pop_questions?.length}, Analytics: ${sessions[0].engagement_analytics?.length}`);
    }

    return sessions;
  }

  // Get student's engagement summary
  async getStudentSummary(studentId: string, sessionId?: string) {
    if (sessionId) {
      const analytics = await this.prisma.engagement_analytics.findUnique({
        where: {
          session_id_student_id: {
            session_id: sessionId,
            student_id: studentId,
          },
        },
      });

      return analytics;
    }

    // Get all-time summary
    const summary = await this.prisma.term_engagement_summary.findMany({
      where: { student_id: studentId },
      orderBy: { updated_at: 'desc' },
    });

    return summary;
  }

  // Get a student's history of engagement sessions
  async getStudentSessionHistory(studentId: string) {
    const history = await this.prisma.engagement_analytics.findMany({
      where: { student_id: studentId },
      include: {
        engagement_sessions: {
          include: {
            profiles: {
              select: {
                name: true,
              },
            },
            _count: {
              select: { pop_questions: true },
            },
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    return history.map((item) => ({
      id: item.id,
      sessionId: item.session_id,
      sessionName: item.engagement_sessions.session_name || 'Unnamed Session',
      teacherName: item.engagement_sessions.profiles.name,
      startedAt: item.engagement_sessions.started_at,
      totalQuestions: item.total_questions,
      answeredCount: item.questions_answered,
      correctCount: item.questions_correct,
      pointsEarned: item.total_points_earned,
      accuracyRate: Number(item.accuracy_rate || 0),
      participationRate: Number(item.participation_rate || 0),
      engagementScore: Number(item.engagement_score || 0),
    }));
  }

  // Get all sessions for a school
  async getSchoolSessions(schoolId: string) {
    return this.prisma.engagement_sessions.findMany({
      where: { school_id: schoolId },
      include: {
        profiles: true,
        classes: true,
        _count: {
          select: { pop_questions: true, engagement_analytics: true },
        },
      },
      orderBy: { started_at: 'desc' },
    });
  }

  // Get school-wide engagement analytics
  async getSchoolAnalytics(schoolId: string) {
    this.logger.log(`[EngagementService] Fetching school analytics for schoolId: ${schoolId}`);
    
    const analytics = await this.prisma.engagement_analytics.findMany({
      where: { school_id: schoolId },
    });

    const totalSessions = await this.prisma.engagement_sessions.count({
      where: { school_id: schoolId },
    });

    const sessions = await this.prisma.engagement_sessions.findMany({
      where: { school_id: schoolId },
      include: {
        classes: {
          include: {
            grade_levels: true
          }
        },
        pop_questions: {
          select: { id: true }
        }
      }
    });

    const totalQuestions = sessions.reduce((sum, s) => sum + (s.pop_questions?.length || 0), 0);
    
    if (analytics.length === 0) {
      return {
        totalSessions,
        totalQuestions,
        avgParticipation: 0,
        avgAccuracy: 0,
        avgResponseTime: 0,
        usageBySubject: [],
        trend: [],
        speedDistribution: { elite: 0, fast: 0, medium: 0, slow: 0 },
        recentSessions: []
      };
    }

    const avgParticipation = analytics.reduce((sum, a) => sum + Number(a.participation_rate || 0), 0) / analytics.length;
    const avgAccuracy = analytics.reduce((sum, a) => sum + Number(a.accuracy_rate || 0), 0) / analytics.length;
    const avgResponseTime = analytics.reduce((sum, a) => sum + Number(a.avg_response_time_ms || 0), 0) / analytics.length;

    // 1. Class Distribution (formerly Subject)
    const classGroups = new Map<string, { sessions: number; engagement: number; count: number }>();
    for (const session of sessions) {
      const gradeName = session.classes?.grade_levels?.name || '';
      const sectionName = session.classes?.name || 'General';
      const fullClassName = gradeName ? `${gradeName} - ${sectionName}` : sectionName;
      
      const existing = classGroups.get(fullClassName) || { sessions: 0, engagement: 0, count: 0 };
      const sessionAnalytics = analytics.filter(a => a.session_id === session.id);
      const sessionEngagement = sessionAnalytics.length > 0
        ? sessionAnalytics.reduce((sum, a) => sum + Number(a.participation_rate || 0), 0) / sessionAnalytics.length
        : 0;

      classGroups.set(fullClassName, {
        sessions: existing.sessions + 1,
        engagement: existing.engagement + sessionEngagement,
        count: existing.count + 1
      });
    }

    const usageBySubject = Array.from(classGroups.entries()).map(([name, data]) => ({
      subject: name,
      sessions: data.sessions,
      engagement: Math.round(data.engagement / data.count)
    })).sort((a, b) => b.engagement - a.engagement).slice(0, 10);

    // 2. Time-based Trend (Last 7 days)
    const dateMap = new Map<string, { date: string; participation: number; count: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap.set(dateStr, { date: dateStr, participation: 0, count: 0 });
    }

    for (const s of sessions) {
      const dateStr = new Date(s.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dateMap.has(dateStr)) {
        const existing = dateMap.get(dateStr)!;
        const sessionAnalytics = analytics.filter(a => a.session_id === s.id);
        const sessionAvg = sessionAnalytics.length > 0
          ? sessionAnalytics.reduce((sum, a) => sum + Number(a.participation_rate || 0), 0) / sessionAnalytics.length
          : 0;
        
        existing.participation += sessionAvg;
        existing.count += 1;
      }
    }

    const timeTrend = Array.from(dateMap.values()).reverse().map(d => ({
      subject: d.date,
      engagement: d.count > 0 ? Math.round(d.participation / d.count) : 0
    }));

    // 3. Speed Tier Distribution
    const allResponses = await this.prisma.student_responses.findMany({
      where: { 
        pop_questions: { engagement_sessions: { school_id: schoolId } },
        is_correct: true
      },
      include: { pop_questions: true }
    });

    const speedTiers = { elite: 0, fast: 0, medium: 0, slow: 0 };
    allResponses.forEach(r => {
      const progress = r.response_time_ms / (r.pop_questions.time_limit_seconds * 1000);
      if (progress <= 0.25) speedTiers.elite++;
      else if (progress <= 0.5) speedTiers.fast++;
      else if (progress <= 0.75) speedTiers.medium++;
      else speedTiers.slow++;
    });

    // 4. Recent Sessions List
    const recentSessionsGlobal = await this.prisma.engagement_sessions.findMany({
      where: { school_id: schoolId },
      orderBy: { started_at: 'desc' },
      take: 10,
      include: {
        classes: {
          include: {
            grade_levels: true
          }
        },
        profiles: { select: { name: true } },
        engagement_analytics: true
      }
    });

    const recentSessionsList = recentSessionsGlobal.map(s => {
      const gradeName = s.classes?.grade_levels?.name || '';
      const sectionName = s.classes?.name || 'General';
      const fullClassName = gradeName ? `${gradeName} - ${sectionName}` : sectionName;

      return {
        id: s.id,
        name: s.session_name || 'Quick Session',
        teacher: s.profiles.name,
        class: fullClassName,
        accuracy: s.engagement_analytics.length > 0 
          ? Math.round(s.engagement_analytics.reduce((sum, a) => sum + Number(a.accuracy_rate || 0), 0) / s.engagement_analytics.length) 
          : 0,
        speed: s.engagement_analytics.length > 0 
          ? Math.round(s.engagement_analytics.reduce((sum, a) => sum + Number(a.avg_response_time_ms || 0), 0) / s.engagement_analytics.length) 
          : 0,
        date: s.started_at
      };
    });

    return {
      totalSessions,
      totalQuestions,
      avgParticipation: Math.round(avgParticipation),
      avgAccuracy: Math.round(avgAccuracy),
      avgResponseTime: Math.round(avgResponseTime),
      usageBySubject,
      trend: timeTrend,
      speedDistribution: speedTiers,
      recentSessions: recentSessionsList
    };
  }

  // Get teacher engagement leaderboard
  async getTeacherLeaderboard(schoolId: string) {
    const teachers = await this.prisma.profiles.findMany({
      where: { 
        school_id: schoolId,
        user_roles: {
          role: {
            equals: 'teacher',
            mode: 'insensitive'
          }
        }
      },
      include: {
        engagement_sessions: {
          include: {
            engagement_analytics: true,
            classes: {
              include: {
                grade_levels: true
              }
            },
            files: {
              include: {
                grade_subjects: {
                  include: {
                    subjects_master: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const result = teachers.map(teacher => {
      const sessions = (teacher as any).engagement_sessions || [];
      const allAnalytics = sessions.flatMap((s: any) => s.engagement_analytics || []);
      
      const avgParticipation = allAnalytics.length > 0
        ? allAnalytics.reduce((sum: number, a: any) => sum + Number(a.participation_rate || 0), 0) / allAnalytics.length
        : 0;
        
      const avgAccuracy = allAnalytics.length > 0
        ? allAnalytics.reduce((sum: number, a: any) => sum + Number(a.accuracy_rate || 0), 0) / allAnalytics.length
        : 0;

      const avgResponseTime = allAnalytics.length > 0
        ? allAnalytics.reduce((sum: number, a: any) => sum + Number(a.avg_response_time_ms || 0), 0) / allAnalytics.length
        : 0;

      // Compute a 0-10 engagement score:
      // accuracy 40% + participation 40% + speed bonus 20%
      // speed bonus: max 100 when avgResponseTime <= 1000ms, scales down
      const speedScore = avgResponseTime > 0 ? Math.max(0, 100 - avgResponseTime / 100) : 50;
      const rawScore = avgAccuracy * 0.4 + avgParticipation * 0.4 + speedScore * 0.2;
      const score = Math.min(10, rawScore / 10);

      // Extract unique classes
      const uniqueClasses = new Set<string>();
      sessions.forEach((s: any) => {
        const gradeName = s.classes?.grade_levels?.name || '';
        const sectionName = s.classes?.name || 'General';
        uniqueClasses.add(gradeName ? `${gradeName} - ${sectionName}` : sectionName);
      });

      // Extract unique subjects via files → grade_subjects → subjects_master
      const uniqueSubjects = new Set<string>();
      sessions.forEach((s: any) => {
        const subjectName = s.files?.grade_subjects?.subjects_master?.name;
        if (subjectName) uniqueSubjects.add(subjectName);
      });

      const classLabel = Array.from(uniqueClasses).slice(0, 2).join(', ') + (uniqueClasses.size > 2 ? '...' : '');
      const subjectLabel = Array.from(uniqueSubjects).slice(0, 2).join(', ') + (uniqueSubjects.size > 2 ? '...' : '');

      return {
        name: teacher.name,
        sessions: sessions.length,
        participation: Math.round(avgParticipation),
        accuracy: Math.round(avgAccuracy),
        avgResponseTime: Math.round(avgResponseTime),
        score: Math.round(score * 10) / 10,
        grade: classLabel || 'N/A',
        subject: subjectLabel || 'N/A',
        classes: Array.from(uniqueClasses),
        subjects: Array.from(uniqueSubjects),
      };
    }).sort((a, b) => b.score - a.score).slice(0, 20);

    return result;
  }

  // Get per-class and per-subject engagement breakdown for admin dashboard
  async getClassSubjectAnalytics(schoolId: string) {
    const sessions = await this.prisma.engagement_sessions.findMany({
      where: { school_id: schoolId },
      include: {
        classes: {
          include: { grade_levels: true }
        },
        files: {
          include: {
            grade_subjects: {
              include: { subjects_master: true }
            }
          }
        },
        engagement_analytics: true,
      }
    });

    // ---- By Class ----
    const classMap = new Map<string, { sessions: number; totalAccuracy: number; totalParticipation: number; totalResponseTime: number; count: number }>();
    for (const s of sessions) {
      const gradeName = s.classes?.grade_levels?.name || '';
      const sectionName = s.classes?.name || 'General';
      const key = gradeName ? `${gradeName} - ${sectionName}` : sectionName;

      const analytics = s.engagement_analytics || [];
      const avgAcc = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + Number(a.accuracy_rate || 0), 0) / analytics.length
        : 0;
      const avgPart = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + Number(a.participation_rate || 0), 0) / analytics.length
        : 0;
      const avgRT = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + Number(a.avg_response_time_ms || 0), 0) / analytics.length
        : 0;

      const existing = classMap.get(key) || { sessions: 0, totalAccuracy: 0, totalParticipation: 0, totalResponseTime: 0, count: 0 };
      classMap.set(key, {
        sessions: existing.sessions + 1,
        totalAccuracy: existing.totalAccuracy + avgAcc,
        totalParticipation: existing.totalParticipation + avgPart,
        totalResponseTime: existing.totalResponseTime + avgRT,
        count: existing.count + 1,
      });
    }

    const byClass = Array.from(classMap.entries()).map(([className, data]) => ({
      className,
      sessions: data.sessions,
      avgAccuracy: Math.round(data.totalAccuracy / data.count),
      avgParticipation: Math.round(data.totalParticipation / data.count),
      avgResponseTime: Math.round(data.totalResponseTime / data.count),
    })).sort((a, b) => b.avgParticipation - a.avgParticipation);

    // ---- By Subject ----
    const subjectMap = new Map<string, { sessions: number; totalAccuracy: number; totalParticipation: number; totalResponseTime: number; count: number }>();
    for (const s of sessions) {
      const subjectName = (s as any).files?.grade_subjects?.subjects_master?.name;
      if (!subjectName) continue;

      const analytics = s.engagement_analytics || [];
      const avgAcc = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + Number(a.accuracy_rate || 0), 0) / analytics.length
        : 0;
      const avgPart = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + Number(a.participation_rate || 0), 0) / analytics.length
        : 0;
      const avgRT = analytics.length > 0
        ? analytics.reduce((sum, a) => sum + Number(a.avg_response_time_ms || 0), 0) / analytics.length
        : 0;

      const existing = subjectMap.get(subjectName) || { sessions: 0, totalAccuracy: 0, totalParticipation: 0, totalResponseTime: 0, count: 0 };
      subjectMap.set(subjectName, {
        sessions: existing.sessions + 1,
        totalAccuracy: existing.totalAccuracy + avgAcc,
        totalParticipation: existing.totalParticipation + avgPart,
        totalResponseTime: existing.totalResponseTime + avgRT,
        count: existing.count + 1,
      });
    }

    const bySubject = Array.from(subjectMap.entries()).map(([subjectName, data]) => ({
      subjectName,
      sessions: data.sessions,
      avgAccuracy: Math.round(data.totalAccuracy / data.count),
      avgParticipation: Math.round(data.totalParticipation / data.count),
      avgResponseTime: Math.round(data.totalResponseTime / data.count),
    })).sort((a, b) => b.avgParticipation - a.avgParticipation);

    return { byClass, bySubject };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION FINALIZER — called by endSession, runs inside $transaction
  // ═══════════════════════════════════════════════════════════════════════════
  private async finalizeSession(sessionId: string) {
    // Load full session data outside the transaction (read-only)
    const sessionData = await this.prisma.engagement_sessions.findUnique({
      where: { id: sessionId },
      include: {
        pop_questions: {
          include: { student_responses: true },
        },
      },
    });

    if (!sessionData) throw new NotFoundException('Session not found');

    const totalQuestions = sessionData.pop_questions.length;

    // Build per-student aggregates
    const studentMap = new Map<string, {
      answered: number; correct: number;
      totalPoints: number; totalResponseTime: number;
    }>();

    for (const q of sessionData.pop_questions) {
      for (const r of q.student_responses) {
        const prev = studentMap.get(r.student_id) || { answered: 0, correct: 0, totalPoints: 0, totalResponseTime: 0 };
        studentMap.set(r.student_id, {
          answered:          prev.answered + 1,
          correct:           prev.correct + (r.is_correct ? 1 : 0),
          totalPoints:       prev.totalPoints + (r.points_earned ?? 0),
          totalResponseTime: prev.totalResponseTime + r.response_time_ms,
        });
      }
    }

    // Run $transaction: mark session ended + upsert per-student analytics
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Mark session ended
      const endedSession = await tx.engagement_sessions.update({
        where: { id: sessionId },
        data: { status: 'ended', ended_at: new Date() },
      });

      // 2. Upsert engagement_analytics for each participating student
      for (const [studentId, agg] of studentMap.entries()) {
        const participationRate = totalQuestions > 0 ? (agg.answered / totalQuestions) * 100 : 0;
        const accuracyRate      = agg.answered > 0  ? (agg.correct  / agg.answered)   * 100 : 0;
        const avgRT             = agg.answered > 0  ? agg.totalResponseTime / agg.answered : null;

        // engagement_score: participation 40% + accuracy 40% + speed bonus 20%
        const speedBonus    = avgRT ? Math.max(0, 100 - avgRT / 1000) * 0.2 : 0;
        const engagementScore = participationRate * 0.4 + accuracyRate * 0.4 + speedBonus;

        await tx.engagement_analytics.upsert({
          where: { session_id_student_id: { session_id: sessionId, student_id: studentId } },
          create: {
            session_id:          sessionId,
            student_id:          studentId,
            school_id:           sessionData.school_id,
            total_questions:     totalQuestions,
            questions_answered:  agg.answered,
            questions_correct:   agg.correct,
            total_points_earned: agg.totalPoints,
            avg_response_time_ms: avgRT ? Math.round(avgRT) : null,
            participation_rate:   participationRate,
            accuracy_rate:        accuracyRate,
            engagement_score:     engagementScore,
          },
          update: {
            total_questions:     totalQuestions,
            questions_answered:  agg.answered,
            questions_correct:   agg.correct,
            total_points_earned: agg.totalPoints,
            avg_response_time_ms: avgRT ? Math.round(avgRT) : null,
            participation_rate:   participationRate,
            accuracy_rate:        accuracyRate,
            engagement_score:     engagementScore,
          },
        });
      }

      return endedSession;
    });

    // 3. After transaction: update teacher efficiency and student term summaries
  await this.upsertTeacherEfficiency(sessionData.teacher_id, sessionData.school_id).catch(err =>
    this.logger.error('[finalizeSession] Failed to update teacher efficiency:', err),
  );

  for (const studentId of studentMap.keys()) {
    await this.updateStudentTermSummary(studentId, sessionData.school_id).catch(err =>
      this.logger.error(`[finalizeSession] Failed to update term summary for ${studentId}:`, err),
    );
  }

  this.logger.log(`[finalizeSession] Session ${sessionId} finalized. ${studentMap.size} students processed.`);
  return updated;
}

  // ── Teacher Efficiency Metrics Upsert ─────────────────────────────────────
  private async upsertTeacherEfficiency(teacherId: string, schoolId: string) {
    const termId = `TERM-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // Load all analytics for all sessions the teacher has ever conducted
    const teacherSessions = await this.prisma.engagement_sessions.findMany({
      where: { teacher_id: teacherId, school_id: schoolId },
      include: { engagement_analytics: true, pop_questions: { select: { id: true } } },
    });

    const allAnalytics = teacherSessions.flatMap(s => s.engagement_analytics);

    if (allAnalytics.length === 0) return;

    const avgParticipation  = allAnalytics.reduce((s, a) => s + Number(a.participation_rate || 0), 0) / allAnalytics.length;
    const avgAccuracy       = allAnalytics.reduce((s, a) => s + Number(a.accuracy_rate      || 0), 0) / allAnalytics.length;
    const avgEngagement     = allAnalytics.reduce((s, a) => s + Number(a.engagement_score   || 0), 0) / allAnalytics.length;

    const totalQuestionsSent = teacherSessions.reduce((s, sess) => s + (sess.pop_questions?.length ?? 0), 0);

    // combined_efficiency_score = participation 40% + accuracy 40% + engagement 20%
    const combinedScore = avgParticipation * 0.4 + avgAccuracy * 0.4 + avgEngagement * 0.2;

    await this.prisma.teacher_efficiency_metrics.upsert({
      where: { teacher_id_term_id: { teacher_id: teacherId, term_id: termId } },
      create: {
        teacher_id:                 teacherId,
        school_id:                  schoolId,
        term_id:                    termId,
        academic_year:              `${new Date().getFullYear()}`,
        total_sessions_conducted:   teacherSessions.length,
        total_questions_sent:       totalQuestionsSent,
        avg_class_participation:    avgParticipation,
        avg_class_accuracy:         avgAccuracy,
        avg_engagement_score:       avgEngagement,
        combined_efficiency_score:  combinedScore,
      },
      update: {
        total_sessions_conducted:   teacherSessions.length,
        total_questions_sent:       totalQuestionsSent,
        avg_class_participation:    avgParticipation,
        avg_class_accuracy:         avgAccuracy,
        avg_engagement_score:       avgEngagement,
        combined_efficiency_score:  combinedScore,
      },
    });

    this.logger.log(`[upsertTeacherEfficiency] Teacher ${teacherId} | Term ${termId} | Combined score: ${combinedScore.toFixed(2)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Admin Dashboard: grade → class breakdown + top teacher
async getAdminDashboard(schoolId: string) {
  const sessions = await this.prisma.engagement_sessions.findMany({
    where: { school_id: schoolId },
    include: {
      classes: { include: { grade_levels: true } },
      engagement_analytics: true,
    },
  });

  // Grouping by Grade
  const gradeMap = new Map<string, any>();

  for (const s of sessions) {
    const gradeName = s.classes?.grade_levels?.name || 'Unknown Grade';
    const className = s.classes?.name || 'General';
    const classId = s.classes?.id || 'default';
    const analytics = s.engagement_analytics || [];
    
    const avgAcc = analytics.length > 0 ? analytics.reduce((sum, a) => sum + Number(a.accuracy_rate || 0), 0) / analytics.length : 0;
    const avgPart = analytics.length > 0 ? analytics.reduce((sum, a) => sum + Number(a.participation_rate || 0), 0) / analytics.length : 0;

    if (!gradeMap.has(gradeName)) {
      gradeMap.set(gradeName, { grade: gradeName, classes: new Map(), totalSessions: 0, sumPart: 0 });
    }

    const g = gradeMap.get(gradeName);
    g.totalSessions += 1;
    g.sumPart += avgPart;

    if (!g.classes.has(classId)) {
      g.classes.set(classId, { classId, className, sessions: 0, sumAcc: 0, sumPart: 0 });
    }
    const c = g.classes.get(classId);
    c.sessions += 1;
    c.sumAcc += avgAcc;
    c.sumPart += avgPart;
  }

  const byGrade = Array.from(gradeMap.values()).map(g => ({
    grade: g.grade,
    avgParticipation: Math.round(g.sumPart / g.totalSessions),
    totalSessions: g.totalSessions,
    classes: Array.from(g.classes.values()).map((c: any) => ({
      classId: c.classId,
      className: c.className,
      avgAccuracy: Math.round(c.sumAcc / c.sessions),
      avgParticipation: Math.round(c.sumPart / c.sessions),
    }))
  })).sort((a, b) => b.avgParticipation - a.avgParticipation);

  // Top teacher logic (unchanged)
  const topMetric = await this.prisma.teacher_efficiency_metrics.findFirst({
    where: { school_id: schoolId },
    orderBy: { combined_efficiency_score: 'desc' },
    include: { profiles: { select: { name: true } } },
  });

  const topTeacher = topMetric ? {
    name: topMetric.profiles.name,
    avgParticipation: Math.round(Number(topMetric.avg_class_participation || 0)),
    avgAccuracy: Math.round(Number(topMetric.avg_class_accuracy || 0)),
    combinedScore: Math.round(Number(topMetric.combined_efficiency_score || 0) * 10) / 10,
    totalSessions: topMetric.total_sessions_conducted,
  } : null;

  return { byGrade, topTeacher };
}

// Teacher Session Dashboard: leaderboard, topic health, at-risk students
async getTeacherSessionDashboard(sessionId: string) {
    const session = await this.prisma.engagement_sessions.findUnique({
      where: { id: sessionId },
      include: {
        pop_questions: {
          orderBy: { sent_at: 'asc' },
          include: { student_responses: { include: { profiles: { select: { id: true, name: true } } } } },
        },
        engagement_analytics: {
          include: { profiles: { select: { id: true, name: true } } },
          orderBy: { total_points_earned: 'desc' },
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const totalQuestions = session.pop_questions.length;
    const avgTimeLimit   = totalQuestions > 0
      ? session.pop_questions.reduce((s, q) => s + (q.time_limit_seconds ?? 30), 0) / totalQuestions
      : 30;

    // 1. Leaderboard — ranked by total_points_earned
    const leaderboard = session.engagement_analytics.map((a, i) => ({
      rank:           i + 1,
      studentId:      a.student_id,
      studentName:    (a as any).profiles?.name || 'Unknown',
      pointsEarned:   (a as any).total_points_earned ?? 0,
      accuracy:       Math.round(Number(a.accuracy_rate     || 0)),
      participation:  Math.round(Number(a.participation_rate || 0)),
      engagementScore: Math.round(Number(a.engagement_score || 0) * 10) / 10,
    }));

    // 2. Topic Health — per question correctness %
    const topicHealth = session.pop_questions.map(q => {
      const total   = q.student_responses.length;
      const correct = q.student_responses.filter(r => r.is_correct).length;
      const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;
      return {
        questionId:     q.id,
        questionText:   q.question_text,
        totalResponses: total,
        correctCount:   correct,
        pctCorrect:     pct,
        requiresReview: pct < 50,
      };
    });

    // 3. At-Risk — accuracy < 40% OR avg response time > 80% of avg time limit
    const atRiskThresholdMs = avgTimeLimit * 1000 * 0.8;
    const atRisk = session.engagement_analytics
      .filter(a =>
        Number(a.accuracy_rate || 0) < 40 ||
        (a.avg_response_time_ms !== null && a.avg_response_time_ms > atRiskThresholdMs),
      )
      .map(a => ({
        studentId:       a.student_id,
        studentName:     (a as any).profiles?.name || 'Unknown',
        accuracy:        Math.round(Number(a.accuracy_rate     || 0)),
        avgResponseTime: a.avg_response_time_ms ?? 0,
        reason:          [
          Number(a.accuracy_rate || 0) < 40 ? 'Low accuracy (<40%)' : null,
          (a.avg_response_time_ms !== null && a.avg_response_time_ms > atRiskThresholdMs) ? 'Slow response (>80% of limit)' : null,
        ].filter(Boolean),
      }));

    return { sessionId, leaderboard, topicHealth, atRisk, totalQuestions };
  }

  // Student Leaderboard for a specific session
  async getSessionLeaderboard(sessionId: string) {
    const session = await this.prisma.engagement_sessions.findUnique({
      where: { id: sessionId },
      include: {
        engagement_analytics: {
          include: { profiles: { select: { id: true, name: true, avatar_url: true } } },
          orderBy: { total_points_earned: 'desc' },
          take: 10,
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const leaderboard = session.engagement_analytics.map((a, i) => ({
      rank: i + 1,
      studentId: a.student_id,
      studentName: (a as any).profiles?.name || 'Unknown',
      avatarUrl: (a as any).profiles?.avatar_url,
      pointsEarned: (a as any).total_points_earned ?? 0,
      accuracy: Math.round(Number(a.accuracy_rate || 0)),
    }));

    return { sessionId, sessionName: session.session_name, leaderboard };
  }

  // Student Performance Dashboard: recent scores + class rank
  async getStudentPerformance(studentId: string) {
    const recentAnalytics = await this.prisma.engagement_analytics.findMany({
      where: { student_id: studentId },
      orderBy: { updated_at: 'desc' },
      take: 10,
      include: {
        engagement_sessions: {
          include: { classes: { include: { grade_levels: true } } },
        },
      },
    });

    const recentScores = recentAnalytics.reverse().map(a => ({
      sessionId:       a.session_id,
      date:            new Date(a.engagement_sessions.started_at).toLocaleDateString(),
      sessionName:     a.engagement_sessions.session_name || 'Session',
      score:          Math.round(Number(a.engagement_score || 0)),
      accuracy:        Math.round(Number(a.accuracy_rate || 0)),
      participation:   Math.round(Number(a.participation_rate || 0)),
    }));

    const studentTerm = await this.prisma.term_engagement_summary.findFirst({
      where: { student_id: studentId },
      orderBy: { updated_at: 'desc' },
    });

    const studentDetail = await this.prisma.student_details.findUnique({
      where: { profile_id: studentId },
    });

    let classRank = 'N/A';
    if (studentDetail?.class_id) {
      const classSummaries = await this.prisma.term_engagement_summary.findMany({
        where: { 
          student_id: { 
            in: (await this.prisma.student_details.findMany({
              where: { class_id: studentDetail.class_id },
              select: { profile_id: true }
            })).map(s => s.profile_id)
          } 
        },
        orderBy: { avg_engagement_score: 'desc' },
      });
      const rankIdx = classSummaries.findIndex(s => s.student_id === studentId);
      classRank = rankIdx >= 0 ? (rankIdx + 1).toString() : 'N/A';
    }

    return {
      studentId,
      recentScores,
      classRank,
      termSummary: {
        avgEngagement: studentTerm ? Math.round(Number(studentTerm.avg_engagement_score || 0)) : 0,
        avgAccuracy: studentTerm ? Math.round(Number(studentTerm.avg_accuracy_rate || 0)) : 0,
        avgParticipation: studentTerm ? Math.round(Number(studentTerm.avg_participation_rate || 0)) : 0,
        totalSessions: studentTerm?.total_sessions ?? 0,
      },
    };
  }

  // Update analytics for a student in a session
  private async updateAnalytics(sessionId: string, studentId: string) {
    const session = await this.prisma.engagement_sessions.findUnique({
      where: { id: sessionId },
      include: {
        pop_questions: {
          include: {
            student_responses: {
              where: { student_id: studentId },
            },
          },
        },
      },
    });

    if (!session) return;

    const totalQuestions = session.pop_questions.length;
    const responses = session.pop_questions.flatMap((q) => q.student_responses);
    const questionsAnswered = responses.length;
    const questionsCorrect = responses.filter((r) => r.is_correct).length;
    const totalPointsEarned = responses.reduce((sum, r) => sum + r.points_earned, 0);
    const avgResponseTime =
      responses.length > 0
        ? responses.reduce((sum, r) => sum + r.response_time_ms, 0) / responses.length
        : null;

    const participationRate = totalQuestions > 0 ? (questionsAnswered / totalQuestions) * 100 : 0;
    const accuracyRate = questionsAnswered > 0 ? (questionsCorrect / questionsAnswered) * 100 : 0;

    // Calculate engagement score (participation 40%, accuracy 40%, speed 20%)
    const speedBonus = avgResponseTime
      ? Math.max(0, 100 - avgResponseTime / 1000) * 0.2
      : 0;
    const engagementScore = participationRate * 0.4 + accuracyRate * 0.4 + speedBonus;

    this.logger.log(`[CALCULATION LOG] Student ${studentId} analytics update:`);
    this.logger.log(`- Participation: ${questionsAnswered}/${totalQuestions} = ${participationRate.toFixed(2)}%`);
    this.logger.log(`- Accuracy: ${questionsCorrect}/${questionsAnswered} = ${accuracyRate.toFixed(2)}%`);
    this.logger.log(`- Speed Bonus (20% weight): ${speedBonus.toFixed(2)} (Avg Time: ${avgResponseTime?.toFixed(2)}ms)`);
    this.logger.log(`- Final Engagement Score: ${engagementScore.toFixed(2)}`);

    this.logger.log(`[DEBUG] Updating analytics for session ${sessionId}, student ${studentId}: Participation: ${participationRate}, Accuracy: ${accuracyRate}`);

    await this.prisma.engagement_analytics.upsert({
      where: {
        session_id_student_id: {
          session_id: sessionId,
          student_id: studentId,
        },
      },
      create: {
        session_id: sessionId,
        student_id: studentId,
        school_id: session.school_id,
        total_questions: totalQuestions,
        questions_answered: questionsAnswered,
        questions_correct: questionsCorrect,
        total_points_earned: totalPointsEarned,
        avg_response_time_ms: avgResponseTime ? Math.round(avgResponseTime) : null,
        participation_rate: participationRate,
        accuracy_rate: accuracyRate,
        engagement_score: engagementScore,
      },
      update: {
        total_questions: totalQuestions,
        questions_answered: questionsAnswered,
        questions_correct: questionsCorrect,
        total_points_earned: totalPointsEarned,
        avg_response_time_ms: avgResponseTime ? Math.round(avgResponseTime) : null,
        participation_rate: participationRate,
        accuracy_rate: accuracyRate,
        engagement_score: engagementScore,
      },
    });

    await this.updateStudentTermSummary(studentId, session.school_id);
  }

// Recalculate term-wide averages for a student
private async updateStudentTermSummary(studentId: string, schoolId: string) {
  const termId = `TERM-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const analytics = await this.prisma.engagement_analytics.findMany({
    where: { student_id: studentId },
  });

  if (analytics.length === 0) return;

  const totalSessions = analytics.length;
  const avgEngagement = analytics.reduce((s, a) => s + Number(a.engagement_score || 0), 0) / totalSessions;
  const avgAccuracy   = analytics.reduce((s, a) => s + Number(a.accuracy_rate     || 0), 0) / totalSessions;
  const avgParticipation = analytics.reduce((s, a) => s + Number(a.participation_rate || 0), 0) / totalSessions;

  await this.prisma.term_engagement_summary.upsert({
    where: { student_id_term_id: { student_id: studentId, term_id: termId } },
    create: {
      student_id: studentId,
      term_id:    termId,
      school_id:  schoolId,
      total_sessions: totalSessions,
      avg_engagement_score: avgEngagement,
      avg_accuracy_rate:    avgAccuracy,
      avg_participation_rate: avgParticipation,
    },
    update: {
      total_sessions: totalSessions,
      avg_engagement_score: avgEngagement,
      avg_accuracy_rate:    avgAccuracy,
      avg_participation_rate: avgParticipation,
    },
  });
}

// Backfill: Process all ended sessions that haven't been finalized
async backfillAnalytics() {
  const sessions = await this.prisma.engagement_sessions.findMany({
    where: { status: 'ended' },
    select: { id: true }
  });

  this.logger.log(`[BACKFILL] Starting for ${sessions.length} sessions...`);
  let count = 0;
  for (const s of sessions) {
    try {
      await this.finalizeSession(s.id);
      count++;
    } catch (e) {
      this.logger.error(`[BACKFILL] Failed for session ${s.id}:`, e.message);
    }
  }
  return { processed: count, total: sessions.length };
}

  // Get active session for a class
  async getActiveSessionForClass(classId: string) {
    const session = await this.prisma.engagement_sessions.findFirst({
      where: {
        class_id: classId,
        status: 'active',
      },
      include: {
        pop_questions: {
          where: {
            expires_at: {
              gt: new Date(Date.now() - 10000), // Only include if expired < 10s ago
            },
          },
          orderBy: {
            sent_at: 'desc',
          },
          take: 1,
        },
      },
    });

    return session;
  }

  async getSessionStudentDetails(sessionId: string) {
    const session = await (this.prisma.engagement_sessions as any).findUnique({
      where: { id: sessionId },
      include: {
        classes: {
          include: {
            student_details: {
              include: {
                profiles: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        pop_questions: {
          select: {
            time_limit_seconds: true
          }
        },
        engagement_analytics: {
          include: {
            profiles: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const studentDetails = session.classes?.student_details || [];
    const classStudents = studentDetails.map((sd: any) => sd.profiles).filter(Boolean);
    const analytics = session.engagement_analytics || [];
    const popQuestions = session.pop_questions || [];
    
    // Calculate average time limit for the session
    const avgTimeLimit = popQuestions.length > 0 
      ? Math.round(popQuestions.reduce((sum: number, q: any) => sum + (q.time_limit_seconds || 30), 0) / popQuestions.length) 
      : 30;

    // Map analytics by student ID for easy lookup
    const analyticsMap = new Map<string, any>(analytics.map((a: any) => [a.student_id, a]));

    const details = classStudents.map((student: any) => {
      const studentAnalytics = analyticsMap.get(student.id);
      
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        answered: !!studentAnalytics,
        accuracy: studentAnalytics ? Math.round(Number(studentAnalytics.accuracy_rate || 0)) : 0,
        speed: studentAnalytics ? Math.round(Number(studentAnalytics.avg_response_time_ms || 0)) : 0,
        participation: studentAnalytics ? Math.round(Number(studentAnalytics.participation_rate || 0)) : 0,
        points: studentAnalytics ? (studentAnalytics as any).total_points_earned || 0 : 0
      };
    });

    return {
      sessionId: session.id,
      sessionName: session.session_name,
      className: session.classes?.name,
      avgTimeLimit,
      students: details.sort((a, b) => (b.answered ? 1 : 0) - (a.answered ? 1 : 0) || a.name.localeCompare(b.name))
    };
  }
}
