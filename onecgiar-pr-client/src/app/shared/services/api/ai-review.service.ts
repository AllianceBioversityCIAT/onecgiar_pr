import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { DataControlService } from '../data-control.service';
import { AISession, POSTAIAssistantSaveHistory } from '../../interfaces/ai-review.interface';

@Injectable({
  providedIn: 'root'
})
export class AiReviewService {
  showAiReview = signal<boolean>(false);
  http = inject(HttpClient);
  dataControlSE = inject(DataControlService);
  baseApiBaseUrl = environment.apiBaseUrl + 'api/';
  reviewApiUrl = environment.reviewApiUrl;
  sessionId = signal<AISession | null>(null);
  POST_createSession() {
    this.showAiReview.set(true);
    return new Promise((resolve, reject) => {
      return this.http.post<any>(`${this.baseApiBaseUrl}ai/sessions`, { result_id: this.dataControlSE.currentResultSignal().id }).subscribe({
        next: (response: any) => {
          console.log('response', response);
          this.sessionId.set(response.id);
          resolve(response);
        },
        error: (error: any) => {
          console.log('error', error);
          reject(error);
        }
      });
    });
  }

  // POST /api/ai/sessions/{sessionId}/proposals
  POST_createProposal(body: POSTAIAssistantSaveHistory) {
    return new Promise((resolve, reject) => {
      return this.http.post<any>(`${this.baseApiBaseUrl}ai/sessions/${this.sessionId()}/proposals`, body).subscribe({
        next: (response: any) => {
          console.log('response', response);
          resolve(response);
        },
        error: (error: any) => {
          console.log('error', error);
          reject(error);
        }
      });
    });
  }

  //GET /api/ai/result-context/{resultId}
  GET_resultContext() {
    return new Promise((resolve, reject) => {
      return this.http.get<any>(`${this.baseApiBaseUrl}ai/result-context/${this.dataControlSE.currentResultSignal().id}`).subscribe({
        next: (response: any) => {
          console.log('response', response);
        }
      });
    });
  }
  // POST /prms-qa
  POST_prmsQa(body: any) {
    return new Promise((resolve, reject) => {
      return this.http.post<any>(`${this.reviewApiUrl}prms-qa`, body).subscribe({
        next: (response: any) => {
          console.log('response', response);
        }
      });
    });
  }
}
