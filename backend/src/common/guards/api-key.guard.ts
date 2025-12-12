import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        // In production, validate against env or DB
        // For now, allow all or check a specific simple logic
        if (!apiKey) {
            // throw new UnauthorizedException('API Key missing'); // Uncomment for prod
            return true; // Dev mode permissive
        }
        return true;
    }
}
