import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SaveButtonService } from '../../../custom-fields/save-button/save-button.service';

@Injectable({
  providedIn: 'root'
})
export class BilateralApiService {
  private readonly http = inject(HttpClient);
  private readonly saveButtonSE = inject(SaveButtonService);

  private readonly baseApiBaseUrl = environment.apiBaseUrl + 'api/';

  GET_bilateralProjects(centerId: string | number) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/projects?centerId=${centerId}`);
  }

  POST_createBilateralHeader(body: Record<string, unknown>) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/bilateral/center/create-header`, body);
  }

  PATCH_plannedResult(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/bilateral/center/planned-result/${resultId}`, body);
  }

  PATCH_tocMapping(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/bilateral/center/toc-mapping/${resultId}`, body);
  }

  PATCH_contributors(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/bilateral/center/contributors/${resultId}`, body);
  }

  GET_tocState(resultId: number | string) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/toc-state/${resultId}`);
  }

  GET_BilateralResultDetail(resultId: string | number) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/results/bilateral/${resultId}`);
  }

  PATCH_BilateralReviewDecision(resultId: string | number, body: { decision: 'APPROVE' | 'REJECT'; justification: string }) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/results/bilateral/${resultId}/review-decision`, body);
  }

  PATCH_generalInfo(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/results/bilateral/general-info/${resultId}`, body);
  }

  PATCH_BilateralResultTitle(resultId: number | string, body: any) {
    return this.http.patch<any>(`${this.baseApiBaseUrl}results/bilateral/${resultId}/title`, body);
  }

  PATCH_BilateralTocMetadata(resultId: number | string, body: any) {
    return this.http
      .patch<any>(`${this.baseApiBaseUrl}results/bilateral/review-update/toc-metadata/${resultId}`, body)
      .pipe(this.saveButtonSE.isSavingPipe());
  }

  PATCH_BilateralDataStandard(resultId: number | string, body: any) {
    return this.http
      .patch<any>(`${this.baseApiBaseUrl}results/bilateral/review-update/data-standard/${resultId}`, body)
      .pipe(this.saveButtonSE.isSavingPipe());
  }
}
