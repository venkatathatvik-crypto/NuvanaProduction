import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { $Enums } from '../../generated/prisma/client';
import {
  CreateTestDto,
  UpdateTestDto,
  SubmitTestDto,
  GradeSubmissionDto,
  QuestionType,
  CreateTestFromAiGradingDto,
} from './dto';

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  /**
   * Map DTO question type to Prisma enum value
   * Frontend now sends enum keys like "Short_Answer" which we can use directly
   * Prisma expects the enum KEY, not the mapped database value
   */
  private mapQuestionTypeToPrismaEnum(questionType: string | QuestionType): $Enums.question_type_enum {
    // Handle both string values and enum values
    const typeStr = typeof questionType === 'string' ? questionType : questionType;
    
    console.log(`[TestService] Mapping question type: "${typeStr}"`);
    
    // Map to Prisma enum keys
    // Frontend should send enum keys: MCQ, Essay, Short_Answer, Very_Short_Answer
    // But we also handle display values for backward compatibility
    let enumKey: keyof typeof $Enums.question_type_enum;
    
    if (typeStr === 'MCQ' || typeStr === QuestionType.MCQ) {
      enumKey = 'MCQ';
    } else if (typeStr === 'Essay' || typeStr === QuestionType.Essay) {
      enumKey = 'Essay';
    } else if (typeStr === 'Short_Answer' || typeStr === 'Short Answer' || typeStr === QuestionType.Short_Answer) {
      enumKey = 'Short_Answer';
    } else if (typeStr === 'Very_Short_Answer' || typeStr === 'Very Short Answer' || typeStr === QuestionType.Very_Short_Answer) {
      enumKey = 'Very_Short_Answer';
    } else {
      console.error(`[TestService] Invalid question type received: "${typeStr}" (type: ${typeof typeStr})`);
      throw new BadRequestException(`Invalid question type: ${typeStr}. Expected one of: MCQ, Essay, Short_Answer, Very_Short_Answer`);
    }
    
    // Use the enum key directly - Prisma will handle the mapping to DB value
    const enumValue = $Enums.question_type_enum[enumKey];
    console.log(`[TestService] Mapped "${typeStr}" -> enum key "${enumKey}" -> Prisma enum:`, enumValue);
    
    return enumValue;
  }

  // ==================== TEACHER OPERATIONS ====================

  async createTest(dto: CreateTestDto, schoolId: string) {
    const { questions, due_date, ...testData } = dto;

    // Normalize due_date to proper ISO-8601 format if provided
    let normalizedDueDate: Date | undefined = undefined;
    if (due_date) {
      try {
        // If the date string is incomplete (missing seconds/timezone), fix it
        let dateString = due_date.trim();
        // Check if it's missing seconds (format: YYYY-MM-DDTHH:MM)
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateString)) {
          // Add seconds and timezone
          dateString = `${dateString}:00.000Z`;
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateString)) {
          // Has seconds but no timezone, add timezone
          dateString = `${dateString}.000Z`;
        }
        normalizedDueDate = new Date(dateString);
        // Validate the date is valid
        if (isNaN(normalizedDueDate.getTime())) {
          throw new Error(`Invalid date format: ${due_date}`);
        }
      } catch (error) {
        throw new Error(`Invalid due_date format: ${due_date}. Expected ISO-8601 DateTime string.`);
      }
    }

    // Create test with questions and options in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the test
      const test = await tx.tests.create({
        data: {
          ...testData,
          due_date: normalizedDueDate,
          school_id: schoolId,
        },
      });

      // Create questions and options
      for (const questionDto of questions) {
        const { options, question_type, ...questionData } = questionDto;
        
        console.log(`[TestService] Received question_type: "${question_type}" (type: ${typeof question_type})`);
        
        // Map question type to Prisma enum key string
        // Frontend sends enum keys like "Short_Answer" which we use directly
        // Prisma enum keys: MCQ, Essay, Short_Answer, Very_Short_Answer
        // Convert to string first to avoid TypeScript narrowing issues
        const typeStr = String(question_type);
        let enumKey: 'MCQ' | 'Essay' | 'Short_Answer' | 'Very_Short_Answer';
        
        if (typeStr === 'MCQ' || typeStr === QuestionType.MCQ) {
          enumKey = 'MCQ';
        } else if (typeStr === 'Essay' || typeStr === QuestionType.Essay) {
          enumKey = 'Essay';
        } else if (typeStr === 'Short_Answer' || typeStr === QuestionType.Short_Answer || typeStr === 'Short Answer') {
          enumKey = 'Short_Answer';
        } else if (typeStr === 'Very_Short_Answer' || typeStr === QuestionType.Very_Short_Answer || typeStr === 'Very Short Answer') {
          enumKey = 'Very_Short_Answer';
        } else {
          throw new BadRequestException(`Invalid question type: ${question_type}`);
        }
        
        // Use the enum key string directly - Prisma with @map accepts the enum key
        // The enum key "Short_Answer" will be automatically mapped to "Short Answer" in DB
        // We cast it to the enum type for TypeScript, but at runtime it's the enum key string
        const prismaEnumValue = enumKey as $Enums.question_type_enum;
        
        console.log(`[TestService] Mapped "${question_type}" -> enum key "${enumKey}"`);
        console.log(`[TestService] Using enum key as Prisma enum:`, prismaEnumValue);
        
        // Explicitly construct data object
        const questionCreateData = {
          question_text: questionData.question_text,
          marks: questionData.marks,
          chapter: questionData.chapter ?? null,
          topic: questionData.topic ?? null,
          question_type: prismaEnumValue, // Enum key string cast to enum type
          correct_option_index: questionData.correct_option_index ?? null,
          expected_answer_text: questionData.expected_answer_text ?? null,
          test_id: test.id,
        };
        
        console.log(`[TestService] Creating question with type:`, questionCreateData.question_type);
        
        const question = await tx.questions.create({
          data: questionCreateData,
        });

        // Create options for MCQ questions
        if (enumKey === 'MCQ' && options && options.length > 0) {
          const optionsData = options.map((text, index) => ({
            question_id: question.id,
            option_index: index,
            option_text: text,
          }));

          await tx.question_options.createMany({
            data: optionsData,
          });
        }
      }

      return test;
    }, {
      timeout: 30000, // 30 seconds timeout for large transactions
    });

    // Fetch complete test with relations
    return this.getTeacherTest(result.id, dto.teacher_id, schoolId);
  }

  async getTeacherTests(teacherId: string, schoolId: string) {
    const tests = await this.prisma.tests.findMany({
      where: {
        teacher_id: teacherId,
        school_id: schoolId,
      },
      include: {
        classes: {
          select: { name: true },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
        exam_types: {
          select: { name: true, type: true },
        },
        questions: {
          select: { id: true, marks: true },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return tests.map((test) => {
      // Map exam type enum to readable format
      // Handle both enum key (Internal_Assessment) and mapped DB value ("Internal Assessment")
      const examTypeValue = String(test.exam_types.type);
      const examTypeCategory = examTypeValue.includes('Internal') || examTypeValue === 'Internal_Assessment'
        ? 'Internal Assessment' 
        : 'School Exam';
      
      return {
        id: test.id,
        title: test.title,
        description: test.description,
        duration_minutes: test.duration_minutes,
        is_published: test.is_published,
        class_id: test.class_id,
        class_name: test.classes.name,
        grade_subject_id: test.grade_subject_id,
        subject_name: test.grade_subjects.subjects_master.name,
        exam_type_id: test.exam_type_id,
        exam_type_name: test.exam_types.name,
        exam_type_category: examTypeCategory,
        teacher_id: test.teacher_id,
        created_at: test.created_at,
        due_date: test.due_date,
        question_count: test.questions.length,
        total_marks: test.questions.reduce((sum, q) => sum + q.marks, 0),
      };
    });
  }

  async getTeacherTest(testId: string, teacherId: string, schoolId: string) {
    const test = await this.prisma.tests.findFirst({
      where: {
        id: testId,
        teacher_id: teacherId,
        school_id: schoolId,
      },
      include: {
        classes: {
          select: { name: true },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: { name: true },
            },
          },
        },
        exam_types: {
          select: { name: true },
        },
        questions: {
          include: {
            question_options: {
              orderBy: {
                option_index: 'asc',
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    return {
      id: test.id,
      title: test.title,
      description: test.description,
      duration_minutes: test.duration_minutes,
      is_published: test.is_published,
      class_id: test.class_id,
      class_name: test.classes.name,
      grade_subject_id: test.grade_subject_id,
      subject_name: test.grade_subjects.subjects_master.name,
      exam_type_id: test.exam_type_id,
      exam_type_name: test.exam_types.name,
      teacher_id: test.teacher_id,
      created_at: test.created_at,
      due_date: test.due_date,
      questions: test.questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        marks: q.marks,
        chapter: q.chapter,
        topic: q.topic,
        question_type: q.question_type,
        correct_option_index: q.correct_option_index,
        expected_answer_text: q.expected_answer_text,
        options: q.question_options.map((opt) => opt.option_text),
      })),
    };
  }

  async updateTest(
    testId: string,
    dto: UpdateTestDto,
    teacherId: string,
    schoolId: string,
  ) {
    // Verify ownership
    const existing = await this.prisma.tests.findFirst({
      where: {
        id: testId,
        teacher_id: teacherId,
        school_id: schoolId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Test not found');
    }

    const { questions, ...testData } = dto;

    // Update test with questions in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update test metadata
      await tx.tests.update({
        where: { id: testId },
        data: testData,
      });

      // Update questions if provided
      if (questions && questions.length > 0) {
        // Get existing questions for this test
        const existingQuestions = await tx.questions.findMany({
          where: { test_id: testId },
          select: { id: true },
        });
        const existingQuestionIds = new Set(existingQuestions.map(q => q.id));

        // Track which questions are being updated/created
        const updatedQuestionIds = new Set<string>();

        // Process each question from the update
        for (const questionDto of questions) {
          const { options, id, question_type, ...questionData } = questionDto;
          
          // Map question_type to Prisma enum
          const prismaQuestionType = this.mapQuestionTypeToPrismaEnum(question_type);
          
          if (id && existingQuestionIds.has(id)) {
            // Update existing question
            await tx.questions.update({
              where: { id },
              data: {
                ...questionData,
                question_type: prismaQuestionType,
              },
            });

            // Update options for MCQ questions
            if (prismaQuestionType === $Enums.question_type_enum.MCQ && options && options.length > 0) {
              // Delete existing options
              await tx.question_options.deleteMany({
                where: { question_id: id },
              });

              // Create new options
              const optionsData = options.map((text, index) => ({
                question_id: id,
                option_index: index,
                option_text: text,
              }));

              await tx.question_options.createMany({
                data: optionsData,
              });
            } else {
              // Delete options if question type changed from MCQ
              await tx.question_options.deleteMany({
                where: { question_id: id },
              });
            }

            updatedQuestionIds.add(id);
          } else {
            // Create new question
            const question = await tx.questions.create({
              data: {
                ...questionData,
                question_type: prismaQuestionType,
                test_id: testId,
              },
            });

            // Create options for MCQ questions
            if (prismaQuestionType === $Enums.question_type_enum.MCQ && options && options.length > 0) {
              const optionsData = options.map((text, index) => ({
                question_id: question.id,
                option_index: index,
                option_text: text,
              }));

              await tx.question_options.createMany({
                data: optionsData,
              });
            }
          }
        }

        // Delete questions that were removed (exist in DB but not in update)
        const questionsToDelete = Array.from(existingQuestionIds).filter(
          id => !updatedQuestionIds.has(id)
        );
        
        if (questionsToDelete.length > 0) {
          await tx.questions.deleteMany({
            where: {
              id: { in: questionsToDelete },
              test_id: testId,
            },
          });
        }
      }

      return testId;
    }, {
      timeout: 30000, // 30 seconds timeout for large transactions
    });

    return this.getTeacherTest(result, teacherId, schoolId);
  }

  async publishTest(
    testId: string,
    teacherId: string,
    schoolId: string,
    isPublished: boolean,
  ) {
    const test = await this.prisma.tests.findFirst({
      where: {
        id: testId,
        teacher_id: teacherId,
        school_id: schoolId,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    await this.prisma.tests.update({
      where: { id: testId },
      data: { is_published: isPublished },
    });

    return { message: `Test ${isPublished ? 'published' : 'unpublished'} successfully` };
  }

  async deleteTest(testId: string, teacherId: string, schoolId: string) {
    const test = await this.prisma.tests.findFirst({
      where: {
        id: testId,
        teacher_id: teacherId,
        school_id: schoolId,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    await this.prisma.tests.delete({
      where: { id: testId },
    });

    return { message: 'Test deleted successfully' };
  }

  async getTestSubmissions(testId: string, teacherId: string, schoolId: string) {
    // Verify ownership
    const test = await this.prisma.tests.findFirst({
      where: {
        id: testId,
        teacher_id: teacherId,
        school_id: schoolId,
      },
      include: {
        questions: {
          include: {
            question_options: {
              orderBy: {
                option_index: 'asc',
              },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        test_id: testId,
      },
      include: {
        profiles: {
          select: {
            id: true,
            name: true,
            email: true,
            student_details: {
              select: {
                roll_number: true,
              },
            },
          },
        },
        student_answers: {
          include: {
            questions: {
              include: {
                question_options: {
                  orderBy: {
                    option_index: 'asc',
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        submitted_at: 'asc',
      },
    });

    // Return detailed submission data for grading
    return submissions.map((sub) => {
      const answers = test.questions.map((q) => {
        const answer = sub.student_answers.find((a) => a.question_id === q.id);
        const isMCQ = q.question_type === 'MCQ';

        return {
          answer_id: answer?.id || '',
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          question_marks: q.marks,
          chapter: q.chapter,
          topic: q.topic,
          expected_answer_text: q.expected_answer_text,
          options: isMCQ ? q.question_options.map((opt) => opt.option_text) : [],
          selected_option_index: isMCQ ? (answer?.student_selected_option_index ?? null) : null,
          correct_option_index: isMCQ ? q.correct_option_index : null,
          subjective_answer_text: !isMCQ ? (answer?.subjective_answer_text || undefined) : undefined,
          marks_awarded: answer?.marks_awarded ?? 0,
        };
      });

      return {
        submission_id: sub.id,
        student_id: sub.student_id,
        student_name: sub.profiles.name,
        student_email: sub.profiles.email,
        student_roll_no: sub.profiles.student_details?.roll_number || '',
        submitted_at: sub.submitted_at,
        is_graded: sub.is_graded,
        total_marks_obtained: sub.total_marks_obtained ?? 0,
        answers,
      };
    });
  }

  async getTeacherGradingQueue(teacherId: string, schoolId: string) {
    // Get all published tests created by this teacher
    const tests = await this.prisma.tests.findMany({
      where: {
        teacher_id: teacherId,
        school_id: schoolId,
        is_published: true,
      },
      include: {
        classes: {
          select: {
            name: true,
          },
        },
        grade_subjects: {
          include: {
            subjects_master: {
              select: {
                name: true,
              },
            },
          },
        },
        exam_types: {
          select: {
            name: true,
          },
        },
        test_submissions: {
          select: {
            id: true,
            is_graded: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Filter tests with submissions and calculate counts
    return tests
      .filter((test) => test.test_submissions.length > 0)
      .map((test) => {
        const totalSubmissions = test.test_submissions.length;
        const gradedCount = test.test_submissions.filter((s) => s.is_graded).length;
        const pendingCount = totalSubmissions - gradedCount;

        return {
          test_id: test.id,
          test_title: test.title,
          class_name: test.classes.name,
          subject_name: test.grade_subjects.subjects_master.name,
          exam_type_name: test.exam_types.name,
          total_submissions: totalSubmissions,
          graded_count: gradedCount,
          pending_count: pendingCount,
          created_at: test.created_at,
        };
      });
  }

  async gradeSubmission(dto: GradeSubmissionDto, teacherId: string, schoolId: string) {
    // Verify the submission belongs to a test owned by this teacher
    const submission = await this.prisma.test_submissions.findFirst({
      where: {
        id: dto.submission_id,
        tests: {
          teacher_id: teacherId,
          school_id: schoolId,
        },
      },
      include: {
        student_answers: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Grade individual answers and calculate total
    let totalMarks = 0;
    
    await this.prisma.$transaction(async (tx) => {
      for (const answerGrade of dto.answers) {
        // Verify the answer belongs to this submission
        const answer = submission.student_answers.find(
          (a) => a.id === answerGrade.answer_id
        );

        if (!answer) {
          throw new BadRequestException(
            `Answer ${answerGrade.answer_id} does not belong to this submission`
          );
        }

        // Update the answer with marks
        await tx.student_answers.update({
          where: { id: answerGrade.answer_id },
          data: {
            marks_awarded: answerGrade.marks_awarded,
          },
        });

        totalMarks += answerGrade.marks_awarded;
      }

      // Update submission with total marks and mark as graded
      await tx.test_submissions.update({
        where: { id: dto.submission_id },
        data: {
          total_marks_obtained: dto.total_marks_obtained ?? totalMarks,
          is_graded: true,
        },
      });
    }, {
      timeout: 30000, // 30 seconds timeout for large transactions
    });

    return { message: 'Submission graded successfully' };
  }

  // ==================== STUDENT OPERATIONS ====================

  async getStudentTests(classId: string, studentId: string, schoolId: string) {
    const tests = await this.prisma.tests.findMany({
      where: {
        class_id: classId,
        is_published: true,
        school_id: schoolId,
      },
      include: {
        grade_subjects: {
          include: {
            subjects_master: true,
          },
        },
        exam_types: true,
        questions: {
          select: {
            marks: true,
          },
        },
        test_submissions: {
          where: {
            student_id: studentId,
          },
          select: {
            id: true,
            submitted_at: true,
            is_graded: true,
            total_marks_obtained: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return tests.map((test) => {
      const submission = test.test_submissions[0];
      const totalMarks = test.questions.reduce((sum, q) => sum + q.marks, 0);

      // Map exam type enum to readable format
      // Handle both enum key (Internal_Assessment) and mapped DB value ("Internal Assessment")
      const examTypeValue = String(test.exam_types.type);
      const examTypeCategory = examTypeValue.includes('Internal') || examTypeValue === 'Internal_Assessment'
        ? 'Internal Assessment' 
        : 'School Exam';

      return {
        id: test.id,
        title: test.title,
        description: test.description,
        duration_minutes: test.duration_minutes,
        class_id: test.class_id,
        subject_name: test.grade_subjects.subjects_master.name,
        exam_type_id: test.exam_type_id,
        exam_type_name: test.exam_types.name,
        exam_type_category: examTypeCategory,
        created_at: test.created_at,
        due_date: test.due_date,
        question_count: test.questions.length,
        total_marks: totalMarks,
        submission_status: submission
          ? submission.is_graded
            ? 'graded'
            : 'pending'
          : 'not_started',
        submission_id: submission?.id,
        submitted_at: submission?.submitted_at,
        marks_obtained: submission?.total_marks_obtained,
      };
    });
  }

  async getStudentTest(testId: string, studentId: string, schoolId: string) {
    // Verify student has access to this test
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        role_id: 4,
        school_id: schoolId,
      },
      include: {
        student_details: true,
      },
    });

    if (!student || !student.student_details?.class_id) {
      throw new BadRequestException('Student not found or not assigned to a class');
    }

    const test = await this.prisma.tests.findFirst({
      where: {
        id: testId,
        class_id: student.student_details.class_id,
        is_published: true,
        school_id: schoolId,
      },
      include: {
        grade_subjects: {
          include: {
            subjects_master: true,
          },
        },
        questions: {
          include: {
            question_options: {
              orderBy: {
                option_index: 'asc',
              },
            },
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found or not published');
    }

    // Return test WITHOUT correct answers
    return {
      id: test.id,
      title: test.title,
      description: test.description,
      duration_minutes: test.duration_minutes,
      subject_name: test.grade_subjects.subjects_master.name,
      teacher_id: test.teacher_id,
      questions: test.questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        marks: q.marks,
        chapter: q.chapter,
        topic: q.topic,
        question_type: q.question_type,
        options: q.question_options.map((opt) => opt.option_text),
        // NO correct_option_index or expected_answer_text
      })),
    };
  }

  async submitTest(dto: SubmitTestDto, schoolId: string) {
    // Verify student access and test is published
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: dto.student_id,
        role_id: 4,
        school_id: schoolId,
      },
      include: {
        student_details: true,
      },
    });

    if (!student || !student.student_details?.class_id) {
      throw new BadRequestException('Student not found');
    }

    const test = await this.prisma.tests.findFirst({
      where: {
        id: dto.test_id,
        class_id: student.student_details.class_id,
        is_published: true,
        school_id: schoolId,
      },
      include: {
        questions: true,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if already submitted
    const existing = await this.prisma.test_submissions.findFirst({
      where: {
        test_id: dto.test_id,
        student_id: dto.student_id,
      },
    });

    if (existing) {
      throw new BadRequestException('Test already submitted');
    }

    // Create submission and answers in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.test_submissions.create({
        data: {
          test_id: dto.test_id,
          student_id: dto.student_id,
          is_graded: false,
        },
      });

      // Create student answers
      const answersData = dto.answers.map((ans) => {
        // Explicitly handle student_selected_option_index
        // 0 is a valid option index, so we need to check for undefined/null specifically
        // Check if the value is explicitly provided (including 0)
        let selectedOptionIndex: number | null = null;
        if (ans.student_selected_option_index !== undefined && ans.student_selected_option_index !== null) {
          selectedOptionIndex = Number(ans.student_selected_option_index);
        }
        
        // Debug logging
        console.log('[submitTest] Processing answer:', {
          question_id: ans.question_id,
          raw_value: ans.student_selected_option_index,
          processed_value: selectedOptionIndex,
          type: typeof ans.student_selected_option_index,
          isNumber: typeof ans.student_selected_option_index === 'number',
        });
        
        // Always include student_selected_option_index in the object (even if null)
        // This ensures Prisma will insert the field
        return {
          submission_id: submission.id,
          question_id: ans.question_id,
          student_selected_option_index: selectedOptionIndex, // Explicitly set to null or number
          subjective_answer_text: ans.subjective_answer_text || null,
          marks_awarded: null,
        };
      });

      console.log('[submitTest] Answers data to insert:', JSON.stringify(answersData, null, 2));

      await tx.student_answers.createMany({
        data: answersData,
      });

      // Auto-grade MCQ questions
      let totalMarks = 0;
      for (const answer of dto.answers) {
        const question = test.questions.find((q) => q.id === answer.question_id);
        
        if (question && question.question_type === 'MCQ' && question.correct_option_index !== null) {
          // Handle null/undefined - if student didn't answer, they got it wrong
          // But preserve 0 as a valid option index
          const studentAnswer = answer.student_selected_option_index ?? null;
          const isCorrect = studentAnswer !== null && studentAnswer === question.correct_option_index;
          const marksAwarded = isCorrect ? question.marks : 0;
          
          await tx.student_answers.updateMany({
            where: {
              submission_id: submission.id,
              question_id: answer.question_id,
            },
            data: {
              marks_awarded: marksAwarded,
            },
          });

          totalMarks += marksAwarded;
        }
      }

      // Calculate total marks for MCQ questions (auto-graded)
      // But don't set is_graded to true - teacher must review and finalize grading
      // This ensures students only see results after teacher has reviewed them
      const allMCQ = test.questions.every((q) => q.question_type === 'MCQ');
      if (allMCQ) {
        // Store the auto-calculated marks, but keep is_graded as false
        // Teacher will finalize grading which will set is_graded to true
        await tx.test_submissions.update({
          where: { id: submission.id },
          data: {
            total_marks_obtained: totalMarks,
            // Keep is_graded as false - teacher must review and finalize
          },
        });
      }

      return submission;
    }, {
      timeout: 30000, // 30 seconds timeout for large transactions
    });

    return {
      message: 'Test submitted successfully',
      submission_id: result.id,
    };
  }

  async getStudentSubmission(submissionId: string, studentId: string, schoolId: string) {
    const submission = await this.prisma.test_submissions.findFirst({
      where: {
        id: submissionId,
        student_id: studentId,
        tests: {
          school_id: schoolId,
        },
      },
      include: {
        tests: {
          include: {
            grade_subjects: {
              include: {
                subjects_master: true,
              },
            },
          },
        },
        student_answers: {
          include: {
            questions: {
              include: {
                question_options: {
                  orderBy: {
                    option_index: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return {
      id: submission.id,
      test_title: submission.tests.title,
      subject_name: submission.tests.grade_subjects.subjects_master.name,
      submitted_at: submission.submitted_at,
      is_graded: submission.is_graded,
      total_marks_obtained: submission.total_marks_obtained,
      answers: submission.student_answers.map((ans) => ({
        question_id: ans.question_id,
        question_text: ans.questions.question_text,
        question_type: ans.questions.question_type,
        marks: ans.questions.marks,
        student_selected_option_index: ans.student_selected_option_index,
        subjective_answer_text: ans.subjective_answer_text,
        marks_awarded: ans.marks_awarded,
        correct_option_index: submission.is_graded ? ans.questions.correct_option_index : null,
        expected_answer_text: submission.is_graded ? ans.questions.expected_answer_text : null,
        options: ans.questions.question_options.map((opt) => opt.option_text),
      })),
    };
  }

  async getStudentGradedTests(studentId: string, schoolId: string) {
    // Verify student belongs to school
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        role_id: 4,
        school_id: schoolId,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Get all graded submissions for this student
    const submissions = await this.prisma.test_submissions.findMany({
      where: {
        student_id: studentId,
        is_graded: true,
      },
      include: {
        tests: {
          include: {
            grade_subjects: {
              include: {
                subjects_master: true,
              },
            },
            exam_types: true,
            questions: {
              select: {
                marks: true,
              },
            },
          },
        },
      },
      orderBy: {
        submitted_at: 'desc',
      },
    });

    return submissions.map((sub) => {
      const test = sub.tests;
      const totalMarks = test.questions.reduce((sum, q) => sum + q.marks, 0);
      const marksObtained = sub.total_marks_obtained ?? 0;
      const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0;

      return {
        id: sub.id,
        testId: test.id,
        testTitle: test.title,
        subjectName: test.grade_subjects.subjects_master.name,
        examTypeName: test.exam_types.name,
        submittedAt: sub.submitted_at,
        totalMarks,
        marksObtained,
        percentage,
      };
    });
  }

  async getSubmissionByTestAndStudent(testId: string, studentId: string, schoolId: string) {
    // Verify student belongs to school
    const student = await this.prisma.profiles.findFirst({
      where: {
        id: studentId,
        role_id: 4,
        school_id: schoolId,
      },
      include: {
        student_details: true,
      },
    });

    if (!student || !student.student_details?.class_id) {
      throw new NotFoundException('Student not found');
    }

    // Verify test belongs to student's class
    const test = await this.prisma.tests.findFirst({
      where: {
        id: testId,
        class_id: student.student_details.class_id,
        school_id: schoolId,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Get submission
    const submission = await this.prisma.test_submissions.findFirst({
      where: {
        test_id: testId,
        student_id: studentId,
      },
      include: {
        student_answers: {
          include: {
            questions: {
              include: {
                question_options: {
                  orderBy: {
                    option_index: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return {
      id: submission.id,
      test_id: submission.test_id,
      student_id: submission.student_id,
      submitted_at: submission.submitted_at,
      is_graded: submission.is_graded,
      total_marks_obtained: submission.total_marks_obtained,
      answers: submission.student_answers.map((ans) => ({
        question_id: ans.question_id,
        question_text: ans.questions.question_text,
        question_type: ans.questions.question_type,
        marks: ans.questions.marks,
        student_selected_option_index: ans.student_selected_option_index,
        subjective_answer_text: ans.subjective_answer_text,
        marks_awarded: ans.marks_awarded,
        correct_option_index: submission.is_graded ? ans.questions.correct_option_index : null,
        expected_answer_text: submission.is_graded ? ans.questions.expected_answer_text : null,
        options: ans.questions.question_options.map((opt) => opt.option_text),
      })),
    };
  }

  // ==================== AI GRADING OPERATIONS ====================

  async createFromAiGrading(dto: CreateTestFromAiGradingDto) {
    // Default exam type ID for AI graded assignments (typically 1 for Internal Assessment)
    const examTypeId = dto.exam_type_id || 1;

    // Parse test date or use today
    const testDate = dto.test_date ? new Date(dto.test_date) : new Date();

    // Find grade_subject_id based on subject name and class
    const gradeSubject = await this.prisma.grade_subjects.findFirst({
      where: {
        grade_levels: {
          classes: {
            some: {
              id: dto.class_id,
            },
          },
        },
        subjects_master: {
          name: dto.subject,
        },
      },
    });

    if (!gradeSubject) {
      throw new BadRequestException(`Subject "${dto.subject}" not found for this class`);
    }

    // Create test and submission in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create test with single essay question
      const test = await tx.tests.create({
        data: {
          title: dto.test_name,
          description: `AI Graded Assignment - ${dto.subject}`,
          duration_minutes: 0, // Not applicable for AI graded
          is_published: true,
          class_id: dto.class_id,
          grade_subject_id: gradeSubject.id,
          exam_type_id: examTypeId,
          teacher_id: dto.teacher_id,
          school_id: dto.school_id,
          due_date: testDate,
        },
      });

      // 2. Create a single essay question to hold the marks
      const question = await tx.questions.create({
        data: {
          question_text: 'AI Graded Submission',
          marks: dto.total_marks,
          question_type: $Enums.question_type_enum.Essay,
          test_id: test.id,
        },
      });

      // 3. Create submission for the student
      const submission = await tx.test_submissions.create({
        data: {
          test_id: test.id,
          student_id: dto.student_id,
          submitted_at: new Date(),
          is_graded: true,
          total_marks_obtained: dto.marks_obtained,
        },
      });

      // 4. Create answer with AI feedback
      await tx.student_answers.create({
        data: {
          submission_id: submission.id,
          question_id: question.id,
          subjective_answer_text: dto.ai_feedback,
          marks_awarded: dto.marks_obtained,
        },
      });

      return { test_id: test.id, submission_id: submission.id };
    }, {
      timeout: 30000,
    });

    return {
      success: true,
      test_id: result.test_id,
      submission_id: result.submission_id,
      message: 'AI grading saved successfully',
    };
  }
}
