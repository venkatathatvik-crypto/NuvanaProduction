import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as helmet from 'helmet';
import { SwaggerModule } from '@nestjs/swagger';
import * as fs from 'node:fs';
import * as yaml from 'js-yaml';
import * as path from 'node:path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

const logger = new Logger('Bootstrap');

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Security headers
    app.use(helmet.default());

    // Enable CORS with production-ready configuration
    app.enableCors({
        origin: (origin, callback) => {
            const allowedOrigins = process.env.NODE_ENV === 'production'
                ? process.env.FRONTEND_URL?.split(',').map(u => u.trim()) || []
                : ['http://localhost:8080', 'http://localhost:5173', 'http://localhost:4173'];

            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    // Swagger API docs from static YAML
    // __dirname at runtime is dist/src/, so go up twice to reach backend/
    const swaggerFile = path.join(__dirname, '..', '..', 'swagger.yaml');
    if (fs.existsSync(swaggerFile)) {
        const swaggerDocument = yaml.load(fs.readFileSync(swaggerFile, 'utf8')) as Record<string, any>;
        SwaggerModule.setup('api-docs', app, swaggerDocument as any);
        logger.log('Swagger UI available at /api-docs');
    } else {
        logger.warn(`Swagger file not found at ${swaggerFile}`);
    }

    // Global exception filter - must be first
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Global response transform interceptor
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    // Global validation pipe - validates all DTOs
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Global JWT authentication guard is now provided via APP_GUARD in AuthModule

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
        logger.warn('SIGTERM signal received: closing HTTP server');
        await app.close();
        logger.log('Server closed gracefully');
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.warn('SIGINT signal received: closing HTTP server');
        await app.close();
        logger.log('Server closed gracefully');
        process.exit(0);
    });

    const port = process.env.PORT || 3000;
    const server = await app.listen(port);

    // Global process error handlers
    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    });

    process.on('uncaughtException', (error) => {
        logger.error(`Uncaught Exception: ${error.message}`, error.stack);
        if (error.message.includes('ECONNRESET')) {
            logger.warn('Detected ECONNRESET - usually transient, continuing...');
        }
    });

    // Handle server-level errors (like EADDRINUSE)
    server.on('error', (error: any) => {
        logger.error(`Server error: ${error.message}`);
    });

    // Startup logging
    logger.log(`Server running on: http://localhost:${port}`);
    logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`Global Exception Filter: ACTIVE`);
    logger.log(`Response Transformer: ACTIVE`);
    logger.log(`Helmet Security Headers: ACTIVE`);
    logger.log(`Rate Limiting: ACTIVE (100 req/min global, 5 req/min AI)`);
    logger.log(`Validation Pipe: ACTIVE`);
    logger.log(`Health Check: http://localhost:${port}/health`);
}

bootstrap();
