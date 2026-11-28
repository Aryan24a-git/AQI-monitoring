import { NextResponse } from 'next/server';
import { securityJson } from '@/server/security/response';

/** Next.js GET route handler for /api/health. */
export function GET() {
  return securityJson({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
