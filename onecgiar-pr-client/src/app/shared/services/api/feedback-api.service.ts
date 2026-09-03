import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type FeedbackType = 'bug' | 'adjustment';

export interface ReportFeedbackBody {
  type: FeedbackType;
  title: string;
  description: string;
  contextUrl?: string;
  userAgent?: string;
}

export interface ReportFeedbackResponse {
  issueKey: string;
  issueUrl: string;
  type: FeedbackType;
}

@Injectable({ providedIn: 'root' })
export class FeedbackApiService {
  private readonly http = inject(HttpClient);
  private readonly baseApiBaseUrl = environment.apiBaseUrl + 'api/';

  /** Creates a bug/adjustment report as a Jira issue under the feedback epic. */
  POST_reportFeedback(body: ReportFeedbackBody): Observable<{ response: ReportFeedbackResponse }> {
    return this.http.post<{ response: ReportFeedbackResponse }>(`${this.baseApiBaseUrl}feedback`, body);
  }
}
