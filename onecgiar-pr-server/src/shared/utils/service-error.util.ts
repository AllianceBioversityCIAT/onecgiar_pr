import { HttpStatus } from '@nestjs/common';

export type ServiceError = Error & {
  response: unknown;
  status: HttpStatus;
};

/**
 * Throws an Error compatible with HandlersError.returnErrorRes / ReturnResponse.format.
 * Use instead of `throw { message, status, response }` (Sonar requires Error instances).
 */
export function throwServiceError(
  message: string,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
  response: unknown = {},
): never {
  const error = new Error(message) as ServiceError;
  error.response = response;
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
  if (error === null) {
    return 'null';
  }
  if (error === undefined) {
    return 'undefined';
  }
  if (
    typeof error === 'number' ||
    typeof error === 'boolean' ||
    typeof error === 'bigint'
  ) {
    return `${error}`;
  }
  if (typeof error === 'symbol') {
    return error.description ?? error.toString();
  }
  try {
    return JSON.stringify(error);
  } catch {
    return '[Unserializable error]';
  }
}
