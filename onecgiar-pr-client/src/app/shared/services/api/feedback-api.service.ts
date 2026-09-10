import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type FeedbackType = 'bug' | 'adjustment';

/** Jira priority ids for P2. Highest → Lowest. */
export type FeedbackPriorityId = '1' | '2' | '3' | '4' | '5';

export interface FeedbackAttachment {
  name: string;
  mimeType: string;
  dataBase64: string;
}

export interface ReportFeedbackBody {
  type: FeedbackType;
  title: string;
  description: string;
  contextUrl?: string;
  userAgent?: string;
  priority?: FeedbackPriorityId;
  attachments?: FeedbackAttachment[];
  consoleLogs?: string[];
}

export interface ReportFeedbackResponse {
  issueKey: string;
  issueUrl: string;
  type: FeedbackType;
  attachmentsUploaded?: number;
  consoleSubTask?: string | null;
}

/**
 * A report as the reporter is allowed to see it. Resolved live from Jira on
 * every call — nothing about these is stored on our side. Internal comments,
 * assignee and activity are not part of this shape by design.
 */
export interface FeedbackReport {
  issueKey: string;
  issueUrl: string;
  title: string;
  type: string;
  stage: string;
  released: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class FeedbackApiService {
  private readonly http = inject(HttpClient);
  private readonly baseApiBaseUrl = environment.apiBaseUrl + 'api/';

  /** Creates a bug/adjustment report as a Jira issue under the feedback epic. */
  POST_reportFeedback(body: ReportFeedbackBody): Observable<{ response: ReportFeedbackResponse }> {
    return this.http.post<{ response: ReportFeedbackResponse }>(`${this.baseApiBaseUrl}feedback`, body);
  }

  /** The current user's own reports, matched in Jira by their email. */
  GET_myFeedbackReports(): Observable<{ response: FeedbackReport[] }> {
    return this.http.get<{ response: FeedbackReport[] }>(`${this.baseApiBaseUrl}feedback/my-reports`);
  }

  /** Existing reports that look like what the user is typing, to avoid duplicates. */
  GET_similarFeedbackReports(query: string): Observable<{ response: FeedbackReport[] }> {
    return this.http.get<{ response: FeedbackReport[] }>(`${this.baseApiBaseUrl}feedback/similar`, {
      params: { q: query }
    });
  }

  /** Joins an existing report instead of filing a duplicate. */
  POST_meTooFeedback(issueKey: string): Observable<{ response: { issueKey: string; issueUrl: string } }> {
    return this.http.post<{ response: { issueKey: string; issueUrl: string } }>(`${this.baseApiBaseUrl}feedback/me-too`, {
      issueKey
    });
  }
}
