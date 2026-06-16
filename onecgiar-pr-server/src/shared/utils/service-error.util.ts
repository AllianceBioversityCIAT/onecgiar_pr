import { HttpStatus } from '@nestjs/common';

export type ServiceError = Error & {
  response: Record<string, unknown>;
  status: HttpStatus;
};

/**
 * Throws an Error compatible with HandlersError.returnErrorRes / ReturnResponse.format.
 * Use instead of `throw { message, status, response }` (Sonar requires Error instances).
 */
export function throwServiceError(
  message: string,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
): never {
  const error = new Error(message) as ServiceError;
  error.response = {};
  error.status = status;
  throw error;
}

export function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error === null || error === undefined) {
    return String(error);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
