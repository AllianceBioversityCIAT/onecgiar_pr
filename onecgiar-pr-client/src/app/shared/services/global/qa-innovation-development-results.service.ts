import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

/**
 * P2-3420 / P2-3421 — the "link to a QA'd Innovation Development result" question exists from the
 * 2026 reporting phase onwards ONLY. Earlier phases must render exactly as they do today.
 *
 * 🛑 This is a PHASE-YEAR threshold, not a portfolio one. `isP25()` would switch the field on for
 * 2025-phase results, which live inside the P25 portfolio in prtest. Declared here (and not inside
 * `ReportingDesignYear`) for the same reason the bilateral twin declares its own copy: that enum is
 * a shared file this story does not own.
 */
export const INNOVATION_LINK_MIN_PHASE_YEAR = 2026;

/** Verbatim wording from P2-3421 / P2-3420. QA reads it back word for word — do not paraphrase. */
export const INNOVATION_LINK_QUESTION =
  'Are you reporting the use of an innovation that has already been reported and quality assessed?';

/** `result_type_id` of Innovation use — the only category that shows the question. */
export const INNOVATION_USE_RESULT_TYPE_ID = 2;

export interface QaInnovationDevelopmentOption {
  id: number;
  result_code: number;
  title: string;
  status_id: number;
  phase_year: number;
  acronym: string | null;
  /** `[Result ID] - [Result Title]`, precomputed — see `display` note below. */
  display: string;
}

/**
 * QA'D INNOVATION DEVELOPMENT CATALOGUE — the single client-side owner of the dropdown's data.
 *
 * 🛑 One service, one request, three surfaces (emergent-result modal, ToC-linked create form and
 * the lab report form). P2-3422 owns the endpoint; this is the only place that calls it, so the
 * three creation screens can never end up offering different lists.
 *
 * ⚠️ Deliberately NOT `InnovationUseResultsService`: that one serves the wider Contributors &
 * Partners multi-select (every result type, every status) and changing it would alter that screen.
 *
 * ⚠️ `display` is precomputed because `app-pr-select`'s type-ahead filters on `optionLabel` and
 * nothing else. Binding `optionLabel="title"` would make the ID unsearchable, and the story asks
 * for search by BOTH Innovation ID and title.
 */
@Injectable({ providedIn: 'root' })
export class QaInnovationDevelopmentResultsService {
  private readonly api = inject(ApiService);

  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly options = signal<QaInnovationDevelopmentOption[]>([]);
  readonly isEmpty = computed(() => this.loaded() && this.options().length === 0);

  /** Idempotent: the first caller fetches, every later caller reuses the cached list. */
  load(): void {
    if (this.loaded() || this.loading()) return;
    this.loading.set(true);

    this.api.resultsSE.GET_qaInnovationDevelopmentResults().subscribe({
      next: ({ response }: any) => {
        this.options.set((response ?? []).map((item: any) => this.toOption(item)));
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: () => {
        // Fail soft: an empty dropdown is recoverable (answer "No"), a broken create screen is not.
        this.options.set([]);
        this.loading.set(false);
      }
    });
  }

  private toOption(item: any): QaInnovationDevelopmentOption {
    const code = item?.result_code ?? item?.id;
    const title = `${item?.title ?? ''}`.trim();
    return {
      id: Number(item?.id),
      result_code: Number(code),
      title,
      status_id: Number(item?.status_id),
      phase_year: Number(item?.phase_year),
      acronym: item?.acronym ?? null,
      display: `${code} - ${title}`
    };
  }
}

/**
 * The 2026-onwards gate, in one place so the three creation surfaces cannot drift.
 * A phase year that has not resolved yet is treated as the open phase: every creation screen only
 * ever reports into the running cycle, and hiding the question on the first frame would let a user
 * create a result without ever being asked.
 */
export function showsInnovationLinkQuestion(resultTypeId: number | null | undefined, phaseYear: number | null | undefined): boolean {
  if (Number(resultTypeId) !== INNOVATION_USE_RESULT_TYPE_ID) return false;
  return phaseYear == null || Number(phaseYear) >= INNOVATION_LINK_MIN_PHASE_YEAR;
}

/**
 * The create gate: "Yes" is only a complete answer once an innovation has been picked.
 * "No" (the default) is always complete, which is what makes the field mandatory-but-answered.
 */
export function innovationLinkAnswerIsComplete(hasInnovationLink: boolean | null | undefined, linkedResultId: number | null | undefined): boolean {
  if (hasInnovationLink !== true) return true;
  return linkedResultId != null;
}
