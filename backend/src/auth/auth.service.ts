import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { RegisterSuperAdminDto } from "./dto/register-super-admin.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async registerSuperAdmin(dto: RegisterSuperAdminDto) {
    // Validate super admin secret
    const superAdminSecret =
      this.configService.get<string>("SUPER_ADMIN_SECRET");
    if (dto.secret !== superAdminSecret) {
      throw new UnauthorizedException("Invalid super admin secret");
    }

    // Check if email already exists (case-insensitive)
    const normalizedEmail = dto.email.toLowerCase();
    const existingUser = await this.prisma.profiles.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Hash password
    const hashedPassword = await this.hashPassword(dto.password);

    // Create super admin profile (role_id: 1, school_id: null)
    const superAdmin = await this.prisma.profiles.create({
      data: {
        email: normalizedEmail,
        password_hash: hashedPassword,
        name: dto.name,
        role_id: 1, // Super Admin role
        school_id: null, // No school association
        is_first_login: false, // Super admin doesn't need password reset
        is_verified: true,
      } as any,
      include: {
        user_roles: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.user_roles.role.toLowerCase(),
      school_id: null,
    });

    return {
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.user_roles.role.toLowerCase(),
      },
      ...tokens,
    };
  }

  async registerUser(dto: RegisterUserDto, createdBySchoolId?: string) {
    // Determine school_id: use from DTO if present, otherwise from creator's context
    const schoolId = dto.school_id || createdBySchoolId;
    
    // Check if email already exists in the SAME school (allow same email in different schools)
    const normalizedEmail = dto.email.toLowerCase();
    const existingUser = await this.prisma.profiles.findFirst({
      where: { 
        email: normalizedEmail,
        school_id: schoolId 
      },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered in this school");
    }

    if (!schoolId && dto.role_id !== 1) {
      throw new ForbiddenException(
        "School ID is required for non-super admin users"
      );
    }

    // Hash temporary password
    const hashedPassword = await this.hashPassword(dto.temporaryPassword);

    // Create user profile
    const user = await this.prisma.profiles.create({
      data: {
        email: normalizedEmail,
        password_hash: hashedPassword,
        name: dto.name,
        role_id: dto.role_id,
        school_id: schoolId,
        is_first_login: true, // User must reset password on first login
        is_verified: false,
      } as any,
      include: {
        user_roles: true,
      },
    });

    // Invalidate user caches
    await this.invalidateUserCaches(schoolId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.user_roles.role.toLowerCase(),
      school_id: user.school_id,
      is_first_login: (user as any).is_first_login,
      message:
        "User created successfully. They must reset password on first login.",
    };
  }

  async login(dto: LoginDto, expectedRole?: string) {
    // Validate user credentials with school_id if provided (case-insensitive email)
    const user = await this.validateUser(dto.email.toLowerCase(), dto.password, dto.school_id);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Validate role if expectedRole is provided - CHECK THIS FIRST before password reset
    const userRole = user.user_roles.role.toLowerCase();
    const expectedRoleLower = expectedRole?.toLowerCase();

    if (expectedRoleLower && userRole !== expectedRoleLower) {
      const roleDisplayNames: Record<string, string> = {
        student: "a student",
        teacher: "a teacher",
        school_admin: "a school administrator",
        super_admin: "a super administrator",
      };

      const actualRoleDisplay = roleDisplayNames[userRole] || userRole;

      throw new ForbiddenException({
        statusCode: 403,
        message: `You are registered as ${actualRoleDisplay}. Please use the correct login page.`,
        code: "ROLE_MISMATCH",
        actualRole: userRole,
        expectedRole: expectedRoleLower,
      });
    }

    // Check if first-time login - AFTER role validation
    // Skip password reset requirement for super_admin
    if ((user as any).is_first_login && userRole !== 'super_admin') {
      throw new ForbiddenException({
        statusCode: 403,
        message: "Password reset required",
        code: "RESET_REQUIRED",
        userId: user.id,
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: userRole,
      school_id: user.school_id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: userRole,
        school_id: user.school_id,
      },
      ...tokens,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Find user
    const user = await this.prisma.profiles.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(dto.newPassword);

    // Update password and set is_first_login to false
    await this.prisma.profiles.update({
      where: { id: dto.userId },
      data: {
        password_hash: hashedPassword,
        is_first_login: false,
        is_verified: true,
      } as any,
    });

    return {
      message:
        "Password reset successful. You can now login with your new password.",
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });

      // Generate new access token
      const accessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
          school_id: payload.school_id,
        },
        {
          secret: this.configService.get<string>("JWT_SECRET"),
          expiresIn: this.configService.get<string>(
            "JWT_ACCESS_TOKEN_EXPIRATION"
          ) as any,
        }
      );

      return { access_token: accessToken };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private async validateUser(email: string, password: string, schoolId?: string) {
    // Email is already normalized to lowercase by caller
    // If school_id is provided, find user by email and school_id
    // Otherwise, find by email only (for backward compatibility and super_admin)
    const whereClause = schoolId 
      ? { email, school_id: schoolId }
      : { email };

    const user = await this.prisma.profiles.findFirst({
      where: whereClause,
      include: {
        user_roles: true,
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async generateTokens(payload: {
    sub: string;
    email: string;
    role: string;
    school_id: string | null;
  }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>("JWT_SECRET"),
        expiresIn: this.configService.get<string>(
          "JWT_ACCESS_TOKEN_EXPIRATION"
        ) as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.configService.get<string>(
          "JWT_REFRESH_TOKEN_EXPIRATION"
        ) as any,
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.profiles.findUnique({
      where: { id: userId },
      include: {
        user_roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.user_roles.role.toLowerCase(),
      school_id: user.school_id,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified || false,
      is_first_login: (user as any).is_first_login || false,
    };
  }

  async validateSession(userId: string) {
    try {
      const user = await this.getCurrentUser(userId);
      return {
        valid: true,
        user,
      };
    } catch (error) {
      return {
        valid: false,
        message: "Invalid session",
      };
    }
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
