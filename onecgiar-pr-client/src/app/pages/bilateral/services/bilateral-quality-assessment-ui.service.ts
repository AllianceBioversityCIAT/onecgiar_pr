import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, filter, finalize, map, of, switchMap, take, tap, throwError, timeout, timer } from 'rxjs';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

/** How long the client waits on a `running` row before telling the user to come back. */
const POLL_WINDOW_MS = 70_000;
const POLL_INTERVAL_MS = 3000;

export type QualityAssessmentStatus = 'running' | 'completed' | 'unavailable' | 'skipped_kp_rule';
export type QualityVerdict = 'green' | 'amber' | 'red' | 'grey';

export interface BilateralQualityAssessmentView {
  id: number;
  result_id: number;
  status: QualityAssessmentStatus;
  is_current: boolean;
  ai_status: 'completed' | 'partial' | null;
  degraded_reason: string | null;
  unavailable_reason: string | null;
  overall: { verdict: QualityVerdict | null; score: number | null; summary: string | null };
  sections: Record<string, {
    verdict: QualityVerdict;
    score?: number | null;
    comments?: string | null;
    strengths?: string[];
    /** AI-side field names the issues point at. Stored and carried; nothing renders them yet. */
    fields?: string[];
    issues?: string[];
  }>;
  evidence: Array<{ index: number; verdict: QualityVerdict; reason: string }>;
}

/** UI state only: the server remains the authority for locks, freshness and submission. */
@Injectable({ providedIn: 'root' })
export class BilateralQualityAssessmentUiService {
  private readonly api = inject(BilateralApiService);

  readonly assessment = signal<BilateralQualityAssessmentView | null>(null);
  readonly state = signal<'idle' | 'assessing' | 'deciding' | 'submitting'>('idle');
  readonly error = signal<string | null>(null);
  /** True only while the AI check itself is in flight — never while the submit PATCH is. */
  readonly isRunning = computed(() => this.state() === 'assessing');
  readonly isSubmitting = computed(() => this.state() === 'submitting');
  /** Any request in flight: what the rail's Submit button disables on. */
  readonly isBusy = computed(() => this.isRunning() || this.isSubmitting());
  /**
   * One surface for the whole flow: it opens the moment the check starts and stays open through the
   * verdict and the submit. Two separate overlays would swap mid-flight, and the rail button alone
   * is too small a signal for a wait that can run a minute.
   */
  readonly isDialogOpen = computed(() => this.isRunning() || this.state() === 'deciding' || this.isSubmitting());

  run(resultId: number) {
    this.state.set('assessing');
    this.error.set(null);
    return this.api.POST_bilateralQualityAssessment(resultId).pipe(
      map((envelope: { response: BilateralQualityAssessmentView }) => envelope.response),
      switchMap((assessment) => assessment.status === 'running'
        ? timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS).pipe(
          switchMap(() => this.readLatest(resultId)),
          filter((latest): latest is BilateralQualityAssessmentView => !!latest && latest.status !== 'running'),
          take(1),
          timeout(POLL_WINDOW_MS),
          // A timeout is NOT 'unavailable': the server row is still `running`, and submit-for-review
          // rejects a decision against a running row. So we keep the row on the rail (which renders
          // its own "still running" line) and say plainly that the verdict is not ready yet — the
          // bare TimeoutError would have reached the user as 'Unknown error'.
          catchError((error) => {
            this.assessment.set(assessment);
            const message = 'The quality check is taking longer than usual. It is still running — reopen this result in a few minutes to see the verdict.';
            this.error.set(message);
            return throwError(() => (error?.name === 'TimeoutError' ? new Error(message) : error));
          }),
        )
        : of(assessment)),
      map((assessment) => {
        this.assessment.set(assessment);
        this.state.set('deciding');
        return assessment;
      }),
      finalize(() => {
        if (this.state() === 'assessing') this.state.set('idle');
      }),
    );
  }

  /** Rehydrates the persisted audit row after navigation or a browser refresh. */
  loadLatest(resultId: number) {
    return this.readLatest(resultId).pipe(
      tap((assessment) => {
        this.assessment.set(assessment);
        this.state.set('idle');
      }),
    );
  }

  private readLatest(resultId: number) {
    return this.api.GET_bilateralQualityAssessmentLatest(resultId).pipe(
      map((envelope: { response: BilateralQualityAssessmentView | { latest: null } }) => envelope.response),
      map((response) => 'latest' in response ? response.latest : response),
    );
  }

  /**
   * The AI's flag for one form field, or `null` when there is nothing to show.
   *
   * ⚠️ `fields` is section-level, NOT paired with `issues`: the AI sends "these are the fields this
   * section's feedback concerns" (geographic_location came back with 1 issue and 4 fields). So the
   * comments returned here are the SECTION's, not the field's — there is no per-field comment in
   * the contract to return. Getting one is a contract ask, not a client change.
   *
   * Green and grey never flag: green has nothing to correct and grey means the AI could not
   * evaluate it. A stale assessment STILL flags: once the reporter starts correcting a field, the
   * server correctly invalidates the assessment for submission, but hiding the instruction at that
   * point removes the only guidance the reporter is using to make the correction. Freshness is
   * enforced by submit-for-review, not by this read-only aid.
   */
  flagForField(sectionKey: string, field: string): { verdict: QualityVerdict; issues: string[] } | null {
    const assessment = this.assessment();
    if (!assessment) return null;
    const section = assessment.sections?.[sectionKey];
    if (!section) return null;
    if (section.verdict !== 'amber' && section.verdict !== 'red') return null;
    if (!section.fields?.includes(field)) return null;
    return { verdict: section.verdict, issues: section.issues ?? [] };
  }

  /**
   * How many field-level markers are currently ON SCREEN per section, kept by the markers
   * themselves. It exists so {@link flagForSection} can step back when the fields already carry the
   * message: both render the same text — the issues are section-level — so showing both said
   * everything twice (feedback 2026-09-18).
   *
   * A live count rather than a hand-kept list: place a field marker anywhere and the section note
   * yields automatically, and a marker whose field the AI did not name never registers, so the
   * section note still appears. A list would rot the first time someone forgets to update it.
   */
  private readonly renderedFieldMarkers = signal<Record<string, number>>({});

  setFieldMarkerRendered(sectionKey: string, rendered: boolean): void {
    this.renderedFieldMarkers.update((counts) => {
      const next = (counts[sectionKey] ?? 0) + (rendered ? 1 : -1);
      return { ...counts, [sectionKey]: Math.max(0, next) };
    });
  }

  /**
   * The AI's flag for a whole section. Same gates as {@link flagForField} — amber/red only,
   * including an assessment that became stale while the reporter is applying its feedback.
   *
   * This is what guarantees the feedback is on screen wherever the window's "Go to <section>" link
   * drops the reporter: field-level flags only exist for fields the AI named and that we placed a
   * marker on, so without this a reporter could follow the link and arrive at a section showing
   * nothing.
   */
  flagForSection(sectionKey: string): { verdict: QualityVerdict; issues: string[] } | null {
    const assessment = this.assessment();
    if (!assessment) return null;
    const section = assessment.sections?.[sectionKey];
    if (!section) return null;
    if (section.verdict !== 'amber' && section.verdict !== 'red') return null;
    // Yield to the fields when they are already saying it.
    if ((this.renderedFieldMarkers()[sectionKey] ?? 0) > 0) return null;
    return { verdict: section.verdict, issues: section.issues ?? [] };
  }

  openStored(): void {
    if (this.assessment() && !this.isBusy()) this.state.set('deciding');
  }

  reset(): void {
    this.assessment.set(null);
    this.error.set(null);
    this.state.set('idle');
  }

  submit(resultId: number, decision: 'submitted_anyway' | 'submitted_without_check') {
    const assessment = this.assessment();
    if (!assessment) throw new Error('No quality assessment is available for submission.');
    this.state.set('submitting');
    return this.api.PATCH_bilateralSubmitForReview(resultId, {
      assessment_id: assessment.id,
      decision,
    }).pipe(
      tap({
        // Submitted: the window has done its job and the result is now read-only. Closing here
        // rather than from the component is what makes it stick — `close()` is gated on
        // `isBusy()`, so a caller closing on `next` ran while the state was still `submitting`
        // and was silently a no-op, and then the window came back.
        next: () => this.state.set('idle'),
        // A failed submit returns to the verdict, not to a blank editor: the user still has to
        // decide, and re-running the check would only produce the same row.
        error: () => this.state.set('deciding'),
      }),
      // Only for an early unsubscribe, which neither handler above sees.
      finalize(() => {
        if (this.state() === 'submitting') this.state.set('deciding');
      }),
    );
  }

  /** Closes the detail view only. The stored assessment stays on the rail as history. */
  close(): void {
    if (!this.isBusy()) this.state.set('idle');
  }
}
