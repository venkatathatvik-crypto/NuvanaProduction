import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS with production-ready configuration
    app.enableCors({
        origin: process.env.NODE_ENV === 'production' 
            ? process.env.FRONTEND_URL || 'https://your-frontend.vercel.app'
            : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:4173', 'https://nuvana360server.onrender.com'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    // Global exception filter - must be first
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Global response transform interceptor
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    // Global validation pipe - validates all DTOs
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strip properties that don't have decorators
            forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
            transform: true, // Automatically transform payloads to DTO instances
            transformOptions: {
                enableImplicitConversion: true, // Enable type conversion
            },
        }),
    );

    // Global JWT authentication guard
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector));

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
        console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
        await app.close();
        console.log('✅ Server closed gracefully');
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        console.log('\n⚠️  SIGINT signal received: closing HTTP server');
        await app.close();
        console.log('✅ Server closed gracefully');
        process.exit(0);
    });

    const port = process.env.PORT || 3000;
    const server = await app.listen(port);

    // Global process error handlers
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        // Don't exit here, just log it. Let the app try to continue.
    });

    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error.message, error.stack);
        // For fatal errors, we might need to exit, but let's log first.
        if (error.message.includes('ECONNRESET')) {
            console.warn('⚠️  Detected ECONNRESET - usually transient, continuing...');
        } else {
            // Potentially fatal, but let's try to stay alive if possible
            // process.exit(1); 
        }
    });

    // Handle server-level errors (like EADDRINUSE)
    server.on('error', (error: any) => {
        console.error('❌ Server error:', error.message);
    });

    // Enhanced startup logging
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 Nuvana Production Backend Server');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🌍 Server running on: http://localhost:${port}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Global Exception Filter: ACTIVE`);
    console.log(`✨ Response Transformer: ACTIVE`);
    console.log(`🛡️  Rate Limiting: ACTIVE (100 req/min global, 5 req/min AI)`);
    console.log(`💉 Validation Pipe: ACTIVE`);
    console.log(`🏥 Health Check: http://localhost:${port}/health`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
}

bootstrap();
