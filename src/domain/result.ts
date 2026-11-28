// Satisfies: EC-001, NFR-004
// Type-safe functional Result type for pure domain errors.

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

/** Ok. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/** Err. */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** @testonly */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/** @testonly */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/** @testonly */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (val: T) => U): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.value));
  }
  return result;
}

/** @testonly */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
