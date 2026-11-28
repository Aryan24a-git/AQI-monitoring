// Satisfies: TEST-001, SEC-001, OBS-001, EC-001
import { describe, it, expect } from 'vitest';
import { getRequestId, REQUEST_ID_HEADER } from '../../src/server/http/requestId';
import { createApiError, ErrorCode } from '../../src/server/http/errors';

describe('Server HTTP Utilities', () => {
  it('extracts or generates request ID cleanly', () => {
    const reqWithId = new Request('http://localhost:3000/api/playbook', {
      headers: { [REQUEST_ID_HEADER]: 'req-abc-123' },
    });
    expect(getRequestId(reqWithId)).toBe('req-abc-123');

    const reqWithoutId = new Request('http://localhost:3000/api/playbook');
    const generated = getRequestId(reqWithoutId);
    expect(generated).toBeDefined();
    expect(generated.length).toBeGreaterThan(10);
  });

  it('creates standardized API error formats', () => {
    const err = createApiError(ErrorCode.NOT_FOUND, 'Resource was not found', 'req-999', {
      id: '123',
    });
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
    expect(err.message).toBe('Resource was not found');
    expect(err.requestId).toBe('req-999');
    expect(err.details).toEqual({ id: '123' });
    expect(err.timestamp).toBeDefined();
  });
});
