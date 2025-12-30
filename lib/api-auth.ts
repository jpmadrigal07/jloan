import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './auth';

/**
 * Require authentication for API routes
 * Returns the JWT payload if authenticated, otherwise throws an error
 * Use this in API route handlers to protect endpoints
 */
export async function requireAuth(request: NextRequest) {
  try {
    const payload = await verifyAuth(request);
    return payload;
  } catch (error) {
    throw new Error('Unauthorized');
  }
}

/**
 * Helper to return 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

