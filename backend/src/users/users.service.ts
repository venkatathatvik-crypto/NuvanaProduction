import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateProfileDto,
  CreateStudentDetailsDto,
  CreateTeacherDetailsDto,
} from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(schoolId?: string, isSuperAdmin: boolean = false, roleId?: number) {
    // Build where clause
    const where: any = {};
    
    if (schoolId && !isSuperAdmin) {
      where.school_id = schoolId;
    }
    
    if (roleId) {
      where.role_id = roleId;
    }

    // Super admin can see all users
    if (isSuperAdmin && !schoolId && !roleId) {
      return this.prisma.profiles.findMany({
        include: {
          user_roles: true,
          schools: true,
          student_details: {
            include: {
              classes: true,
            },
          },
          teacher_details: true,
        },
      });
    }

    // Filter by school and/or role
    return this.prisma.profiles.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        user_roles: true,
        student_details: {
          include: {
            classes: true,
          },
        },
        teacher_details: true,
      },
    });
  }

  async findOne(id: string, schoolId?: string, isSuperAdmin: boolean = false) {
    const user = await this.prisma.profiles.findUnique({
      where: { id },
      include: {
        user_roles: true,
        schools: true,
        student_details: {
          include: {
            classes: true,
          },
        },
        teacher_details: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Tenant isolation: non-super admin can only access users from their school
    if (!isSuperAdmin && user.school_id !== schoolId) {
      throw new ForbiddenException('Access denied to this user');
    }

    return user;
  }

  async updateProfile(
    id: string,
    updateDto: UpdateProfileDto,
    schoolId?: string,
    isSuperAdmin: boolean = false,
  ) {
    // Check if user exists and tenant isolation
    const user = await this.findOne(id, schoolId, isSuperAdmin);

    const updated = await this.prisma.profiles.update({
      where: { id },
      data: updateDto,
      include: {
        user_roles: true,
        student_details: true,
        teacher_details: true,
      },
    });

    return updated;
  }

  async createOrUpdateStudentDetails(
    profileId: string,
    dto: CreateStudentDetailsDto,
    schoolId?: string,
    isSuperAdmin: boolean = false,
  ) {
    // Verify user exists and tenant access
    const user = await this.findOne(profileId, schoolId, isSuperAdmin);

    // Check if user is a student (case-insensitive comparison)
    if (user.user_roles.role.toLowerCase() !== 'student') {
      throw new ForbiddenException('User must have student role');
    }

    // Use upsert to create or update
    const studentDetails = await this.prisma.student_details.upsert({
      where: { profile_id: profileId },
      create: {
        profile_id: profileId,
        ...dto,
      },
      update: dto,
      include: {
        profiles: {
          include: {
            user_roles: true,
          },
        },
        classes: true,
      },
    });

    return studentDetails;
  }

  async createOrUpdateTeacherDetails(
    profileId: string,
    dto: CreateTeacherDetailsDto,
    schoolId?: string,
    isSuperAdmin: boolean = false,
  ) {
    // Verify user exists and tenant access
    const user = await this.findOne(profileId, schoolId, isSuperAdmin);

    // Check if user is a teacher (case-insensitive comparison)
    if (user.user_roles.role.toLowerCase() !== 'teacher') {
      throw new ForbiddenException('User must have teacher role');
    }

    // Use upsert to create or update
    const teacherDetails = await this.prisma.teacher_details.upsert({
      where: { profile_id: profileId },
      create: {
        profile_id: profileId,
        ...dto,
      },
      update: dto,
      include: {
        profiles: {
          include: {
            user_roles: true,
          },
        },
      },
    });

    return teacherDetails;
  }

  async deleteUser(
    id: string,
    schoolId?: string,
    isSuperAdmin: boolean = false,
  ) {
    // Check if user exists and tenant isolation
    await this.findOne(id, schoolId, isSuperAdmin);

    await this.prisma.profiles.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
