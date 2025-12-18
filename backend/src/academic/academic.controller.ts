import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AcademicService } from "./academic.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Tenant } from "../auth/decorators/tenant.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import {
  CreateGradeDto,
  UpdateGradeDto,
  CreateClassDto,
  UpdateClassDto,
  CreateSubjectDto,
  AssignSubjectsToGradeDto,
  AssignTeacherToClassDto,
  AssignSubjectsToTeacherDto,
  CreateFileCategoryDto,
  UpdateFileCategoryDto,
  CreateExamTypeDto,
  UpdateExamTypeDto,
  CreatePeriodDto,
  UpdatePeriodDto,
} from "./dto";


@Controller("academic")
@UseGuards(RolesGuard)
export class AcademicController {
  constructor(
    private readonly academicService: AcademicService
  ) {}

  // ==================== GRADE LEVELS ====================
  @Post("grades")
  @Roles("school_admin", "super_admin")
  createGrade(@Body() dto: CreateGradeDto, @Tenant() schoolId: string) {
    return this.academicService.createGrade(dto, schoolId);
  }

  @Get("grades")
  @Roles("school_admin", "teacher", "super_admin")
  getGrades(@Tenant() schoolId: string) {
    return this.academicService.getGrades(schoolId);
  }

  @Patch("grades/:id")
  @Roles("school_admin", "super_admin")
  updateGrade(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateGradeDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.updateGrade(id, dto, schoolId);
  }

  @Delete("grades/:id")
  @Roles("school_admin", "super_admin")
  deleteGrade(
    @Param("id", ParseIntPipe) id: number,
    @Tenant() schoolId: string
  ) {
    return this.academicService.deleteGrade(id, schoolId);
  }

  // ==================== CLASSES ====================
  @Post("classes")
  @Roles("school_admin", "super_admin")
  createClass(@Body() dto: CreateClassDto, @Tenant() schoolId: string) {
    return this.academicService.createClass(dto, schoolId);
  }

  @Get("classes")
  @Roles("school_admin", " teacher", "super_admin", "student")
  getClasses(@Tenant() schoolId: string) {
    return this.academicService.getClasses(schoolId);
  }

  @Patch("classes/:id")
  @Roles("school_admin", "super_admin")
  updateClass(
    @Param("id") id: string,
    @Body() dto: UpdateClassDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.updateClass(id, dto, schoolId);
  }

  @Delete("classes/:id")
  @Roles("school_admin", "super_admin")
  deleteClass(@Param("id") id: string, @Tenant() schoolId: string) {
    return this.academicService.deleteClass(id, schoolId);
  }

  // ==================== MASTER SUBJECTS ====================
  @Post("subjects")
  @Roles("school_admin", "super_admin")
  createSubject(@Body() dto: CreateSubjectDto, @Tenant() schoolId: string) {
    return this.academicService.createSubject(dto, schoolId);
  }

  @Get("subjects")
  @Roles("school_admin", "teacher", "super_admin")
  getSubjects(@Tenant() schoolId: string) {
    return this.academicService.getSubjects(schoolId);
  }

  @Delete("subjects/:id")
  @Roles("school_admin", "super_admin")
  deleteSubject(@Param("id") id: string, @Tenant() schoolId: string) {
    return this.academicService.deleteSubject(id, schoolId);
  }

  // ==================== GRADE SUBJECTS ====================
  @Post("grade-subjects")
  @Roles("school_admin", "super_admin")
  assignSubjectsToGrade(
    @Body() dto: AssignSubjectsToGradeDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.assignSubjectsToGrade(dto, schoolId);
  }

  @Get("grade-subjects")
  @Roles("school_admin", "teacher", "super_admin")
  getGradeSubjects(@Tenant() schoolId: string) {
    return this.academicService.getGradeSubjects(schoolId);
  }

  @Get("grade-subjects/grade/:gradeId")
  @Roles("school_admin", "teacher", "super_admin", "student")
  getSubjectsByGrade(
    @Param("gradeId", ParseIntPipe) gradeId: number,
    @Tenant() schoolId: string
  ) {
    return this.academicService.getSubjectsByGrade(gradeId, schoolId);
  }

  @Delete("grade-subjects/:id")
  @Roles("school_admin", "super_admin")
  deleteGradeSubject(@Param("id") id: string, @Tenant() schoolId: string) {
    return this.academicService.deleteGradeSubject(id, schoolId);
  }

  // ==================== TEACHER-CLASS ASSIGNMENTS ====================
  @Post("teacher-classes")
  @Roles("school_admin", "super_admin")
  assignTeacherToClass(
    @Body() dto: AssignTeacherToClassDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.assignTeacherToClass(dto, schoolId);
  }

  @Get("teacher-classes")
  @Roles("school_admin", "teacher", "super_admin")
  getTeacherClasses(@Tenant() schoolId: string) {
    return this.academicService.getTeacherClasses(schoolId);
  }

  @Get("teacher-classes/teacher/:teacherId")
  @Roles("school_admin", "teacher", "super_admin")
  getClassesByTeacher(
    @Param("teacherId") teacherId: string,
    @Tenant() schoolId: string
  ) {
    return this.academicService.getClassesByTeacher(teacherId, schoolId);
  }

  @Delete("teacher-classes/:id")
  @Roles("school_admin", "super_admin")
  deleteTeacherClass(@Param("id") id: string, @Tenant() schoolId: string) {
    return this.academicService.deleteTeacherClass(id, schoolId);
  }

  // ==================== TEACHER-SUBJECT ASSIGNMENTS ====================
  @Post("teacher-subjects")
  @Roles("school_admin", "super_admin")
  assignSubjectsToTeacher(
    @Body() dto: AssignSubjectsToTeacherDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.assignSubjectsToTeacher(dto, schoolId);
  }

  @Get("teacher-subjects")
  @Roles("school_admin", "teacher", "super_admin")
  getTeacherSubjects(@Tenant() schoolId: string) {
    return this.academicService.getTeacherSubjects(schoolId);
  }

  @Get("teacher-subjects/teacher/:teacherId")
  @Roles("school_admin", "teacher", "super_admin")
  getSubjectsByTeacher(
    @Param("teacherId") teacherId: string,
    @Tenant() schoolId: string
  ) {
    return this.academicService.getSubjectsByTeacher(teacherId, schoolId);
  }

  @Delete("teacher-subjects/:id")
  @Roles("school_admin", "super_admin")
  deleteTeacherSubject(@Param("id") id: string, @Tenant() schoolId: string) {
    return this.academicService.deleteTeacherSubject(id, schoolId);
  }

  // ==================== FILE CATEGORIES ====================
  @Post("file-categories")
  @Roles("school_admin", "super_admin")
  createFileCategory(
    @Body() dto: CreateFileCategoryDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.createFileCategory(dto, schoolId);
  }

  @Get("file-categories")
  @Roles("school_admin", "teacher", "super_admin")
  getFileCategories(@Tenant() schoolId: string) {
    return this.academicService.getFileCategories(schoolId);
  }

  @Patch("file-categories/:id")
  @Roles("school_admin", "super_admin")
  updateFileCategory(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateFileCategoryDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.updateFileCategory(id, dto, schoolId);
  }

  @Delete("file-categories/:id")
  @Roles("school_admin", "super_admin")
  deleteFileCategory(
    @Param("id", ParseIntPipe) id: number,
    @Tenant() schoolId: string
  ) {
    return this.academicService.deleteFileCategory(id, schoolId);
  }

  // ==================== EXAM TYPES ====================
  @Post("exam-types")
  @Roles("school_admin", "super_admin")
  createExamType(@Body() dto: CreateExamTypeDto, @Tenant() schoolId: string) {
    return this.academicService.createExamType(dto, schoolId);
  }

  @Get("exam-types")
  @Roles("school_admin", "teacher", "super_admin")
  getExamTypes(@Tenant() schoolId: string) {
    return this.academicService.getExamTypes(schoolId);
  }

  @Patch("exam-types/:id")
  @Roles("school_admin", "super_admin")
  updateExamType(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateExamTypeDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.updateExamType(id, dto, schoolId);
  }

  @Delete("exam-types/:id")
  @Roles("school_admin", "super_admin")
  deleteExamType(
    @Param("id", ParseIntPipe) id: number,
    @Tenant() schoolId: string
  ) {
    return this.academicService.deleteExamType(id, schoolId);
  }

  // ==================== TIMETABLE ====================
  @Get("timetable/class/:classId")
  @Roles("school_admin", "teacher", "super_admin", "student")
  getWeeklyTimetable(
    @Param("classId") classId: string,
    @Tenant() schoolId: string
  ) {
    return this.academicService.getWeeklyTimetable(classId, schoolId);
  }

  @Post("timetable/periods")
  @Roles("school_admin", "super_admin")
  createOrUpdatePeriod(
    @Body() dto: CreatePeriodDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.createOrUpdatePeriod(dto, schoolId);
  }

  @Patch("timetable/periods/:id")
  @Roles("school_admin", "super_admin")
  updatePeriod(
    @Param("id") id: string,
    @Body() dto: UpdatePeriodDto,
    @Tenant() schoolId: string
  ) {
    return this.academicService.updatePeriod(id, dto, schoolId);
  }

  @Delete("timetable/periods/:id")
  @Roles("school_admin", "super_admin")
  deletePeriod(@Param("id") id: string, @Tenant() schoolId: string) {
    return this.academicService.deletePeriod(id, schoolId);
  }

  // ==================== HELPER ENDPOINTS ====================
  
  @Get('helper/grade-subject/:classId/:subjectName')
  async getGradeSubjectIdByDetails(
    @Param('classId') classId: string,
    @Param('subjectName') subjectName: string,
    @Tenant() schoolId: string,
  ) {
    const gradeSubjectId = await this.academicService.getGradeSubjectIdByDetails(
      classId,
      subjectName,
      schoolId,
    );
    // Return as JSON object to avoid JSON parsing issues
    return { id: gradeSubjectId };
  }

  @Get('helper/exam-type/:examTypeName')
  async getExamTypeIdByName(
    @Param('examTypeName') examTypeName: string,
    @Tenant() schoolId: string,
  ) {
    const examTypeId = await this.academicService.getExamTypeIdByName(examTypeName, schoolId);
    // Return as JSON object to avoid JSON parsing issues
    return { id: examTypeId };
  }

  
}
