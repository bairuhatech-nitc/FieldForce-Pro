export interface JwtPayload {
  sub: string; // user id
  email: string;
  tenant_id: string;
  session_id: string;
  // Roles and permissions removed to keep JWT under 4KB cookie limit
  // They are available via /auth/me endpoint instead
  iat?: number;
  exp?: number;
}
