import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import * as bcrypt from "bcrypt";
import { RegisterSuperAdminDto } from "./dto/register-super-admin.dto";
import { RegisterUserDto } from "./dto/register-user.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private mailService: MailService,
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

    // Send Welcome Email asynchronously
    this.mailService.sendWelcomeEmail({ email: user.email, name: user.name }, dto.temporaryPassword).catch(e => {
        this.logger.error(`Non-blocking error during welcome email: ${e.message}`);
    });

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

  async login(dto: LoginDto, expectedRole?: string, ipAddress?: string, userAgent?: string) {
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

    // Fire login notification asynchronously — does not block the response
    const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    this.mailService.sendLoginNotificationEmail(
      { email: user.email, name: user.name },
      loginTime,
      ipAddress,
      userAgent,
    ).catch(e => this.logger.error(`Non-blocking login email error: ${e.message}`));

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

  async logout(token: string) {
    try {
      // Decode token to get expiration
      const payload = this.jwtService.decode(token) as any;
      if (!payload || !payload.exp) return;

      // Calculate remaining time in milliseconds
      const now = Math.floor(Date.now() / 1000);
      const remainingTime = payload.exp - now;

      if (remainingTime > 0) {
        // Store in Redis with TTL matching remaining token life
        // Key format: blacklist:<token>
        await this.cacheManager.set(`blacklist:${token}`, 'revoked', remainingTime * 1000);
      }
    } catch (error) {
      this.logger.error('Error blacklisting token during logout:', error);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.cacheManager.get(`blacklist:${token}`);
    return !!blacklisted;
  }

  /**
   * Step 1: User requests a password reset — generates OTP, caches it, sends email
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase();

    const whereClause = dto.school_id
      ? { email: normalizedEmail, school_id: dto.school_id }
      : { email: normalizedEmail };

    const user = await this.prisma.profiles.findFirst({
      where: whereClause,
    });

    // Always respond the same way to prevent email enumeration
    if (!user) {
      return { message: 'If an account with that email exists, a reset code has been sent.' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const cacheKey = `reset_otp:${normalizedEmail}:${dto.school_id || 'global'}`;

    // Store OTP in Redis — 15 minutes TTL
    await this.cacheManager.set(cacheKey, otp, 15 * 60 * 1000);
    this.logger.debug(`[TESTING] Password reset OTP for ${normalizedEmail}: ${otp}`);

    // Send OTP email (non-blocking)
    this.mailService.sendPasswordResetEmail(
      { email: user.email, name: user.name },
      otp,
    ).catch(e => this.logger.error(`Non-blocking password reset email error: ${e.message}`));

    this.logger.log(`Password reset OTP generated for ${normalizedEmail}`);
    return { message: 'If an account with that email exists, a reset code has been sent.' };
  }

  /**
   * Step 2: User submits OTP + new password — verifies OTP and updates password
   */
  async resetPassword(dto: ResetPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase();
    const cacheKey = `reset_otp:${normalizedEmail}:${dto.school_id || 'global'}`;

    // Verify OTP from Redis
    const storedOtp = await this.cacheManager.get<string>(cacheKey);

    if (!storedOtp) {
      throw new BadRequestException('Reset code has expired. Please request a new one.');
    }

    if (storedOtp !== dto.otp) {
      throw new BadRequestException('Invalid reset code. Please check and try again.');
    }

    // Find user
    const whereClause = dto.school_id
      ? { email: normalizedEmail, school_id: dto.school_id }
      : { email: normalizedEmail };

    const user = await this.prisma.profiles.findFirst({ where: whereClause });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Hash new password and update
    const hashedPassword = await this.hashPassword(dto.newPassword);

    await this.prisma.profiles.update({
      where: { id: user.id },
      data: {
        password_hash: hashedPassword,
        is_first_login: false,
        is_verified: true,
      } as any,
    });

    // Invalidate OTP so it can't be reused
    await this.cacheManager.del(cacheKey);

    this.logger.log(`Password successfully reset for ${normalizedEmail}`);
    return { message: 'Password reset successful. You can now log in with your new password.' };
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
