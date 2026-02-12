import { Injectable, InternalServerErrorException, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GeminiProvider } from './llm/gemini.provider';
import { AiRequestDto, AiTaskType } from './dto/ai-request.dto';
import { AiResponseDto } from './dto/ai-response.dto';
import { RagService } from './rag/rag.service';
import { MasteryService } from './recommender/mastery.service';
import { RecommendationService } from './recommender/recommendation.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuizDeduplicationService } from './quiz-deduplication.service';
import { AnalyticsService } from '../analytics/analytics.service';

// Prompts
import { SYSTEM_ROOT_PROMPT } from './prompts/system.prompt';
import { StartPrompt } from './prompts/start.prompt';
import { ExplainPrompt } from './prompts/explain.prompt';
import { SolvePrompt } from './prompts/solve.prompt';
import { DoubtPrompt } from './prompts/doubt.prompt';
import { SummaryPrompt } from './prompts/summary.prompt';
import { ExpandPrompt } from './prompts/expand.prompt';
import { StudyPlanPrompt } from './prompts/studyplan.prompt';
import { PredictPrompt } from './prompts/predict.prompt';
import { MockTestPrompt } from './prompts/teacher-quiz.prompt';
import { LifeSkillPrompt } from './prompts/lifeskill.prompt';
// Teacher-specific prompts
import { TeacherLessonPlanPrompt } from './prompts/teacher-lessonplan.prompt';
import { TeacherEmailPrompt } from './prompts/teacher-email.prompt';
import { TeacherQuizPrompt, TeacherQuizQuickReply } from './prompts/teacher-quiz.prompt';
import { TeacherGradePaperPrompt } from './prompts/teacher-gradepaper.prompt';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);

    constructor(
        private configService: ConfigService,
        private ragService: RagService,
        private masteryService: MasteryService,
        private recommendationService: RecommendationService,
        private llmProvider: GeminiProvider,
        private prisma: PrismaService,
        private quizDeduplicationService: QuizDeduplicationService, // Phase 3 & 4
        private analyticsService: AnalyticsService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async processRequest(dto: AiRequestDto): Promise<AiResponseDto> {
        const requestStartTime = Date.now();
        console.log(`[AI Service] ========================================`);
        console.log(`[AI Service] 🚀 New AI Request Received`);
        console.log(`[AI Service] Task Type: ${dto.taskType}`);
        console.log(`[AI Service] Query: "${dto.query}"`);
        console.log(`[AI Service] Subject: ${dto.subject || 'Not provided'}`);
        console.log(`[AI Service] Student ID: ${dto.studentId || 'Not provided'}`);
        console.log(`[AI Service] Class Band: ${dto.classBand || 'Not provided'}`);

        try {
            const { taskType, query, subject, classBand, studentId, additionalContext } = dto;
            const roleId = additionalContext?.roleId;
            const isTeacher = roleId === 3;
            const isStudent = roleId === 4;

            // Create cache key from request parameters (including quiz params for accurate caching)
            const quizParamsKey = dto.quizParams 
                ? `:q${dto.quizParams.questionCount || ''}:d${dto.quizParams.difficulty || ''}:t${JSON.stringify(dto.quizParams.questionTypes || {})}`
                : '';
            const cacheKey = `ai:${taskType}:${query.substring(0, 100)}:${subject || 'general'}:${classBand || 'middle'}${quizParamsKey}`;
            
            // Check cache first
            try {
                const cached = await this.cacheManager.get<AiResponseDto>(cacheKey);
                if (cached) {
                    console.log('[AI Service] ✓ Cache hit - returning cached response');
                    console.log(`[AI Service] ✅ Request completed from cache in ${Date.now() - requestStartTime}ms`);
                    console.log(`[AI Service] ========================================`);
                    return cached;
                }
                console.log('[AI Service] Cache miss - generating new response');
            } catch (cacheError) {
                console.warn('[AI Service] Cache check failed, proceeding without cache:', cacheError.message);
            }

            // 0. Get Class ID for RAG filtering
            // Priority: 1. dto.classId (Teacher selection), 2. profile.student_details (Student profile)
            let studentClassId = dto.classId;
            let autoClassBand: string | undefined;

            // OPTIMIZATION: Check if we can skip RAG/Profile for quick reply turns
            // We only need RAG and Mastery for the FINAL quiz generation, not for asking "How many questions?"
            const isQuizTask = taskType === AiTaskType.MOCK_TEST;
            const needsQuickReplies = isTeacher && isQuizTask && (
                !dto.quizParams?.questionCount || 
                !dto.quizParams?.questionTypes || 
                !dto.quizParams?.difficulty
            );

            // OPTIMIZATION: Parallelize profile, RAG, and mastery queries
            console.log(`[AI Service] Step 0-2: Fetching profile, RAG context, and mastery in parallel...`);
            if (needsQuickReplies) {
                console.log(`[AI Service] ⚡ Skipping RAG/Profile fetching for parameter collection turn`);
            }
            const parallelStartTime = Date.now();

            const [profileResult, ragContext, masteryResult, studentAnalytics, classAnalytics] = await Promise.all([
                // 0. Get Profile (if studentId provided AND not skipping)
                (studentId && !needsQuickReplies) ? (async () => {
                    try {
                        const profile = await this.prisma.profiles.findFirst({
                            where: { id: studentId },
                            include: {
                                student_details: {
                                    include: {
                                        classes: {
                                            include: {
                                                grade_levels: {
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
                        return { success: true, profile };
                    } catch (error) {
                        console.error(`[AI Service] ❌ Error getting profile context:`, error);
                        return { success: false, profile: null };
                    }
                })() : Promise.resolve({ success: true, profile: null }),

                // 1. RAG Context Retrieval (skip if needsQuickReplies)
                (!needsQuickReplies) ? (async () => {
                    try {
                        const context = await this.ragService.retrieve(
                            query,
                            subject,
                            autoClassBand || classBand || 'middle',
                            studentClassId
                        );
                        return context && context.trim() !== '' ? context : '[NO RELEVANT CONTENT FOUND]';
                    } catch (error) {
                        console.error(`[AI Service] ❌ RAG Retrieval failed:`, error);
                        return '[NO RELEVANT CONTENT FOUND]';
                    }
                })() : Promise.resolve('[SKIPPED]'),

                // 2. Student Mastery Profile (skip if needsQuickReplies)
                (studentId && subject && !needsQuickReplies) ? (async () => {
                    try {
                        const profile = await this.masteryService.getMasteryProfile(studentId, subject);
                        return { success: true, profile };
                    } catch (error) {
                        console.error(`[AI Service] ❌ Error getting mastery profile:`, error);
                        return { success: false, profile: null };
                    }
                })() : Promise.resolve({ success: true, profile: null }),

                // 3. Detailed Student Analytics (new) - Only for Students (role_id 4)
                (studentId && isStudent && !needsQuickReplies) ? (async () => {
                    try {
                        const profile = await this.prisma.profiles.findFirst({
                            where: { id: studentId },
                            select: { school_id: true }
                        });
                        if (profile?.school_id) {
                            const stats = await this.analyticsService.getStudentStatsSummary(studentId, profile.school_id);
                            const performance = await this.analyticsService.getStudentSubjectPerformance(studentId, profile.school_id);
                            const strengthsWeaknesses = await this.analyticsService.getStudentStrengthsWeaknesses(studentId, profile.school_id);
                            return { success: true, stats, performance, strengthsWeaknesses };
                        }
                        return { success: false };
                    } catch (error) {
                        if (error?.response?.message === 'Student not found' || error?.status === 404) {
                            console.warn(`[AI Service] ℹ️ Detailed analytics skipped: Student not found (${studentId})`);
                        } else {
                            console.error(`[AI Service] ❌ Error getting detailed analytics:`, error);
                        }
                        return { success: false };
                    }
                })() : Promise.resolve({ success: false }),

                // 4. Class Average Analytics (new - for Teachers)
                (isTeacher && dto.classId && !needsQuickReplies) ? (async () => {
                    try {
                        const profile = await this.prisma.profiles.findFirst({
                            where: { id: additionalContext.userId }, // Assuming userId is provided for teacher
                            select: { school_id: true }
                        });
                        if (profile?.school_id) {
                            const subjectAverages = await this.analyticsService.getClassSubjectAverages(dto.classId, profile.school_id);
                            const chapterTopic = await this.analyticsService.getClassChapterTopicAnalytics(dto.classId, profile.school_id, subject ? undefined : undefined); // Subject filtering can be added
                            return { success: true, subjectAverages, chapterTopic };
                        }
                        return { success: false };
                    } catch (error) {
                        console.error(`[AI Service] ❌ Error getting class analytics:`, error);
                        return { success: false };
                    }
                })() : Promise.resolve({ success: false }),
            ]);


            const parallelDuration = Date.now() - parallelStartTime;
            console.log(`[AI Service] ✓ Parallel queries completed in ${parallelDuration}ms`);

            // Process profile result
            if (profileResult.profile) {
                if (!studentClassId && profileResult.profile.student_details?.class_id) {
                    studentClassId = profileResult.profile.student_details.class_id;
                    console.log(`[AI Service] ✓ Auto-using student class_id: ${studentClassId}`);
                }

                const gradeLevel = profileResult.profile.student_details?.classes?.grade_levels;
                if (gradeLevel?.name) {
                    autoClassBand = this.determineClassBandFromGrade(gradeLevel.name);
                    console.log(`[AI Service] ✓ Auto-determined class band: ${autoClassBand} (from grade: ${gradeLevel.name})`);
                }
            }

            if (dto.classId) {
                console.log(`[AI Service] ✓ Using explicitly provided class_id (Teacher mode): ${dto.classId}`);
            }

            // Use auto-determined class band, fallback to frontend-provided, then default to 'middle'
            const band = autoClassBand || classBand || 'middle';
            if (autoClassBand) {
                console.log(`[AI Service] Using auto-determined class band: ${band} (from student's grade)`);
            } else if (classBand) {
                console.log(`[AI Service] Using frontend-provided class band: ${band} (fallback)`);
            } else {
                console.log(`[AI Service] Using default class band: ${band} (no grade/class info available)`);
            }

            // Process RAG result
            console.log(`[AI Service] RAG Context: ${ragContext === '[NO RELEVANT CONTENT FOUND]' ? 'empty' : `${ragContext.length} characters`}`);
            if (ragContext === '[NO RELEVANT CONTENT FOUND]') {
                console.log(`[AI Service] ⚠️ No RAG context found - will inform AI to refuse`);
            } else {
                console.log(`[AI Service] ✓ RAG context available (${ragContext.length} chars)`);
            }

            // Process mastery result
            let masteryProfile = 'Standard';
            let difficulty = 'Medium';
            if (masteryResult.profile) {
                const profile = masteryResult.profile;
                console.log(`[AI Service] Mastery Profile: Overall=${profile.overallScore}, Topics=${Object.keys(profile.topics || {}).length}`);

                const hasTopics = profile.topics && Object.keys(profile.topics).length > 0;
                if (hasTopics) {
                    masteryProfile = `Overall Score: ${profile.overallScore}. Topic Mastery: ${JSON.stringify(profile.topics)}`;
                } else {
                    masteryProfile = `Overall Score: ${profile.overallScore}. No specific topic mastery data available yet.`;
                }

                if (profile.overallScore >= 0.8) difficulty = 'Hard';
                else if (profile.overallScore < 0.4) difficulty = 'Easy';

                console.log(`[AI Service] ✓ Mastery profile loaded - Difficulty: ${difficulty}`);
            } else if (studentId && subject) {
                console.log(`[AI Service] ⚠️ Mastery profile not available, using defaults`);
            } else {
                console.log(`[AI Service] ⚠️ Skipping mastery (studentId or subject missing)`);
            }

            // 2.1 Process Detailed Student Analytics
            let detailedStudentContext = '';
            if ((studentAnalytics as any)?.success && (studentAnalytics as any)?.stats) {
                const sa = studentAnalytics as any;
                detailedStudentContext = this.formatStudentAnalytics(sa.stats, sa.performance, sa.strengthsWeaknesses);
                console.log(`[AI Service] ✓ Detailed student analytics processed`);
            }

            // 2.2 Process Class Analytics
            let classAnalyticsContext = '';
            if ((classAnalytics as any)?.success) {
                const ca = classAnalytics as any;
                classAnalyticsContext = this.formatClassAnalytics(ca.subjectAverages, ca.chapterTopic);
                console.log(`[AI Service] ✓ Class analytics processed for class: ${dto.classId}`);
            }

            // Combine all analytic context
            const analyticsContext = `${masteryProfile !== 'Standard' ? `MASTERY PROFILE: ${masteryProfile}\n` : ''}${detailedStudentContext}${classAnalyticsContext}`;

            // 3. Prompt Selection
            console.log(`[AI Service] Step 3: Selecting prompt template for task: ${taskType}...`);
            let userPrompt = '';
            
            // Phase 3: Quiz metadata for saving (declared here for scope)
            let quizMetadata: any = null;

            switch (taskType) {
                case AiTaskType.START:
                    userPrompt = StartPrompt(query, ragContext, band, isTeacher);
                    break;
                case AiTaskType.EXPLAIN:
                    userPrompt = ExplainPrompt(query, band, masteryProfile);
                    break;
                case AiTaskType.SOLVE:
                    userPrompt = SolvePrompt(query, band);
                    break;
                case AiTaskType.DOUBT:
                    userPrompt = DoubtPrompt(query, ragContext, band);
                    break;
                case AiTaskType.SUMMARY:
                    userPrompt = SummaryPrompt(dto.topic || query, band);
                    break;
                case AiTaskType.EXPAND:
                    userPrompt = ExpandPrompt(dto.topic || query, band);
                    break;
                case AiTaskType.STUDY_PLAN:
                    userPrompt = StudyPlanPrompt(dto.topic || query, 'Mastery', '1 Week', band);
                    break;
                case AiTaskType.PREDICT:
                    userPrompt = PredictPrompt(dto.topic || query, 'Key definition focus based on RAG', band);
                    break;
                case AiTaskType.MOCK_TEST:
                    // Teacher quiz generation with RAG support
                    if (isTeacher) {
                        // Prioritize explicit quizParams, fallback to text extraction
                        const questionCount = dto.quizParams?.questionCount ||
                                            this.extractQuestionCount(query) ||
                                            undefined; // Will ask user if not provided

                        const questionTypes = dto.quizParams?.questionTypes ?
                            (typeof dto.quizParams.questionTypes === 'string' ?
                                dto.quizParams.questionTypes :
                                this.formatQuestionTypes(dto.quizParams.questionTypes as any)) :
                            this.extractQuestionTypes(query) || undefined;

                        const quizDifficulty = dto.quizParams?.difficulty ||
                                             this.extractDifficulty(query) ||
                                             undefined;

                        console.log(`[AI Service] 📝 Quiz Generation Params:`);
                        console.log(`  - Question Count: ${questionCount || 'Not specified (will ask user)'}`);
                        console.log(`  - Question Types: ${questionTypes}`);
                        console.log(`  - Difficulty: ${quizDifficulty}`);
                        console.log(`  - Bloom's Levels: ${dto.quizParams?.bloomLevels?.join(', ') || 'All levels'}`);
                        console.log(`  - Source: ${dto.quizParams ? 'Explicit params' : 'Text extraction'}`);

                        // Check if we need to show quick reply buttons
                        const quickReplyResult = TeacherQuizQuickReply(
                            dto.topic || query,
                            subject || 'General',
                            band,
                            questionCount,
                            questionTypes,
                            quizDifficulty,
                            ragContext
                        );

                        // If quick replies are needed, return them immediately
                        if (quickReplyResult) {
                            console.log(`[AI Service] ✓ Returning quick reply buttons for: ${quickReplyResult.inputType}`);
                            return {
                                title: 'Quiz Creation',
                                keyPoints: [],
                                explanation: quickReplyResult.message,
                                quickReplies: quickReplyResult.quickReplies,
                                waitingForInput: quickReplyResult.waitingForInput,
                                inputType: quickReplyResult.inputType as any
                            };
                        }

                        // All parameters collected - proceed with quiz generation
                        console.log(`[AI Service] ✓ All parameters collected, proceeding with quiz generation`);

                        // Phase 3: Get previous questions for deduplication
                        let previousQuestions: string[] = [];
                        if (questionCount && additionalContext?.userId) {
                            try {
                                previousQuestions = await this.quizDeduplicationService.getPreviousQuestions(
                                    additionalContext.userId,
                                    subject || 'General',
                                    dto.topic || query
                                );
                                console.log(`  - Previous Questions: ${previousQuestions.length} found`);
                            } catch (error) {
                                console.warn(`  - Could not fetch previous questions: ${error.message}`);
                            }
                        }

                        userPrompt = TeacherQuizPrompt(
                            dto.topic || query,
                            subject || 'General',
                            band,
                            questionCount,
                            questionTypes,
                            quizDifficulty,
                            ragContext, // Pass RAG context for PDF-based questions
                            previousQuestions // Phase 3: Pass for deduplication
                        );
                        
                        // Store quiz metadata for saving after generation
                        quizMetadata = {
                            questionCount,
                            quizDifficulty,
                            questionTypes: dto.quizParams?.questionTypes,
                            bloomLevels: dto.quizParams?.bloomLevels
                        };
                    } else {
                        // Student mock test
                        userPrompt = MockTestPrompt([dto.topic || query], difficulty, '30 mins', band);
                    }
                    break;
                case AiTaskType.LIFE_SKILL:
                    userPrompt = LifeSkillPrompt(query, 'General Growth');
                    break;
                case AiTaskType.TEACHER_LESSON_PLAN:
                    // Extract duration and objectives from query if present
                    const duration = this.extractDuration(query);
                    userPrompt = TeacherLessonPlanPrompt(
                        dto.topic || query,
                        subject || 'General',
                        band,
                        duration,
                        undefined // Objectives derived from query
                    );
                    break;
                case AiTaskType.TEACHER_EMAIL_DRAFT:
                    // Extract email purpose and tone from query
                    const tone = this.extractTone(query);
                    userPrompt = TeacherEmailPrompt(
                        'Email request',
                        query,
                        undefined,
                        tone as any
                    );
                    break;
                case AiTaskType.TEACHER_GRADE_PAPER:
                    // Extract grading parameters from query
                    const totalMarks = this.extractTotalMarks(query);
                    const paperType = this.extractPaperType(query);
                    const gradingCriteria = this.extractGradingCriteria(query);
                    
                    userPrompt = TeacherGradePaperPrompt(
                        query, // Full query contains the paper content
                        subject || 'General',
                        band,
                        totalMarks,
                        paperType as any,
                        gradingCriteria
                    );
                    break;
                default:
                    userPrompt = query;
            }
            console.log(`[AI Service] ✓ Prompt template selected (${userPrompt.length} chars)`);

            // 4. LLM Call
            console.log(`[AI Service] Step 4: Calling Gemini LLM...`);
            const llmStartTime = Date.now();
            
            // Determine which model to use based on task complexity
            // Let the GeminiProvider's routing logic decide (gemini-3-flash or gemini-3-pro)
            let targetModel: string | undefined;
            // DISABLED: Hardcoded override causes 404 with v1beta API
            // if (taskType === AiTaskType.TEACHER_GRADE_PAPER || taskType === AiTaskType.STUDY_PLAN) {
            //     targetModel = 'gemini-1.5-pro';
            //     console.log(`[AI Service] 💎 Complex task detected - Routing to high-reasoning model: ${targetModel}`);
            // }

            // Combine system prompt and RAG context into single system message
            // (Gemini LangChain provider requires only one system message)
            const systemMessage = `${SYSTEM_ROOT_PROMPT}
 
 ${analyticsContext ? `ANALYTICS CONTEXT:\n${analyticsContext}\n` : ''}

RAG CONTEXT:
${ragContext}`;
            
            const rawContent = await this.llmProvider.generate([
                { role: 'system', content: systemMessage },
                { role: 'user', content: userPrompt }
            ], targetModel);
            const llmDuration = Date.now() - llmStartTime;
            console.log(`[AI Service] ✓ LLM response received (${llmDuration}ms, ${rawContent.length} chars)`);

            // 5. Parse Response
            console.log(`[AI Service] Step 5: Parsing LLM response...`);
            const parsedResponse = this.parseResponse(rawContent);
            console.log(`[AI Service] ✓ Response parsed successfully`);

            // Phase 3: Save quiz to history (for teacher quiz generation only)
            if (taskType === AiTaskType.MOCK_TEST && isTeacher && quizMetadata && additionalContext?.userId && additionalContext?.schoolId) {
                try {
                    // Extract questions from the raw response
                    const extractedQuestions = this.extractQuestionsFromResponse(rawContent);
                    
                    if (extractedQuestions.length > 0) {
                        await this.quizDeduplicationService.saveQuiz({
                            school_id: additionalContext.schoolId,
                            teacher_id: additionalContext.userId,
                            subject: subject || 'General',
                            topic: dto.topic || query,
                            difficulty: quizMetadata.quizDifficulty,
                            question_count: extractedQuestions.length,
                            questions: extractedQuestions,
                            quiz_metadata: {
                                questionTypes: quizMetadata.questionTypes,
                                bloomLevels: quizMetadata.bloomLevels,
                                totalMarks: extractedQuestions.reduce((sum, q) => sum + (q.marks || 2), 0),
                                duration: quizMetadata.questionCount + (extractedQuestions.filter(q => q.type !== 'MCQ').length * 3)
                            }
                        });
                        console.log(`[AI Service] ✓ Quiz saved to history (${extractedQuestions.length} questions)`);
                    }
                } catch (saveError) {
                    console.warn(`[AI Service] Failed to save quiz to history: ${saveError.message}`);
                    // Don't throw - saving is optional, shouldn't block response
                }
            }

            // Store in cache for future requests (1 hour TTL)
            try {
                await this.cacheManager.set(cacheKey, parsedResponse, 3600 * 1000); // 1 hour in milliseconds
                console.log('[AI Service] ✓ Response cached for future requests');
            } catch (cacheError) {
                console.warn('[AI Service] Failed to cache response:', cacheError.message);
                // Continue even if caching fails
            }

            const totalDuration = Date.now() - requestStartTime;
            console.log(`[AI Service] ✅ Request completed in ${totalDuration}ms`);
            console.log(`[AI Service] ========================================`);

            return parsedResponse;

        } catch (error) {
            console.error('AI Service Error (FULL TRACE):', error);
            throw new InternalServerErrorException(`Failed to generate AI response: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parse LLM response text into structured DTO
     * Handles multiple markdown formats and provides fallbacks
     */
    private parseResponse(text: string): AiResponseDto {
        const response = new AiResponseDto();
        response.rawResponse = text;

        if (!text || text.trim().length === 0) {
            response.title = 'AI Response';
            response.explanation = 'No response generated.';
            response.keyPoints = [];
            return response;
        }

        // Try to extract structured sections
        response.title = 
            this.extractSection(text, 'Title') || 
            this.extractSection(text, '### Title') ||
            this.extractFirstLine(text) ||
            'AI Response';

        response.explanation = 
            this.extractSection(text, 'Explanation') || 
            this.extractSection(text, '### Explanation') ||
            this.extractSection(text, 'Content') ||
            text; // Fallback to full text

        response.personalizedFeedback = 
            this.extractSection(text, 'Personalized Feedback') ||
            this.extractSection(text, 'Feedback') ||
            this.extractSection(text, 'Personalized') ||
            null;

        response.followUpQuestion = 
            this.extractSection(text, 'Follow-up Question') ||
            this.extractSection(text, 'Follow up Question') ||
            this.extractSection(text, 'Follow-up') ||
            null;

        // Extract key points with multiple formats
        const keyPointsRaw = 
            this.extractSection(text, 'Key Points') ||
            this.extractSection(text, 'KeyPoints') ||
            this.extractSection(text, 'Points');

        if (keyPointsRaw) {
            response.keyPoints = keyPointsRaw
                .split('\n')
                .filter(l => {
                    const trimmed = l.trim();
                    return trimmed.startsWith('-') || 
                           trimmed.startsWith('*') || 
                           /^\d+\./.test(trimmed) ||
                           trimmed.startsWith('•');
                })
                .map(l => l.replace(/^[-*\d+•.]\s*/, '').trim())
                .filter(l => l.length > 0);
        } else {
            response.keyPoints = [];
        }

        // Validate minimum required fields
        if (!response.explanation || response.explanation.trim().length < 10) {
            // If explanation is too short, use raw response
            response.explanation = text;
        }

        // Clean up title (remove markdown formatting)
        response.title = response.title.replace(/^#+\s*/, '').trim();

        return response;
    }

    /**
     * Extract section from markdown text
     * Handles multiple markdown formats
     */
    private extractSection(text: string, sectionName: string): string | null {
        // Try different markdown formats
        // For 'Explanation' or 'Content', we want to be less aggressive with lookaheads 
        // to avoid truncating at sub-headers (like ##)
        const isMainContent = ['explanation', 'content', 'detailed content'].includes(sectionName.toLowerCase());
        
        const patterns = [
            // If it's main content and starts with ###, only stop at another ### (not ##)
            isMainContent 
                ? new RegExp(`###\\s+${sectionName}\\s+([\\s\\S]*?)(?=###|$)`, 'i')
                : new RegExp(`###\\s+${sectionName}\\s+([\\s\\S]*?)(?=###|##|$)`, 'i'),
            
            new RegExp(`##\\s+${sectionName}\\s+([\\s\\S]*?)(?=##|###|$)`, 'i'),
            new RegExp(`#\\s+${sectionName}\\s+([\\s\\S]*?)(?=#|##|###|$)`, 'i'),
            new RegExp(`\\*\\*${sectionName}\\*\\*\\s*:?\\s*([\\s\\S]*?)(?=\\*\\*|##|###|$)`, 'i'),
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return null;
    }

    /**
     * Extract first line as title fallback
     */
    private extractFirstLine(text: string): string | null {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length > 0) {
            const firstLine = lines[0].trim();
            // Remove markdown headers
            return firstLine.replace(/^#+\s*/, '').substring(0, 100);
        }
        return null;
    }

    /**
     * Determine class band from grade level name
     * Examples: "Grade 10" → "high", "Grade 8" → "middle", "Grade 3" → "primary"
     * 
     * @param gradeName - Grade level name (e.g., "Grade 10", "10", "Class 10")
     * @returns Class band: 'primary', 'middle', 'high', or 'middle' as default
     */
    private determineClassBandFromGrade(gradeName: string): string {
        if (!gradeName) {
            return 'middle'; // Default fallback
        }

        // Extract numeric grade from grade name
        // Handles: "Grade 10", "10", "Class 10", "10th", etc.
        const gradeMatch = gradeName.match(/\d+/);
        if (!gradeMatch) {
            console.log(`[AI Service] ⚠️ Could not extract grade number from: "${gradeName}", defaulting to 'middle'`);
            return 'middle'; // Default if unable to parse
        }

        const gradeNumber = parseInt(gradeMatch[0]);

        // Mapping based on common education systems
        // Primary: Grades 1-5
        // Middle: Grades 6-8
        // High: Grades 9-12
        const classMap: Record<number, string> = {
            1: 'primary', 2: 'primary', 3: 'primary', 4: 'primary', 5: 'primary',
            6: 'middle', 7: 'middle', 8: 'middle',
            9: 'high', 10: 'high', 11: 'high', 12: 'high',
        };

        // Use a fallback if extraction fails
        return classMap[gradeNumber] || 'middle';
    }
    
    /**
     * Extract lesson duration from query text
     * Looks for patterns like "45 minutes", "1 hour", "60 min", etc.
     */
    private extractDuration(query: string): number | undefined {
        const patterns = [
            /(\d+)\s*(?:minutes?|mins?)/i,
            /(\d+)\s*(?:hours?|hrs?)/i
        ];
        
        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match) {
                const value = parseInt(match[1]);
                // Convert hours to minutes if needed
                if (pattern.toString().includes('hour')) {
                    return value * 60;
                }
                return value;
            }
        }
        
        return undefined; // Will use default in prompt
    }
    
    /**
     * Extract tone from query text
     * Looks for keywords indicating formality level
     */
    private extractTone(query: string): 'formal' | 'professional-friendly' | 'urgent' {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('urgent') || lowerQuery.includes('asap') || lowerQuery.includes('immediately')) {
            return 'urgent';
        }
        
        if (lowerQuery.includes('formal') || lowerQuery.includes('official') || lowerQuery.includes('administration')) {
            return 'formal';
        }
        
        return 'professional-friendly'; // Default
    }
    
    /**
     * Extract question count from query text
     * Looks for patterns like "10 questions", "15 MCQ", "20", etc.
     */
    private extractQuestionCount(query: string): number | undefined {
        const lowerQuery = query.toLowerCase();
        const patterns = [
            /(\d+)\s*(?:questions?|q\s|mcq|quiz|items?|prob)/i,
            /(?:grade|level|class|standard)\s+\d+/i, // Skip class numbers
            /(?:^|\b)(\d+)(?:\s|$)/  // Just a standalone number
        ];
        
        for (const pattern of patterns) {
            // Special case: ignore numbers that are likely classes (e.g., "Class 10")
            if (pattern.source.includes('grade|level')) continue;

            const match = query.match(pattern);
            if (match && match[1]) {
                const count = parseInt(match[1]);
                // Reasonable range check (1-100 questions)
                if (count >= 1 && count <= 100) {
                    // Avoid picking up the class number if it's the only number
                    if (lowerQuery.includes('grade') || lowerQuery.includes('class')) {
                        const classMatch = lowerQuery.match(/(?:class|grade|standard|std)\s*(\d+)/);
                        if (classMatch && parseInt(classMatch[1]) === count) {
                            continue; // This number is likely the class, look for another
                        }
                    }
                    return count;
                }
            }
        }
        
        return undefined; // Will prompt user to specify
    }
    
    /**
     * Extract question types from query text
     * Looks for MCQ, short answer, essay, etc.
     */
    private extractQuestionTypes(query: string): string | undefined {
        const lowerQuery = query.toLowerCase();
        
        // Check for specific type requests
        if (lowerQuery.includes('mcq') ||  lowerQuery.includes('multiple choice')) {
            if (lowerQuery.includes('only') || lowerQuery.includes('just')) {
                return 'MCQ only';
            }
            return 'Mostly MCQ';
        }
        
        if (lowerQuery.includes('short answer') || lowerQuery.includes('short question')) {
            if (lowerQuery.includes('only')) {
                return 'Short Answer only';
            }
            return 'Mostly Short Answer';
        }
        
        if (lowerQuery.includes('essay') || lowerQuery.includes('long answer')) {
            if (lowerQuery.includes('only')) {
                return 'Essay only';
            }
            return 'Mostly Essay';
            return 'Mixed types';
        }
        
        return undefined; // Will default to mixed
    }
    
    /**
     * Format question types from percentage distribution
     * Converts { mcq: 60, shortAnswer: 30, essay: 10 } to "Mixed types"
     */
    private formatQuestionTypes(types: { mcq?: number; shortAnswer?: number; essay?: number }): string {
        const mcq = types.mcq || 0;
        const shortAnswer = types.shortAnswer || 0;
        const essay = types.essay || 0;
        
        // Check for single type dominance (>80%)
        if (mcq > 80) return 'MCQ only';
        if (shortAnswer > 80) return 'Short Answer only';
        if (essay > 80) return 'Essay only';
        
        // Check for mostly one type (>60%)
        if (mcq > 60) return 'Mostly MCQ';
        if (shortAnswer > 60) return 'Mostly Short Answer';
        if (essay > 60) return 'Mostly Essay';
        
        return 'Mixed types';
    }
    
    /**
     * Extract difficulty level from query text
     */
    private extractDifficulty(query: string): string | undefined {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('easy') || lowerQuery.includes('basic') || lowerQuery.includes('simple')) {
            return 'Easy';
        }
        
        if (lowerQuery.includes('hard') || lowerQuery.includes('difficult') || lowerQuery.includes('challenging') || lowerQuery.includes('advanced')) {
            return 'Hard';
        }
        
        if (lowerQuery.includes('medium') || lowerQuery.includes('moderate') || lowerQuery.includes('intermediate')) {
            return 'Medium';
        }
        
        return undefined; // Will default to medium
    }
    
    /**
     * Extract total marks from query text
     * Looks for patterns like "20 marks", "total marks: 15", "out of 30", etc.
     */
    private extractTotalMarks(query: string): number | undefined {
        const patterns = [
            /(?:total\s*)?marks?\s*:?\s*(\d+)/i,
            /out\s*of\s*(\d+)/i,
            /(\d+)\s*marks?/i,
            /(\d+)\s*points?/i
        ];
        
        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match) {
                const marks = parseInt(match[1]);
                // Reasonable range check (1-100 marks)
                if (marks >= 1 && marks <= 100) {
                    return marks;
                }
            }
        }
        
        return undefined; // Will use default in prompt
    }
    
    /**
     * Extract paper type from query text
     * Identifies: Essay, Short Answer, Problem Solving, Creative Writing
     */
    private extractPaperType(query: string): string | undefined {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('essay')) {
            return 'Essay';
        }
        
        if (lowerQuery.includes('short answer') || lowerQuery.includes('short response')) {
            return 'Short_Answer';
        }
        
        if (lowerQuery.includes('problem') || lowerQuery.includes('math') || 
            lowerQuery.includes('calculation') || lowerQuery.includes('solution')) {
            return 'Problem_Solving';
        }
        
        if (lowerQuery.includes('creative writing') || lowerQuery.includes('story') || 
            lowerQuery.includes('poem') || lowerQuery.includes('narrative')) {
            return 'Creative_Writing';
        }
        
        return 'General'; // Default
    }
    
    /**
     * Extract grading criteria from query text
     * Looks for specific rubric or criteria mentions
     */
    private extractGradingCriteria(query: string): string | undefined {
        const patterns = [
            /criteria:\s*([^.]+)/i,
            /rubric:\s*([^.]+)/i,
            /grade\s+(?:based\s+on|for):\s*([^.]+)/i
        ];
        
        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        
        return undefined; // Will use default rubric
    }
    
    /**
     * Extract questions from quiz response for saving to history
     * Parses the markdown response to extract question objects
     */
    private extractQuestionsFromResponse(response: string): any[] {
        const questions: any[] = [];
        
        try {
            // Simple regex-based extraction
            // Match questions like "**1. Question text?** [2 marks]"
            const questionPattern = /\*\*(\d+)\.\s+(.+?)\?\*\*\s*\[(\d+)\s*marks?\]\s*\*?\(?(Remember|Understand|Apply|Analyze|Evaluate|Create)?\)?/gi;
            
            let match;
            while ((match = questionPattern.exec(response)) !== null) {
                const [, number, questionText, marks, bloomLevel] = match;
                
                // Determine question type based on context
                let type = 'MCQ';
                if (response.substring(match.index - 200, match.index).includes('Short Answer')) {
                    type = 'Short Answer';
                } else if (response.substring(match.index - 200, match.index).includes('Essay')) {
                    type = 'Essay';
                }
                
                questions.push({
                    question: questionText.trim() + '?',
                    type,
                    bloomLevel: bloomLevel || 'Remember',
                    marks: parseInt(marks) || 2
                });
            }
            
            this.logger.log(`Extracted ${questions.length} questions from response`);
        } catch (error) {
            this.logger.error(`Error extracting questions: ${error.message}`);
        }
        
        return questions;
    }

    /**
     * Format student analytics into a readable string for AI context
     */
    private formatStudentAnalytics(stats: any, performance: any[], strengthsWeaknesses: any): string {
        if (!stats) return '';
        let context = 'STUDENT PERFORMANCE ANALYTICS:\n';
        context += `- Overall Percentage: ${stats.overallPercentage}%\n`;
        context += `- Best Subject: ${stats.bestSubject}\n`;
        context += `- Total Tests Taken: ${stats.totalTests}\n`;
        context += `- Attendance: ${stats.attendancePercentage}%\n\n`;

        context += 'SUBJECT PERFORMANCE:\n';
        performance.forEach(p => {
            context += `- ${p.subject}: ${p.percentage}%\n`;
        });
        context += '\n';

        context += 'STRENGTHS:\n';
        if (strengthsWeaknesses.strengths?.length > 0) {
            strengthsWeaknesses.strengths.forEach(s => {
                context += `- ${s.topic} (${s.subject}): ${s.desc}\n`;
            });
        } else {
            context += '- No specific strengths identified yet.\n';
        }
        context += '\n';

        context += 'WEAKNESSES:\n';
        if (strengthsWeaknesses.weaknesses?.length > 0) {
            strengthsWeaknesses.weaknesses.forEach(w => {
                context += `- ${w.topic} (${w.subject}): ${w.desc}\n`;
            });
        } else {
            context += '- No specific weaknesses identified yet.\n';
        }

        return context + '\n';
    }

    /**
     * Format class analytics into a readable string for AI context
     */
    private formatClassAnalytics(subjectAverages: any[], chapterTopic: any): string {
        if (!subjectAverages || !chapterTopic) return '';
        let context = 'CLASS-WIDE ANALYTICS:\n';
        
        context += 'SUBJECT AVERAGES (CLASS):\n';
        subjectAverages.forEach(s => {
            context += `- ${s.subject}: ${s.avg}%\n`;
        });
        context += '\n';

        context += 'CLASS TOPIC MASTERY:\n';
        if (chapterTopic.topics?.length > 0) {
            // Include top 3 and bottom 3 topics
            const sortedTopics = [...chapterTopic.topics].sort((a, b) => b.mastery - a.mastery);
            context += 'Strongest Topics:\n';
            sortedTopics.slice(0, 3).forEach(t => {
                context += `- ${t.name}: ${t.mastery}%\n`;
            });
            context += 'Topics Needing Attention:\n';
            sortedTopics.slice(-3).forEach(t => {
                context += `- ${t.name}: ${t.mastery}%\n`;
            });
        } else {
            context += '- No topic mastery data available for the class.\n';
        }

        return context + '\n';
    }
}
