import { z } from 'zod';
import type { ApiError } from '../../domain/types';
import { createApiError, ErrorCode } from '../http/errors';

/** Single authoritative body and query limits table (API.md & SECURITY.md). */
export const BODY_LIMITS = {
  defaultJsonBytes: 16 * 1024,
  maxQueryLength: 100,
  maxQuestionLength: 300,
} as const;

/** Single authoritative per-IP per-minute rate limits table (API.md & SECURITY_AUDIT.md). */
export const RATE_LIMITS = {
  playbookPerMinute: 15,
  askPerMinute: 8,
  bulletinPerMinute: 10,
  cityScenarioPerMinute: 30,
  airQualityPerMinute: 30,
} as const;

export const MAX_BODY_BYTES = BODY_LIMITS.defaultJsonBytes;
export const MAX_QUERY_LENGTH = BODY_LIMITS.maxQueryLength;
export const MAX_QUESTION_LENGTH = BODY_LIMITS.maxQuestionLength;

export type BoundaryResult<T> =
  { ok: true; value: T } | { ok: false; error: ApiError; status: number };

export interface BoundaryFailure {
  ok: false;
  error: ApiError;
  status: number;
}

async function readRequestText(
  req: Request,
  requestId: string,
  maxBytes: number
): Promise<{ ok: true; text: string } | BoundaryFailure> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return boundaryError(
      ErrorCode.BAD_REQUEST,
      'Content-Type must be application/json',
      requestId,
      415
    );
  }
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > maxBytes) {
    return boundaryError(ErrorCode.BAD_REQUEST, 'Request body too large', requestId, 413);
  }
  try {
    const text = await req.text();
    if (new TextEncoder().encode(text).length > maxBytes) {
      return boundaryError(ErrorCode.BAD_REQUEST, 'Request body too large', requestId, 413);
    }
    return { ok: true, text };
  } catch {
    return boundaryError(ErrorCode.BAD_REQUEST, 'Malformed JSON body', requestId, 400);
  }
}

/** Validates Content-Type, byte size cap, JSON syntax, and Zod schema for incoming requests. */
export async function readJsonBoundary<T>(
  req: Request,
  schema: z.ZodType<T>,
  requestId: string,
  maxBytes: number = MAX_BODY_BYTES
): Promise<BoundaryResult<T>> {
  const rawBody = await readRequestText(req, requestId, maxBytes);
  if (!rawBody.ok) return rawBody;
  let raw: unknown;
  try {
    raw = JSON.parse(rawBody.text);
  } catch {
    return boundaryError(ErrorCode.BAD_REQUEST, 'Malformed JSON body', requestId, 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: createApiError(
        ErrorCode.VALIDATION_ERROR,
        'Request validation failed',
        requestId,
        parsed.error.issues
      ),
    };
  }
  return { ok: true, value: parsed.data };
}

/** Builds a standardized BoundaryFailure response object. */
export function boundaryError(
  code: Parameters<typeof createApiError>[0],
  message: string,
  requestId: string,
  status: number
): BoundaryFailure {
  return {
    ok: false,
    status,
    error: createApiError(code, message, requestId),
  };
}
