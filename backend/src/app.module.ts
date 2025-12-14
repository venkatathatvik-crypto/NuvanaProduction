import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { PrismaModule } from './prisma/prisma.module';
import { TestModule } from './test/test.module';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { UsersModule } from './users/users.module';
import { AcademicModule } from './academic/academic.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import openaiConfig from './config/openai.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [openaiConfig],
        }),
        PrismaModule,
        AuthModule,
        SchoolsModule,
        UsersModule,
        AcademicModule,
        AnnouncementsModule,
        AttendanceModule,
        FileUploadModule,
        AiModule,
        TestModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
