import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { IpsrCompletenessStatusService, IpsrCompletenessSection } from '../../../../services/ipsr-completeness-status.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { IPSRDetailRouting } from '../../../router/routing-data-ipsr';

/** One row of the hover panel: a tab, or a step nested under its tab. */
export interface SubmitProgressEntry {
  label: string;
  complete: boolean;
  path: string[];
  nested: boolean;
  /** A heading over its own steps, not a unit of work — see `entries`. */
  group: boolean;
}

/**
 * P2-3748 — the progress ring beside Submit, and the panel that says what is missing.
 *
 * A greyed-out Submit with no explanation is a dead end: on prtest #9409 the button carried
 * `pointer-events: none` and the screen around it never said the words "missing", "pending" or
 * "alerts" (measured 2026-09-21). The reporter had to open each pathway screen looking for the
 * old "N alerts" chip, which only ever gave a number — never a name, never a way back to it.
 *
 * Everything shown here was already in the browser: the green-check response names every failing
 * tab and step, and only its `validResult` flag was being used (`IpsrCompletenessStatusService`).
 *
 * The ring is the one from the section indicator and the word counter — deliberately the same
 * shape: a bare count has no scale, "3 of 6" does.
 */
@Component({
  selector: 'app-ipsr-submit-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ipsr-submit-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IpsrSubmitProgressComponent {
  private readonly completenessSE = inject(IpsrCompletenessStatusService);
  private readonly ipsrDataControlSE = inject(IpsrDataControlService);
  private readonly fieldsManagerSE = inject(FieldsManagerService);
  private readonly router = inject(Router);

  readonly panelOpen = signal(false);
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Same geometry as the section indicator: r=8 on a 22x22 box. */
  readonly ringCircumference = 2 * Math.PI * 8;

  private readonly isDone = (section: IpsrCompletenessSection | undefined): boolean => Boolean(Number(section?.validation ?? 0));

  /**
   * Tabs come from the same table the top menu renders, so the names on this panel are the names
   * on screen — including the P25 renames ("Package and Assess", "Contributors and Partners") and
   * the "Link to results" tab that P25 drops. Green checks are positional: `mainSection[i]` is the
   * i-th visible tab, which is how `app-ipsr-green-check` already reads them.
   */
  private readonly tabs = computed(() =>
    IPSRDetailRouting.filter(option => option.prName && !(this.fieldsManagerSE.isP25() && option.path === 'link-to-results')).map(option => ({
      name:
        option.path === 'ipsr-innovation-use-pathway' && this.fieldsManagerSE.isP25()
          ? 'Package and Assess'
          : option.path === 'contributors' && this.fieldsManagerSE.isP25()
            ? 'Contributors and Partners'
            : option.prName,
      path: option.path
    }))
  );

  /**
   * The tab list, with the pathway's four steps nested underneath it. "Package and Assess" is not
   * one thing — sending the reporter to that tab without saying which step is missing just moves
   * the hunt one screen along.
   */
  readonly entries = computed<SubmitProgressEntry[]>(() => {
    const status = this.completenessSE.status();
    if (!status) return [];

    const base = `/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}`;
    const main = status.mainSection ?? [];
    const steps = status.stepSections ?? [];
    const rows: SubmitProgressEntry[] = [];

    this.tabs().forEach((tab, index) => {
      const isPathway = tab.path === 'ipsr-innovation-use-pathway';

      /*
       * The pathway tab is the AND of its four steps: counting both would report two failures for
       * one gap ("5 of 7" while a single step is missing) and would offer two Go buttons landing on
       * the same screen. It stays as a heading — named, never counted, never clickable — and the
       * steps underneath are what the reporter actually has to finish.
       */
      rows.push({
        label: tab.name as string,
        complete: this.isDone(main[index]),
        path: [base, tab.path as string],
        nested: false,
        group: isPathway
      });

      if (!isPathway) return;
      [...steps]
        .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
        .forEach(step =>
          rows.push({
            label: step.sectionName || `Step ${step.step}`,
            complete: this.isDone(step),
            path: [base, tab.path as string, `step-${step.step}`],
            nested: true,
            group: false
          })
        );
    });

    return rows;
  });

  /** Headings do not count: only what someone has to go and finish. */
  private readonly countable = computed(() => this.entries().filter(entry => !entry.group));
  readonly total = computed(() => this.countable().length);
  readonly done = computed(() => this.countable().filter(entry => entry.complete).length);
  readonly missing = computed(() => this.countable().filter(entry => !entry.complete));
  readonly isComplete = computed(() => this.total() > 0 && this.done() === this.total());

  /** No ring before the first green-check answer lands: an empty ring would read as "0 of 0 done". */
  readonly showRing = computed(() => this.total() > 0);
  readonly ringOffset = computed(() => {
    const total = this.total();
    if (!total) return this.ringCircumference;
    return this.ringCircumference * (1 - this.done() / total);
  });

  readonly label = computed(() => (this.isComplete() ? 'Ready to submit' : `${this.done()} of ${this.total()} complete`));

  openPanel(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.panelOpen.set(true);
  }

  /** Small grace period so the pointer can travel from the ring to the panel without it closing. */
  scheduleClose(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.panelOpen.set(false), 220);
  }

  closePanel(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.panelOpen.set(false);
  }

  goTo(entry: SubmitProgressEntry): void {
    this.closePanel();
    this.router.navigate(entry.path, { queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase } });
  }

  trackByEntry(_index: number, entry: SubmitProgressEntry): string {
    return entry.path.join('/') + entry.label;
  }
}
