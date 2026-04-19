import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private configService: ConfigService) {}

    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        const expectedApiKey = this.configService.get<string>('API_KEY');

        // If no API_KEY is configured in env, skip validation (dev mode)
        if (!expectedApiKey) {
            return true;
        }

        if (!apiKey) {
            throw new UnauthorizedException('API Key missing');
        }

        if (apiKey !== expectedApiKey) {
            throw new UnauthorizedException('Invalid API Key');
        }

        return true;
    }
}
