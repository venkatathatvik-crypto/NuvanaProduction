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
import { MockTestPrompt } from './prompts/mocktest.prompt';
import { LifeSkillPrompt } from './prompts/lifeskill.prompt';
// Teacher-specific prompts
import { TeacherLessonPlanPrompt } from './prompts/teacher-lessonplan.prompt';
import { TeacherEmailPrompt } from './prompts/teacher-email.prompt';
import { TeacherQuizPrompt } from './prompts/teacher-quiz.prompt';
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

            // Create cache key from request parameters
            const cacheKey = `ai:${taskType}:${query.substring(0, 100)}:${subject || 'general'}:${classBand || 'middle'}`;
            
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

            // 0. Get Student's Class ID and Grade Level (for RAG filtering and class band)
            let studentClassId: string | undefined;
            let autoClassBand: string | undefined;
            
            if (studentId) {
                console.log(`[AI Service] Step 0: Getting student's class and grade information...`);
                try {
                    const student = await this.prisma.profiles.findFirst({
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

                    if (student?.student_details?.class_id) {
                        studentClassId = student.student_details.class_id;
                        console.log(`[AI Service] ✓ Student class_id: ${studentClassId}`);
                        
                        // Get grade level name to determine class band
                        const gradeLevel = student.student_details.classes?.grade_levels;
                        if (gradeLevel?.name) {
                            console.log(`[AI Service] ✓ Student grade level: ${gradeLevel.name}`);
                            
                            // Auto-determine class band from grade level name
                            autoClassBand = this.determineClassBandFromGrade(gradeLevel.name);
                            console.log(`[AI Service] ✓ Auto-determined class band: ${autoClassBand} (from grade: ${gradeLevel.name})`);
                        } else {
                            console.log(`[AI Service] ⚠️ Grade level not found for student's class`);
                        }
                    } else {
                        console.log(`[AI Service] ⚠️ Student class_id not found (student may not be assigned to a class)`);
                    }
                } catch (error) {
                    console.error(`[AI Service] ❌ Error getting student class:`, error);
                    // Continue without class_id - RAG will work but less specific
                }
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

            // 1. Context Retrieval (RAG) - Filter by student's class
            console.log(`[AI Service] Step 1: Retrieving RAG context...`);
            let ragContext;
            try {
                ragContext = await this.ragService.retrieve(
                    query, 
                    subject || 'General', 
                    band,
                    studentClassId // Pass class_id for filtering
                );
                console.log(`[AI Service] RAG Context retrieved: ${ragContext ? `${ragContext.length} characters` : 'empty'}`);
            } catch (error) {
                console.error(`[AI Service] ❌ RAG Retrieval failed:`, error);
                console.warn('[AI Service] Proceeding without RAG context...');
                ragContext = null;
            }

            if (!ragContext || ragContext.trim() === '') {
                ragContext = '[NO RELEVANT CONTENT FOUND]';
                console.log(`[AI Service] ⚠️ No RAG context found - will inform AI to refuse`);
            } else {
                console.log(`[AI Service] ✓ RAG context available (${ragContext.length} chars)`);
            }

            // 2. Student Mastery
            console.log(`[AI Service] Step 2: Getting student mastery profile...`);
            let masteryProfile = 'Standard';
            let difficulty = 'Medium';
            if (studentId && subject) {
                try {
                const profile = await this.masteryService.getMasteryProfile(studentId, subject);
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
                } catch (error) {
                    console.error(`[AI Service] ❌ Error getting mastery profile:`, error);
                    // Continue with default values
                }
            } else {
                console.log(`[AI Service] ⚠️ Skipping mastery (studentId or subject missing)`);
            }

            // 3. Prompt Selection
            console.log(`[AI Service] Step 3: Selecting prompt template for task: ${taskType}...`);
            let userPrompt = '';
            
            // Check if user is a teacher
            const isTeacher = additionalContext?.role === 'teacher';

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
                        // Extract question count from query
                        const questionCount = this.extractQuestionCount(query);
                        const questionTypes = this.extractQuestionTypes(query);
                        const quizDifficulty = this.extractDifficulty(query) || difficulty;
                        
                        userPrompt = TeacherQuizPrompt(
                            dto.topic || query,
                            subject || 'General',
                            band,
                            questionCount,
                            questionTypes,
                            quizDifficulty,
                            ragContext // Pass RAG context for PDF-based questions
                        );
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
            
            // Combine system prompt and RAG context into single system message
            // (Gemini LangChain provider requires only one system message)
            const systemMessage = `${SYSTEM_ROOT_PROMPT}

RAG CONTEXT:
${ragContext}`;
            
            const rawContent = await this.llmProvider.generate([
                { role: 'system', content: systemMessage },
                { role: 'user', content: userPrompt }
            ]);
            const llmDuration = Date.now() - llmStartTime;
            console.log(`[AI Service] ✓ LLM response received (${llmDuration}ms, ${rawContent.length} chars)`);

            // 5. Parse Response
            console.log(`[AI Service] Step 5: Parsing LLM response...`);
            const parsedResponse = this.parseResponse(rawContent);
            console.log(`[AI Service] ✓ Response parsed successfully`);

            // Store in cache for future requests (1 hour TTL)
            try {
                await this.cacheManager.set(cacheKey, parsedResponse, 3600); // 1 hour in seconds
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
        const patterns = [
            new RegExp(`###\\s+${sectionName}\\s+([\\s\\S]*?)(?=###|$)`, 'i'),
            new RegExp(`##\\s+${sectionName}\\s+([\\s\\S]*?)(?=##|$)`, 'i'),
            new RegExp(`#\\s+${sectionName}\\s+([\\s\\S]*?)(?=#|$)`, 'i'),
            new RegExp(`\\*\\*${sectionName}\\*\\*\\s*:?\\s*([\\s\\S]*?)(?=\\*\\*|$)`, 'i'),
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
        const patterns = [
            /(\d+)\s*(?:questions?|q|mcq|quiz)/i,
            /(?:^|\s)(\d+)(?:\s|$)/  // Just a number
        ];
        
        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match) {
                const count = parseInt(match[1]);
                // Reasonable range check (5-100 questions)
                if (count >= 5 && count <= 100) {
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
        }
        
        if (lowerQuery.includes('mix') || lowerQuery.includes('variety') || lowerQuery.includes('different')) {
            return 'Mixed types';
        }
        
        return undefined; // Will default to mixed
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
}

