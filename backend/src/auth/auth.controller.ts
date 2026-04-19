import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Headers, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterSuperAdminDto } from './dto/register-super-admin.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { Tenant } from './decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('super-admin/register')
  @HttpCode(HttpStatus.CREATED)
  async registerSuperAdmin(@Body() dto: RegisterSuperAdminDto) {
    return this.authService.registerSuperAdmin(dto);
  }

  @Post('register')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'school_admin')
  @HttpCode(HttpStatus.CREATED)
  async registerUser(
    @Body() dto: RegisterUserDto,
    @Tenant() schoolId: string,
  ) {
    return this.authService.registerUser(dto, schoolId);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    return this.authService.login(dto, dto.expectedRole, ipAddress, userAgent);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('validate-session')
  @HttpCode(HttpStatus.OK)
  async validateSession(@CurrentUser() user: JwtPayload) {
    return this.authService.validateSession(user.sub);
  }

  @Post('session')
  @HttpCode(HttpStatus.OK)
  async getSession(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user.sub);
  }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Headers('authorization') authHeader: string) {
        const token = authHeader?.split(' ')[1];
        if (token) {
            await this.authService.logout(token);
        }
        return {
            message: 'Logged out successfully',
        };
    }
}
