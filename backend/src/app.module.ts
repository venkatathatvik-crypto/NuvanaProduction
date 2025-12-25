import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AiModule } from './ai/ai.module';
import { AcademicModule } from './academic/academic.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';

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
                ttl: 60000, // 60 seconds
                limit: 100, // 100 requests per minute for normal endpoints
            },
            {
                name: 'ai',
                ttl: 60000, // 60 seconds
                limit: 5, // 5 AI requests per minute (stricter)
            },
        ]),

        // Redis caching - improve performance and reduce AI costs
        CacheModule.registerAsync({
            isGlobal: true,
            useFactory: async () => {
                const redisUrl = process.env.REDIS_URL;

                if (redisUrl) {
                    try {
                        const { redisStore } = await import('cache-manager-redis-yet');

                        console.log('✅ Redis cache connecting...');
                        
                        const store = await redisStore({
                            url: redisUrl,
                        });

                        console.log('✅ Redis cache connected successfully!');
                        console.log(`📦 Cache Type: REDIS (${redisUrl.split('@')[1] || 'configured'})`);
                        console.log('⚡ AI response caching enabled - Expecting ~70% cost reduction');

                        return {
                            store,
                            ttl: 3600, // 1 hour in seconds
                        };
                    } catch (error) {
                        console.warn('⚠️  Redis connection failed, falling back to in-memory cache');
                        console.warn('⚠️  Error:', error.message);
                        console.log('📦 Cache Type: IN-MEMORY (limited, not recommended for production)');

                        return {
                            ttl: 3600,
                        };
                    }
                }

                console.warn('⚠️  REDIS_URL not configured, using in-memory cache');
                console.log('📦 Cache Type: IN-MEMORY (limited, not recommended for production)');
                console.log('💡 Tip: Set REDIS_URL environment variable for production caching');

                return {
                    ttl: 3600,
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
        HealthModule,
    ],
})
export class AppModule {}
