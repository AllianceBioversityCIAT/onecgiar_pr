import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { SaveButtonService } from '../../../custom-fields/save-button/save-button.service';

@Injectable({
  providedIn: 'root'
})
export class BilateralApiService {
  private readonly http = inject(HttpClient);
  private readonly saveButtonSE = inject(SaveButtonService);

  private readonly baseApiBaseUrl = environment.apiBaseUrl + 'api/';
  private readonly resultsApiBaseUrl = environment.apiBaseUrl + 'api/results/';

  GET_bilateralProjects(centerId: string | number) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/projects?centerId=${centerId}`);
  }

  GET_bilateralCenterResults(centerId: string, versionId: number) {
    return this.http.get<any>(
      `${this.resultsApiBaseUrl}bilateral-center-results`,
      { params: { centerId, versionId: String(versionId) } }
    );
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

  GET_BilateralResultDetail(resultId: string | number, versionId?: number) {
    const params = versionId ? { versionId: String(versionId) } : undefined;
    return this.http.get<any>(`${environment.apiBaseUrl}api/results/bilateral/${resultId}`, params ? { params } : {});
  }

  PATCH_BilateralReviewDecision(resultId: string | number, body: { decision: 'APPROVE' | 'REJECT'; justification: string }) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/results/bilateral/${resultId}/review-decision`, body);
  }

  PATCH_generalInfo(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/results/bilateral/general-info/${resultId}`, body);
  }

  PATCH_geographic(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(
      `${environment.apiBaseUrl}v2/api/geographic-location/update/geographic/${resultId}`,
      body
    );
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

  // --- Legacy result-review endpoints (same URLs as ResultsApiService) ---

  GET_capacityDevelopment(resultId: number | string) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}summary/capacity-developent/get/result/${resultId}`);
  }

  PATCH_capacityDevelopment(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${this.resultsApiBaseUrl}summary/capacity-developent/create/result/${resultId}`, body);
  }

  GET_capdevsDeliveryMethod() {
    return this.http.get<any>(`${this.resultsApiBaseUrl}capdevs-delivery-methods/get/all`);
  }

  GET_innovationDev(resultId: number | string) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}summary/innovation-dev/get/result/${resultId}`);
  }

  PATCH_innovationDev(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${this.resultsApiBaseUrl}summary/innovation-dev/create/result/${resultId}`, body);
  }

  GET_innovationUse(resultId: number | string) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}summary/innovation-use/get/result/${resultId}`);
  }

  PATCH_innovationUse(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${this.resultsApiBaseUrl}summary/innovation-use/create/result/${resultId}`, body);
  }

  GET_policyChanges(resultId: number | string) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}summary/policy-changes/get/result/${resultId}`);
  }

  GET_policyChangesQuestions(resultId: number | string) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}questions/policy-change/${resultId}`);
  }

  PATCH_policyChanges(resultId: number | string, body: Record<string, unknown>) {
    return this.http.patch<any>(`${this.resultsApiBaseUrl}summary/policy-changes/create/result/${resultId}`, body);
  }

  GET_evidences(resultId: number | string) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}evidences/get/${resultId}`);
  }

  POST_evidences(resultId: number | string, formData: FormData) {
    return this.http.post<any>(`${this.resultsApiBaseUrl}evidences/create/${resultId}`, formData);
  }

  GET_knowledgeProduct(resultId: number | string) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}results-knowledge-products/get/result/${resultId}`);
  }

  // ── Bilateral AI endpoints ──────────────────────────────────────────

  POST_bilateralAiJob(formData: FormData) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/jobs`, formData);
  }

  GET_bilateralAiJob(jobId: string) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/jobs/${jobId}`);
  }

  GET_bilateralAiDrafts() {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/drafts`);
  }

  GET_bilateralAiDraft(draftId: number) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/drafts/${draftId}`);
  }

  PATCH_bilateralAiEvidence(draftId: number, evidenceId: number, body: { is_formal_evidence: boolean }) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/drafts/${draftId}/evidence/${evidenceId}`, body);
  }

  POST_promoteBilateralAiDraft(draftId: number) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/drafts/${draftId}/promote`, {});
  }

  DELETE_bilateralAiDraft(draftId: number) {
    return this.http.delete<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/drafts/${draftId}`);
  }

  GET_bilateralAiFileSignedUrl(key: string) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/files/signed-url`, {
      params: new HttpParams().set('key', key),
    });
  }
}
