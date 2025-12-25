# Critical Fixes Implementation Guide

This guide provides copy-paste ready code to fix the **5 most critical issues** identified in the backend analysis.

---

## 1. Global Exception Filter (CRITICAL)

### Create the filter:

**File:** `backend/src/common/filters/global-exception.filter.ts`
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  isError: boolean;
  data: T | null;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorData: any = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      // Handle different response formats
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        errorData = (exceptionResponse as any).data || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Log stack trace for internal errors
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack
      );
    }

    // Log all errors with context
    this.logger.error(
      `${request.method} ${request.url} - ${statusCode} - ${message}`,
      {
        statusCode,
        message,
        path: request.url,
        method: request.method,
        userId: (request as any).user?.sub || 'anonymous',
      }
    );

    const apiResponse: ApiResponse = {
      statusCode,
      message,
      isError: true,
      data: errorData,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(apiResponse);
  }
}
```

### Register in main.ts:

```typescript
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... existing code ...
  
  // Add global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  await app.listen(3000);
}
```

---

## 2. Response Transform Interceptor

### Create the interceptor:

**File:** `backend/src/common/interceptors/response-transform.interceptor.ts`
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../filters/global-exception.filter';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => ({
        statusCode,
        message: this.extractMessage(data) || 'Success',
        isError: false,
        data: this.extractData(data),
        timestamp: new Date().toISOString(),
        path: request.url,
      }))
    );
  }

  private extractMessage(data: any): string | null {
    // If response has a message field, use it
    if (data && typeof data === 'object' && 'message' in data) {
      return data.message;
    }
    return null;
  }

  private extractData(data: any): any {
    // If response already has standardized structure, return as is
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data;
    }
    // Otherwise wrap the entire response
    return data;
  }
}
```

### Register in main.ts:

```typescript
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... existing code ...
  
  // Add response transform interceptor
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  
  await app.listen(3000);
}
```

---

## 3. Rate Limiting

### Install dependency:

```bash
npm install @nestjs/throttler
```

### Configure in app.module.ts:

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    // ... other imports ...
    
    // Add throttler module
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per 60 seconds
      },
      {
        name: 'ai',
        ttl: 60000,
        limit: 20, // Only 20 AI requests per minute
      },
    ]),
  ],
  providers: [
    // ... other providers ...
    
    // Add global throttler guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### Apply stricter limits to AI endpoints:

**File:** `backend/src/ai/ai.controller.ts`
```typescript
import { Throttle } from '@nestjs/throttler';

@Controller('ai')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for AI
export class AiController {
  // ... existing code ...
}
```

---

## 4. Database Connection Pooling

### Update .env file:

```env
# Add connection pooling parameters
DATABASE_URL="postgresql://user:password@host:5432/dbname?connection_limit=20&pool_timeout=20&connect_timeout=10"
```

### Update prisma.service.ts:

**File:** `backend/src/prisma/prisma.service.ts`
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
      log: configService.get('NODE_ENV') === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected successfully with connection pooling');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }
}
```

---

## 5. Health Check Endpoint

### Install dependency:

```bash
npm install @nestjs/terminus
```

### Create health module:

**File:** `backend/src/health/health.controller.ts`
```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const dbHealthy = await this.prisma.healthCheck();
    
    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'operational' : 'down',
        api: 'operational',
      },
    };
  }

  @Public()
  @Get('ping')
  ping() {
    return { message: 'pong', timestamp: new Date().toISOString() };
  }
}
```

**File:** `backend/src/health/health.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

### Register in app.module.ts:

```typescript
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ... other imports ...
    HealthModule,
  ],
})
export class AppModule {}
```

---

## 6. BONUS: Redis Caching (High Priority)

### Install dependencies:

```bash
npm install @nestjs/cache-manager cache-manager cache-manager-redis-yet redis
```

### Configure in app.module.ts:

```typescript
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    // ... other imports ...
    
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
          },
          ttl: 3600, // 1 hour default TTL
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

### Use cache in AI service:

**File:** `backend/src/ai/ai.service.ts`
```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class AiService {
  constructor(
    // ... existing dependencies ...
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async processRequest(dto: AiRequestDto): Promise<AiResponseDto> {
    // Create cache key from request
    const cacheKey = `ai:${dto.taskType}:${dto.query}:${dto.subject || 'general'}`;
    
    // Check cache first
    const cached = await this.cacheManager.get<AiResponseDto>(cacheKey);
    if (cached) {
      console.log('[AI Service] ✓ Cache hit - returning cached response');
      return cached;
    }
    
    console.log('[AI Service] Cache miss - generating new response');
    
    // ... existing processing logic ...
    const result = await this.llmProvider.generate([...]);
    const parsedResponse = this.parseResponse(result);
    
    // Cache the response for 1 hour
    await this.cacheManager.set(cacheKey, parsedResponse, 3600000);
    
    return parsedResponse;
  }
}
```

---

## Testing the Changes

### 1. Test Global Exception Handling

```bash
# Test with invalid credentials
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# Expected response:
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "isError": true,
  "data": null,
  "timestamp": "2025-12-25T22:31:30Z",
  "path": "/auth/login"
}
```

### 2. Test Response Transform

```bash
# Test successful login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"correct"}'

# Expected response:
{
  "statusCode": 200,
  "message": "Login successful",
  "isError": false,
  "data": {
    "user": {...},
    "access_token": "...",
    "refresh_token": "..."
  },
  "timestamp": "2025-12-25T22:31:30Z",
  "path": "/auth/login"
}
```

### 3. Test Rate Limiting

```bash
# Send 25 requests rapidly
for i in {1..25}; do
  curl -X POST http://localhost:3000/ai/start \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"test"}' &
done

# Should get 429 Too Many Requests after 20 requests
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "isError": true,
  "data": null,
  "timestamp": "2025-12-25T22:31:30Z",
  "path": "/ai/start"
}
```

### 4. Test Health Check

```bash
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-12-25T22:31:30Z",
  "services": {
    "database": "operational",
    "api": "operational"
  }
}
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` in .env
- [ ] Update DATABASE_URL with connection pooling params
- [ ] Set up Redis instance (or use Redis Cloud)
- [ ] Configure REDIS_HOST and REDIS_PORT
- [ ] Test all endpoints with new response format
- [ ] Monitor logs for any issues
- [ ] Set up Sentry for error tracking (recommended)
- [ ] Configure log aggregation (e.g., LogRocket, Datadog)
- [ ] Test rate limiting with load testing tool
- [ ] Verify health check endpoint is accessible
- [ ] Document new API response format for frontend team

---

## Environment Variables

Add to your `.env` file:

```env
# Existing variables...

# Database with connection pooling
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20&connect_timeout=10"

# Redis (optional but recommended)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Error tracking (optional)
SENTRY_DSN=your_sentry_dsn

# Environment
NODE_ENV=production
```

---

## Estimated Implementation Time

- **Global Exception Filter:** 30 minutes
- **Response Interceptor:** 20 minutes
- **Rate Limiting:** 15 minutes
- **Database Pooling:** 10 minutes
- **Health Check:** 20 minutes
- **Redis Caching:** 45 minutes

**Total:** ~2.5 hours

**With testing:** ~4 hours

---

## Next Steps

After implementing these critical fixes:

1. **Query Optimization** - Address N+1 queries in analytics.service.ts
2. **Monitoring** - Implement Sentry or similar
3. **Security** - Add helmet, CSRF protection
4. **Testing** - Add unit and e2e tests

Refer to the main BACKEND_CODE_ANALYSIS.md for the complete action plan.
