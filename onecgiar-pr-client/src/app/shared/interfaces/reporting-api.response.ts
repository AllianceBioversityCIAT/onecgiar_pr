import { HttpStatusCode } from '@angular/common/http';

export interface ReportingApiResponse<T> {
  response: T;
  message: string;
  status: HttpStatusCode;
}
