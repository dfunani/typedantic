import type { ValidationErrorDetail } from '../schema/types.js';

export class ValidationError extends Error {
  readonly errors: ValidationErrorDetail[];

  constructor(errors: ValidationErrorDetail[]) {
    const msg = errors.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('; ');
    super(msg);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  errorCount(): number {
    return this.errors.length;
  }

  json(): string {
    return JSON.stringify({ detail: this.errors });
  }

  toJSON(): { detail: ValidationErrorDetail[] } {
    return { detail: this.errors };
  }
}

export function createError(
  type: string,
  loc: (string | number)[],
  msg: string,
  input: unknown,
  ctx?: Record<string, unknown>,
): ValidationErrorDetail {
  return { type, loc, msg, input, ...(ctx ? { ctx } : {}) };
}
