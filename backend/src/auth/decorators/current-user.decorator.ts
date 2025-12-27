import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  school_id?: string;
}

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // If a specific property is requested (e.g., 'id'), return that property
    // Note: JWT payload uses 'sub' for user ID
    if (data) {
      if (data === 'id') {
        return user.sub; // Map 'id' to 'sub' from JWT payload
      }
      return user[data];
    }
    
    // Otherwise return the entire user object
    return user;
  },
);
