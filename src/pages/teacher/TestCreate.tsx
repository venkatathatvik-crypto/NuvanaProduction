import { useNavigate, useSearchParams } from "react-router-dom";
import { TestForm } from "@/components/mcq/TestForm";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { createTeacherTest, getGradeSubjectIdBySubjectName, getExamTypeIdByName } from "@/services/academic";

const TestCreate = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const defaultType = searchParams.get("type");
    const { profile } = useAuth();

    const handleSubmit = async (data: {
        title: string;
        description?: string;
        durationMinutes: number;
        isPublished: boolean;
        classId: string;
        subject: string;
        examType: string;
        dueDate?: string;
        questions: Array<{
            text: string;
            questionType?: string;
            options?: string[];
            correctOptionIndex?: number;
            expectedAnswerText?: string;
            marks: number;
            chapter: string;
            topic: string;
        }>;
    }) => {
        if (!profile) {
            toast.error("Please login to create tests");
            return;
        }

        try {
            // Convert subject name to grade_subject_id
            // getGradeSubjectIdBySubjectName already handles object extraction and returns string | null
            const gradeSubjectId = await getGradeSubjectIdBySubjectName(data.classId, data.subject);
            console.log('[TestCreate] gradeSubjectId received:', gradeSubjectId, 'type:', typeof gradeSubjectId);
            
            // Validate it's a non-empty string
            if (!gradeSubjectId || typeof gradeSubjectId !== 'string' || gradeSubjectId.trim() === '') {
                console.error('[TestCreate] Invalid gradeSubjectId:', gradeSubjectId);
                toast.error("Failed to find subject. Please try again.");
                return;
            }
            
            // Validate it's a valid UUID format
            if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gradeSubjectId)) {
                console.error('[TestCreate] Invalid UUID format for gradeSubjectId:', gradeSubjectId);
                toast.error("Invalid subject ID format. Please try again.");
                return;
            }
            
            console.log('[TestCreate] Final gradeSubjectId:', gradeSubjectId, 'type:', typeof gradeSubjectId);

            // Convert exam type name to exam_type_id
            const examTypeId = await getExamTypeIdByName(data.examType);
            console.log('[TestCreate] examTypeId received:', examTypeId, 'type:', typeof examTypeId);
            if (!examTypeId) {
                toast.error(`Failed to find exam type '${data.examType}'. Please ensure it exists in the database.`);
                return;
            }

            // Transform questions to match service format
            if (!data.questions || data.questions.length === 0) {
                toast.error("Please add at least one question");
                return;
            }

            const questions = data.questions.map((q) => ({
                text: q.text,
                questionType: q.questionType || "MCQ",
                options: q.questionType === "MCQ" ? (q.options || []) : undefined,
                correctOptionIndex: q.questionType === "MCQ" ? q.correctOptionIndex : undefined,
                expectedAnswerText: q.expectedAnswerText,
                marks: q.marks,
                chapter: q.chapter,
                topic: q.topic,
            }));

            // Normalize dueDate to proper ISO-8601 format if provided
            let normalizedDueDate: string | undefined = undefined;
            if (data.dueDate && data.dueDate.trim()) {
                try {
                    let dateString = data.dueDate.trim();
                    // Check if it's missing seconds (format: YYYY-MM-DDTHH:MM)
                    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateString)) {
                        // Add seconds and timezone
                        dateString = `${dateString}:00.000Z`;
                    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateString)) {
                        // Has seconds but no timezone, add timezone
                        dateString = `${dateString}.000Z`;
                    }
                    // Validate the date is valid
                    const testDate = new Date(dateString);
                    if (isNaN(testDate.getTime())) {
                        console.warn('[TestCreate] Invalid dueDate format, ignoring:', data.dueDate);
                        normalizedDueDate = undefined;
                    } else {
                        normalizedDueDate = dateString;
                    }
                } catch (error) {
                    console.warn('[TestCreate] Error normalizing dueDate, ignoring:', error);
                    normalizedDueDate = undefined;
                }
            }

            const testData = {
                title: data.title,
                description: data.description,
                durationMinutes: data.durationMinutes,
                isPublished: data.isPublished,
                classId: data.classId,
                gradeSubjectId: gradeSubjectId,
                examTypeId,
                teacherId: profile.id,
                schoolId: profile.school_id || '',
                dueDate: normalizedDueDate,
                questions: questions.map(q => ({
                    ...q,
                    questionType: (q.questionType || "MCQ") as "MCQ" | "Essay" | "Short Answer" | "Very Short Answer",
                })),
            };
            
            console.log('[TestCreate] Sending test data to createTeacherTest:', {
                ...testData,
                questions: `[${questions.length} questions]`
            });
            console.log('[TestCreate] gradeSubjectId in testData:', testData.gradeSubjectId, 'type:', typeof testData.gradeSubjectId);
            console.log('[TestCreate] examTypeId in testData:', testData.examTypeId, 'type:', typeof testData.examTypeId);

            await createTeacherTest(testData);

            toast.success("Test created successfully");
            navigate("/teacher/tests");
        } catch (error: unknown) {
            console.error("Error creating test:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to create test";
            toast.error(errorMessage);
        }
    };

    return (
        <div className="min-h-screen p-3 sm:p-6 space-y-4 sm:space-y-8">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/teacher")}
                    className="mb-2 sm:mb-4 shrink-0"
                >
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
                <h1 className="text-2xl sm:text-4xl font-bold neon-text mb-1 sm:mb-2">
                    {defaultType === "Assignment" ? "Create New Assignment" : "Create New Test"}
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base mb-4 sm:mb-8">
                    {defaultType === "Assignment" ? "Design your assignment and set marks" : "Design your assessment"}
                </p>

                <TestForm onSubmit={handleSubmit} defaultExamType={defaultType || undefined} />
            </motion.div>
        </div>
    );
};

export default TestCreate;
