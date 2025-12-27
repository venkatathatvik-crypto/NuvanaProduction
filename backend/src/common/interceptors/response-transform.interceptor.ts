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
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode;

        return {
          statusCode,
          message: this.extractMessage(data) || 'Success',
          isError: false,
          data: this.extractData(data),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      })
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
    // If response already has data field (standardized), return it
    if (data && typeof data === 'object' && 'data' in data && !('message' in data)) {
      return data.data;
    }
    
    // If response has message field, exclude it from data
    if (data && typeof data === 'object' && 'message' in data) {
      const { message, ...rest } = data;
      return Object.keys(rest).length > 0 ? rest : data;
    }
    
    // Otherwise wrap the entire response
    return data;
  }
}
