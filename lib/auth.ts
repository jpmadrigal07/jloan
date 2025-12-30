import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

const secret = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'auth-token';

export interface JWTPayload {
  authenticated: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT token with 7-day expiration
 */
export async function signToken(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    // Validate payload structure matches our custom JWTPayload
    if (typeof payload === 'object' && payload !== null && 'authenticated' in payload) {
      return payload as unknown as JWTPayload;
    }
    throw new Error('Invalid token payload structure');
  } catch (_error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract JWT from httpOnly cookie in request
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const cookieHeader = request.cookies.get(COOKIE_NAME);
  return cookieHeader?.value || null;
}

/**
 * Verify authentication from request
 * Returns the payload if valid, throws error if invalid
 */
export async function verifyAuth(request: NextRequest): Promise<JWTPayload> {
  const token = getTokenFromRequest(request);
  if (!token) {
    throw new Error('No authentication token found');
  }
  return verifyToken(token);
}

/**
 * Set auth cookie in response
 */
export function setAuthCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isProduction ? '; Secure' : ''}`;
}

/**
 * Clear auth cookie
 */
export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
