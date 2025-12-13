export class SessionResponseDto {
  id: string;
  email: string;
  name: string | null;
  role: string;
  school_id: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_first_login: boolean;
}

export class ValidateSessionResponseDto {
  valid: boolean;
  user?: SessionResponseDto;
  message?: string;
}
