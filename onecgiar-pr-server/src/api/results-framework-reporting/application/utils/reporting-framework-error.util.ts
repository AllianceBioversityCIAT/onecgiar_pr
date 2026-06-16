import { HttpStatus } from '@nestjs/common';

export function throwReportingFrameworkError(
  message: string,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
): never {
  const error = new Error(message);
  (error as any).response = {};
  (error as any).status = status;
  throw error;
}
