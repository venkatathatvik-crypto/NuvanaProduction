import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    app.enableCors();

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
    await app.listen(port);

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
