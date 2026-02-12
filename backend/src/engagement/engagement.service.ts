import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendQuestionDto } from './dto/send-question.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';

@Injectable()
export class EngagementService {
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

  // End a session
  async endSession(sessionId: string) {
    const session = await this.prisma.engagement_sessions.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status === 'ended') {
      throw new BadRequestException('Session already ended');
    }

    const updated = await this.prisma.engagement_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'ended',
        ended_at: new Date(),
      },
    });

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

    // Calculate correctness and points
    const isCorrect = dto.selected_option === question.correct_option;
    let pointsEarned = 0;

    if (isCorrect) {
      const timeElapsed = dto.response_time_ms / 1000;
      const timeLimit = question.time_limit_seconds;
      const progress = timeElapsed / timeLimit;

      console.log(`[CALCULATION LOG] Student ${dto.student_id} response time: ${dto.response_time_ms}ms (${timeElapsed}s)`);
      console.log(`[CALCULATION LOG] Time limit: ${timeLimit}s. Progress: ${(progress * 100).toFixed(2)}% of limit`);

      if (progress <= 0.25) {
        pointsEarned = question.points; // 100%
        console.log(`[CALCULATION LOG] Tier 1 (<25%): 100% points awarded (${pointsEarned})`);
      } else if (progress <= 0.5) {
        pointsEarned = Math.round(question.points * 0.75); // 75%
        console.log(`[CALCULATION LOG] Tier 2 (25-50%): 75% points awarded (${pointsEarned})`);
      } else if (progress <= 0.75) {
        pointsEarned = Math.round(question.points * 0.5); // 50%
        console.log(`[CALCULATION LOG] Tier 3 (50-75%): 50% points awarded (${pointsEarned})`);
      } else {
        pointsEarned = Math.round(question.points * 0.25); // 25%
        console.log(`[CALCULATION LOG] Tier 4 (>75%): 25% points awarded (${pointsEarned})`);
      }
    }

    console.log(`[DEBUG] Submitting response for student ${dto.student_id}, question ${dto.question_id}, Correct: ${isCorrect}`);

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
      console.error('Failed to update analytics:', err),
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

    console.log(`[DEBUG] Found ${sessions.length} sessions for teacher ${teacherId}`);
    if (sessions.length > 0) {
      console.log(`[DEBUG] First session status: ${sessions[0].status}, Questions: ${sessions[0].pop_questions?.length}, Analytics: ${sessions[0].engagement_analytics?.length}`);
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
    console.log(`[EngagementService] Fetching school analytics for schoolId: ${schoolId}`);
    
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
          }
        }
      }
    });

    return teachers.map(teacher => {
      const sessions = (teacher as any).engagement_sessions || [];
      const allAnalytics = sessions.flatMap((s: any) => s.engagement_analytics || []);
      
      const avgParticipation = allAnalytics.length > 0
        ? allAnalytics.reduce((sum: number, a: any) => sum + Number(a.participation_rate || 0), 0) / allAnalytics.length
        : 0;
        
      const avgAccuracy = allAnalytics.length > 0
        ? allAnalytics.reduce((sum: number, a: any) => sum + Number(a.accuracy_rate || 0), 0) / allAnalytics.length
        : 0;

      // Extract unique classes
      const uniqueClasses = new Set<string>();
      sessions.forEach((s: any) => {
        const gradeName = s.classes?.grade_levels?.name || '';
        const sectionName = s.classes?.name || 'General';
        uniqueClasses.add(gradeName ? `${gradeName} - ${sectionName}` : sectionName);
      });

      const classLabel = Array.from(uniqueClasses).slice(0, 2).join(', ') + (uniqueClasses.size > 2 ? '...' : '');

      return {
        name: teacher.name,
        sessions: sessions.length,
        participation: Math.round(avgParticipation),
        accuracy: Math.round(avgAccuracy),
        grade: classLabel || 'N/A'
      };
    }).sort((a, b) => b.participation - a.participation).slice(0, 10);
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

    console.log(`[CALCULATION LOG] Student ${studentId} analytics update:`);
    console.log(`- Participation: ${questionsAnswered}/${totalQuestions} = ${participationRate.toFixed(2)}%`);
    console.log(`- Accuracy: ${questionsCorrect}/${questionsAnswered} = ${accuracyRate.toFixed(2)}%`);
    console.log(`- Speed Bonus (20% weight): ${speedBonus.toFixed(2)} (Avg Time: ${avgResponseTime?.toFixed(2)}ms)`);
    console.log(`- Final Engagement Score: ${engagementScore.toFixed(2)}`);

    console.log(`[DEBUG] Updating analytics for session ${sessionId}, student ${studentId}: Participation: ${participationRate}, Accuracy: ${accuracyRate}`);

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
