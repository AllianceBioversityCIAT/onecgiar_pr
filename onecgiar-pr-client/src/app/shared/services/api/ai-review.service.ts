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
  baseApiUrlV2 = environment.apiBaseUrl + 'v2/api/';
  reviewApiUrl = environment.reviewApiUrl;
  sessionId = signal<AISession | null>(null);
  aiReviewButtonState: 'idle' | 'loading' | 'completed' = 'idle';

  async onAIReviewClick() {
    if (this.aiReviewButtonState !== 'idle') return;

    this.aiReviewButtonState = 'loading';

    try {
      await this.POST_createSession();
      await this.GET_aiContext();
      await this.GET_resultContext();

      // Mostrar animación de completado
      this.aiReviewButtonState = 'completed';

      // Esperar a que termine la animación antes de abrir el modal
      setTimeout(() => {
        this.showAiReview.set(true);
        this.aiReviewButtonState = 'idle';
      }, 600);
    } catch (error) {
      console.error('Error creating AI session:', error);
      this.aiReviewButtonState = 'idle';
    }
  }

  POST_createSession() {
    return new Promise((resolve, reject) => {
      return this.http.post<any>(`${this.baseApiBaseUrl}ai/sessions`, { result_id: this.dataControlSE.currentResultSignal().id }).subscribe({
        next: (response: any) => {
          this.sessionId.set(response.id);
          console.log('response', response.response);
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
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
          console.error('error', error);
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
          console.log('response', response.response);
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
          reject(error);
        }
      });
    });
  }
  // POST /prms-qa
  POST_prmsQa(body: any) {
    return new Promise((resolve, reject) => {
      return this.http.post<any>(`${this.reviewApiUrl}prms-qa`, body).subscribe({
        next: (response: any) => {
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
          reject(error);
        }
      });
    });
  }

  // GET /v2/api/results/ai/context
  GET_aiContext() {
    return new Promise((resolve, reject) => {
      return this.http.get<any>(`${this.baseApiUrlV2}results/ai/context`).subscribe({
        next: (response: any) => {
          console.log('response', response.response);
          resolve(response);
        },
        error: (error: any) => {
          console.error('error', error);
          reject(error);
        }
      });
    });
  }

  // api/ai/result-context/{resultId}
}
