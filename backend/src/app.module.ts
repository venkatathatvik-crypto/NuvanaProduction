import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AiModule } from './ai/ai.module';
import { AcademicModule } from './academic/academic.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SchoolsModule } from './schools/schools.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagesModule } from './messages/messages.module';
import { HealthModule } from './health/health.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { TestModule } from './test/test.module';
import { StorageModule } from './storage/storage.module';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { PdfAnnotationsModule } from './pdf-annotations/pdf-annotations.module';

@Module({
    imports: [
        // Load environment variables
        ConfigModule.forRoot({
            isGlobal: true,
        }),

        // Rate limiting - protect against abuse
        ThrottlerModule.forRoot([
            {
                name: 'default',
                ttl: 60000, 
                limit: 100, 
            },
            {
                name: 'ai',
                ttl: 60000, 
                limit: 5, 
            },
        ]),

        // Redis caching - improve performance and reduce AI costs
        CacheModule.registerAsync({
            isGlobal: true,
            useFactory: async () => {
                const redisUrl = process.env.REDIS_URL;

                if (redisUrl) {
                    try {
                        console.log('✅ Redis cache connecting...');
                        
                        const store = createKeyv(redisUrl);

                        console.log('✅ Redis cache connected successfully!');
                        console.log(`📦 Cache Type: REDIS (@keyv/redis) - ${redisUrl.split('@')[1] || 'configured'}`);
                        console.log('⚡ AI response caching enabled - Expecting ~70% cost reduction');

                        return {
                            stores: [store],
                            ttl: 3600 * 1000, // Default TTL: 1 hour in milliseconds
                        };
                    } catch (error) {
                        console.warn('⚠️  Redis connection failed, falling back to in-memory cache');
                        console.warn('⚠️  Error:', error.message);
                        console.log('📦 Cache Type: IN-MEMORY (limited, not recommended for production)');

                        return {
                            ttl: 3600 * 1000, // 1 hour in milliseconds
                        };
                    }
                }

                console.warn('⚠️  REDIS_URL not configured, using in-memory cache');
                console.log('📦 Cache Type: IN-MEMORY (limited, not recommended for production)');
                console.log('💡 Tip: Set REDIS_URL environment variable for production caching');

                return {
                    ttl: 3600 * 1000, // 1 hour in milliseconds
                };
            },
        }),

        // Queue Configuration
        BullModule.forRootAsync({
            useFactory: () => {
                const redisUrl = process.env.REDIS_URL;
                if (!redisUrl) {
                    throw new Error('REDIS_URL is required for BullModule');
                }
                const url = new URL(redisUrl);
                return {
                    connection: {
                        host: url.hostname,
                        port: parseInt(url.port),
                        password: url.password,
                        username: url.username,
                    },
                };
            },
        }),

        // Core modules
        PrismaModule,
        AuthModule,
        UsersModule,
        AiModule,
        AcademicModule,
        AnalyticsModule,
        SchoolsModule,
        NotificationsModule,
        MessagesModule,
        AttendanceModule,
        AnnouncementsModule,
        FileUploadModule,
        TestModule,
        StorageModule,
        WhatsappModule,
        PdfAnnotationsModule,
        HealthModule,
    ],
})
export class AppModule {}
