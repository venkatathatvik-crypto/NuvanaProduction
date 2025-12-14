import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSchoolDto } from "./dto/create-school.dto";
import { UpdateSchoolDto } from "./dto/update-school.dto";

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  async create(createSchoolDto: CreateSchoolDto) {
    const school = await this.prisma.schools.create({
      data: {
        name: createSchoolDto.name,
        admin_profile_id: createSchoolDto.admin_profile_id,
      },
    });

    return school;
  }

  async onboardSchool(dto: {
    name: string;
    admin_email: string;
    admin_password: string;
    admin_name: string;
  }) {
    // Check if email already exists
    const existingUser = await this.prisma.profiles.findUnique({
      where: { email: dto.admin_email },
    });

    if (existingUser) {
      throw new ConflictException("Admin email already registered");
    }

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx: any) => {
      // 1. Create the school
      const school = await tx.schools.create({
        data: {
          name: dto.name,
        },
      });

      // 2. Hash admin password
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(dto.admin_password, 10);

      // 3. Create admin user with role_id = 2 (school_admin)
      const admin = await tx.profiles.create({
        data: {
          email: dto.admin_email,
          password_hash: hashedPassword,
          name: dto.admin_name,
          role_id: 2, // school_admin
          school_id: school.id,
          is_first_login: true,
          is_verified: false,
        } as any,
        include: {
          user_roles: true,
        },
      });

      // 4. Update school with admin_profile_id
      const updatedSchool = await tx.schools.update({
        where: { id: school.id },
        data: {
          admin_profile_id: admin.id,
        },
      });

      return {
        school: updatedSchool,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.user_roles.role,
        },
      };
    });

    return {
      message: "School and admin created successfully",
      ...result,
    };
  }

  async findAll() {
    return this.prisma.schools.findMany({
      include: {
        profiles: {
          select: {
            id: true,
            email: true,
            name: true,
            role_id: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.schools.findUnique({
      where: { id },
      include: {
        profiles: {
          select: {
            id: true,
            email: true,
            name: true,
            role_id: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    return school;
  }

  async update(id: string, updateSchoolDto: UpdateSchoolDto) {
    try {
      const school = await this.prisma.schools.update({
        where: { id },
        data: updateSchoolDto,
      });

      return school;
    } catch (error) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.schools.delete({
        where: { id },
      });

      return { message: "School deleted successfully" };
    } catch (error) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }
  }
}
