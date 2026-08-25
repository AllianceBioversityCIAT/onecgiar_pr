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

  /** `justification` is mandatory on REJECT and an optional reviewer comment on APPROVE (P2-3157). */
  PATCH_BilateralReviewDecision(resultId: string | number, body: { decision: 'APPROVE' | 'REJECT'; justification?: string }) {
    return this.http.patch<any>(`${environment.apiBaseUrl}api/results/bilateral/${resultId}/review-decision`, body);
  }

  /** P2-3157 AC4: review trail of a bilateral result — the rejection justification lives in `comment`. */
  GET_bilateralReviewHistory(resultId: string | number) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/results/bilateral/${resultId}/review-history`);
  }

  /**
   * P2-3157 AC3: centres linked to a result, used on notification click to find the lead centre and
   * route to its bilateral dashboard. Fetched on demand so the notification list queries stay lean.
   */
  GET_centersByResultId(resultId: string | number) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}get/centers/${resultId}`);
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

  /**
   * Geographic Location belongs to the bilateral editor, so its read must use
   * the same resolved internal result id as its autosave PATCH.
   */
  GET_geographic(resultId: number | string) {
    return this.http.get<any>(
      `${environment.apiBaseUrl}v2/api/geographic-location/get/geographic/${resultId}`
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

  GET_capdevsTerms() {
    return this.http.get<any>(`${this.resultsApiBaseUrl}capdevs-terms/get/all`);
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

  GET_actorsTypes() {
    return this.http.get<any>(`${this.resultsApiBaseUrl}actors/type/all`);
  }

  GET_institutionsTypeTree() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/institutions-type/tree`);
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

  /**
   * P2-3384: the MELIA answers are the only part of the Knowledge Product section a researcher
   * edits — the rest of the payload is metadata mirrored from the repository and is never sent.
   */
  PATCH_knowledgeProductMelia(resultId: number | string, body: Record<string, unknown>) {
    return this.http
      .patch<any>(`${this.resultsApiBaseUrl}results-knowledge-products/upsert/${resultId}`, body)
      .pipe(this.saveButtonSE.isSavingPipe());
  }

  /** Re-reads the repository record; the section reloads from the response. */
  PATCH_resyncKnowledgeProduct(resultId: number | string) {
    return this.http.patch<any>(`${this.resultsApiBaseUrl}results-knowledge-products/resync/${resultId}`, null);
  }

  /** MELIA studies declared in the result's OST section 6.3 — portfolios before 2025-2030. */
  GET_ostMeliaStudies(resultId: number | string) {
    return this.http.get<any>(`${this.resultsApiBaseUrl}melia-studies/get/all/result/${resultId}`);
  }

  /** MELIA studies of the science program's Theory of Change — the 2025-2030 portfolio. */
  GET_tocMeliaStudies(programId: number | string) {
    return this.http.get<{ response: Array<{ melia_id: string; title: string; official_code: string }> }>(
      `${environment.apiBaseUrl}v2/api/results/melia-studies/get/all/toc/${programId}`
    );
  }

  GET_clarisaMeliaStudyTypes() {
    return this.http.get<any>(`${environment.apiBaseUrl}clarisa/melia-study-type/get/all`);
  }

  // ── Bilateral AI endpoints ──────────────────────────────────────────

  POST_bilateralAiJob(formData: FormData) {
    return this.http.post<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/jobs`, formData);
  }

  GET_bilateralAiJob(jobId: string) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/jobs/${jobId}`);
  }

  GET_bilateralAiDrafts(centerId: number) {
    return this.http.get<any>(`${environment.apiBaseUrl}api/bilateral/center/ai/drafts?centerId=${centerId}`);
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
