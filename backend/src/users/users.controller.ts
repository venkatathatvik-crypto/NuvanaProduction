import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  CreateStudentDetailsDto,
  CreateTeacherDetailsDto,
} from './dto/user.dto';
import { Tenant } from '../auth/decorators/tenant.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Tenant() schoolId: string,
    @CurrentUser() user: JwtPayload,
    @Query('role_id') roleId?: string,
  ) {
    const isSuperAdmin = user.role === 'super_admin';
    const roleIdNum = roleId ? parseInt(roleId) : undefined;
    return this.usersService.findAll(schoolId, isSuperAdmin, roleIdNum);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Tenant() schoolId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const isSuperAdmin = user.role === 'super_admin';
    return this.usersService.findOne(id, schoolId, isSuperAdmin);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'school_admin', 'teacher')
  updateProfile(
    @Param('id') id: string,
    @Body() updateDto: UpdateProfileDto,
    @Tenant() schoolId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const isSuperAdmin = user.role === 'super_admin';
    return this.usersService.updateProfile(id, updateDto, schoolId, isSuperAdmin);
  }

  @Post(':id/student-details')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'school_admin')
  createOrUpdateStudentDetails(
    @Param('id') profileId: string,
    @Body() dto: CreateStudentDetailsDto,
    @Tenant() schoolId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const isSuperAdmin = user.role === 'super_admin';
    return this.usersService.createOrUpdateStudentDetails(
      profileId,
      dto,
      schoolId,
      isSuperAdmin,
    );
  }

  @Post(':id/teacher-details')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'school_admin')
  createOrUpdateTeacherDetails(
    @Param('id') profileId: string,
    @Body() dto: CreateTeacherDetailsDto,
    @Tenant() schoolId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const isSuperAdmin = user.role === 'super_admin';
    return this.usersService.createOrUpdateTeacherDetails(
      profileId,
      dto,
      schoolId,
      isSuperAdmin,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('super_admin', 'school_admin')
  deleteUser(
    @Param('id') id: string,
    @Tenant() schoolId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const isSuperAdmin = user.role === 'super_admin';
    return this.usersService.deleteUser(id, schoolId, isSuperAdmin);
  }
}
