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
        errorData = (exceptionResponse as any).data || (exceptionResponse as any).code ? exceptionResponse : null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Log stack trace for internal errors (only in development)
      if (process.env.NODE_ENV !== 'production') {
        this.logger.error(
          `Unhandled error: ${exception.message}`,
          exception.stack
        );
      } else {
        this.logger.error(`Unhandled error: ${exception.message}`);
      }
    }

    // Log all errors with context (but not in excessive detail in production)
    const logContext = {
      statusCode,
      message,
      path: request.url,
      method: request.method,
      userId: (request as any).user?.sub || 'anonymous',
    };

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${statusCode} - ${message}`,
        logContext
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${statusCode} - ${message}`,
        logContext
      );
    }

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
