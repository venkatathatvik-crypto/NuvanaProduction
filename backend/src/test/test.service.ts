import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTestDto,
  UpdateTestDto,
  SubmitTestDto,
  GradeSubmissionDto,
} from './dto';

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  // ==================== TEACHER OPERATIONS ====================

  async createTest(dto: CreateTestDto, schoolId: string) {
    const { questions,  ...testData } = dto;

    // Create test with questions and options in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the test
      const test = await tx.tests.create({
        data: {
          ...testData,
          school_id: schoolId,
        },
      });

      // Create questions and options
      for (const questionDto of questions) {
        const { options, ...questionData } = questionDto;
        
        const question = await tx.questions.create({
          data: {
            ...questionData,
            test_id: test.id,
          },
        });

        // Create options for MCQ questions
        if (questionDto.question_type === 'MCQ' && options && options.length > 0) {
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
          select: { name: true },
        },
        questions: {
          select: { id: true, marks: true },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return tests.map((test) => ({
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
      question_count: test.questions.length,
      total_marks: test.questions.reduce((sum, q) => sum + q.marks, 0),
    }));
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

    // Update test metadata only (not questions)
    await this.prisma.tests.update({
      where: { id: testId },
      data: dto,
    });

    return this.getTeacherTest(testId, teacherId, schoolId);
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
            student_details: {
              select: {
                roll_number: true,
              },
            },
          },
        },
        student_answers: {
          include: {
            questions: true,
          },
        },
      },
      orderBy: {
        submitted_at: 'desc',
      },
    });

    return submissions.map((sub) => ({
      id: sub.id,
      student_id: sub.student_id,
      student_name: sub.profiles.name,
      roll_number: sub.profiles.student_details?.roll_number,
      submitted_at: sub.submitted_at,
      is_graded: sub.is_graded,
      total_marks_obtained: sub.total_marks_obtained,
      answer_count: sub.student_answers.length,
    }));
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
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    await this.prisma.test_submissions.update({
      where: { id: dto.submission_id },
      data: {
        total_marks_obtained: dto.total_marks_obtained,
        is_graded: true,
      },
    });

    return { message: 'Submission graded' };
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

      return {
        id: test.id,
        title: test.title,
        description: test.description,
        duration_minutes: test.duration_minutes,
        class_id: test.class_id,
        subject_name: test.grade_subjects.subjects_master.name,
        exam_type_id: test.exam_type_id,
        exam_type_name: test.exam_types.name,
        exam_type_category: test.exam_types.type,
        created_at: test.created_at,
        due_date: test.due_date,
        question_count: test.questions.length,
        total_marks: totalMarks,
        submission_status: submission
          ? submission.is_graded
            ? 'graded'
            : 'pending'
          : 'not_started',
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
      const answersData = dto.answers.map((ans) => ({
        submission_id: submission.id,
        question_id: ans.question_id,
        student_selected_option_index: ans.student_selected_option_index,
        subjective_answer_text: ans.subjective_answer_text,
        marks_awarded: null, // Will be graded later
      }));

      await tx.student_answers.createMany({
        data: answersData,
      });

      // Auto-grade MCQ questions
      let totalMarks = 0;
      for (const answer of dto.answers) {
        const question = test.questions.find((q) => q.id === answer.question_id);
        
        if (question && question.question_type === 'MCQ' && question.correct_option_index !== null) {
          const isCorrect = answer.student_selected_option_index === question.correct_option_index;
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

      // Update submission with total marks if all MCQ
      const allMCQ = test.questions.every((q) => q.question_type === 'MCQ');
      if (allMCQ) {
        await tx.test_submissions.update({
          where: { id: submission.id },
          data: {
            total_marks_obtained: totalMarks,
            is_graded: true,
          },
        });
      }

      return submission;
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
}
