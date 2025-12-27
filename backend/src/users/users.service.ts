import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import {
  UpdateProfileDto,
  CreateStudentDetailsDto,
  CreateTeacherDetailsDto,
} from './dto/user.dto';

import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async findAll(schoolId?: string, isSuperAdmin: boolean = false, roleId?: number) {
    // Build cache key based on parameters
    const cacheKey = `users:school:${schoolId || 'all'}:role:${roleId || 'all'}:admin:${isSuperAdmin}`;
    
    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Build where clause
    const where: any = {};

    if (schoolId && !isSuperAdmin) {
      where.school_id = schoolId;
    }

    if (roleId) {
      where.role_id = roleId;
    }

    let users;
    
    // Super admin can see all users
    if (isSuperAdmin && !schoolId && !roleId) {
      users = await this.prisma.profiles.findMany({
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
    } else {
      // Filter by school and/or role
      users = await this.prisma.profiles.findMany({
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
    
    // Store in cache (TTL: 300 seconds = 5 minutes)
    await this.cacheManager.set(cacheKey, users, 300 * 1000); // 5 minutes in milliseconds
    
    return users;
  }

  async findOne(id: string, schoolId?: string, isSuperAdmin: boolean = false) {
    const user = await this.prisma.profiles.findUnique({
      where: { id },
      include: {
        user_roles: true,
        schools: true,
        student_details: {
          include: {
            classes: {
              include: {
                grade_levels: true,
              },
            },
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
    
    // Invalidate user caches
    await this.invalidateUserCaches(schoolId);

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

    // Invalidate user caches to ensure fresh data
    await this.invalidateUserCaches(schoolId);

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

    // Invalidate user caches to ensure fresh data
    await this.invalidateUserCaches(schoolId);

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
    
    // Invalidate user caches
    await this.invalidateUserCaches(schoolId);

    return { message: 'User deleted successfully' };
  }

  async uploadAvatar(
    id: string,
    file: Express.Multer.File,
    schoolId?: string,
    isSuperAdmin: boolean = false,
  ) {
    // Verify user exists and tenant access
    const user = await this.findOne(id, schoolId, isSuperAdmin);

    // Upload to storage
    // We use 'files' bucket but organize in avatars folder
    const fileExt = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { path } = await this.storage.uploadFile(
      'files',
      filePath,
      file.buffer,
      file.mimetype,
      { upsert: true }
    );

    // Get Public URL
    const publicUrl = this.storage.getPublicUrl('files', path);

    // Update Profile
    const updated = await this.prisma.profiles.update({
      where: { id },
      data: { avatar_url: publicUrl },
    });

    return { avatar_url: updated.avatar_url };
  }
  
  // Helper method to invalidate all user-related caches
  private async invalidateUserCaches(schoolId?: string) {
    // Clear all user cache variations for this school
    const patterns = [
      `users:school:${schoolId || 'all'}:role:all:admin:false`,
      `users:school:${schoolId || 'all'}:role:all:admin:true`,
      `users:school:${schoolId || 'all'}:role:3:admin:false`, // Teachers
      `users:school:${schoolId || 'all'}:role:4:admin:false`, // Students
      `users:school:all:role:all:admin:true`, // Super admin view
    ];
    
    await Promise.all(patterns.map(key => this.cacheManager.del(key)));
  }
}
