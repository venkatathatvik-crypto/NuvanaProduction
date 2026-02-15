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
import { PdfAnnotationsModule } from './pdf-annotations/pdf-annotations.module';
import { EngagementModule } from './engagement/engagement.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';

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
                        const url = new URL(redisUrl);
                        console.log(`✅ Redis cache connecting to host: ${url.hostname}:${url.port}...`);
                        
                        const store = createKeyv(redisUrl);

                        console.log('✅ Redis cache connected successfully!');
                        console.log(`📦 Cache Type: REDIS (@keyv/redis) - ${url.hostname}`);
                        console.log('⚡ AI response caching enabled - Expecting ~70% cost reduction');

                        return {
                            stores: [store],
                            ttl: 3600 * 1000, // Default TTL: 1 hour in milliseconds
                        };
                    } catch (error) {
                        console.warn('⚠️  Redis connection failed, falling back to in-memory cache');
                        console.warn(`⚠️  Error Code: ${error.code || 'UNKNOWN'}`);
                        console.warn(`⚠️  Error Message: ${error.message}`);
                        
                        if (error.message.includes('ENOTFOUND')) {
                            console.error('🔍 DIAGNOSIS: DNS Resolution Failure for Redis. Cannot resolve hostname.');
                        } else if (error.message.includes('ECONNREFUSED')) {
                            console.error('🔍 DIAGNOSIS: Connection Refused by Redis server.');
                        }

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
                    console.error('❌ REDIS_URL is required for BullModule but not found!');
                    throw new Error('REDIS_URL is required for BullModule');
                }
                try {
                    const url = new URL(redisUrl);
                    console.log(`✅ BullMQ connection setup for host: ${url.hostname}`);
                    return {
                        connection: {
                            host: url.hostname,
                            port: parseInt(url.port),
                            password: url.password,
                            username: url.username,
                        },
                        prefix: `nuvana-dev-saite`, // Isolate your local jobs from staging/prod
                    };
                } catch (error) {
                    console.error('❌ Failed to parse REDIS_URL for BullMQ:', error.message);
                    throw error;
                }
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
        PdfAnnotationsModule,
        EngagementModule,
        WhatsappModule,
        BullBoardModule.forRoot({
          route: '/admin/queues',
          adapter: ExpressAdapter,
        }),
        HealthModule,
    ],
})
export class AppModule {}
