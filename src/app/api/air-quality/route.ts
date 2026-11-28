import { NextRequest } from 'next/server';
import { handleAirQuality } from '@/server/api/airQuality';

/** Next.js GET route handler for /api/air-quality. */
export function GET(req: NextRequest) {
  return handleAirQuality(req);
}
