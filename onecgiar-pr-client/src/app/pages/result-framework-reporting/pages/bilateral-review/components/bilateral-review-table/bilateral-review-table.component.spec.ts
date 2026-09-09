// @akili-spec changes/sp-bilateral-review-tab (BRT-T-4, BRT-T-5, BRT-AC-8, BRT-AC-15)
// @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-8, R-9, R-11, R-12, R-14 (f))
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralReviewTableComponent, BilateralReviewGroup } from './bilateral-review-table.component';
import { ResultToReview } from '../result-review-drawer/result-review-drawer.interfaces';
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';

function row(partial: Partial<ResultToReview> & { id: string }): ResultToReview {
  return {
    project_id: 'p1',
    project_name: 'P1 - Alpha Project',
    result_code: 'BR-000',
    result_title: 'Untitled result',
    indicator_category: 'Policy',
    status_name: 'Pending Review',
    status_id: 5,
    acronym: '',
    toc_title: 'ToC',
    indicator: 'Indicator',
    submission_date: '2026-01-01',
    lead_center: 'CIP',
    ...partial
  } as ResultToReview;
}

/** BRP-T-2: project-mode groups now carry `key`/`label`/`caption`/`center` instead of
 *  `project_id`/`project_name` — `key = label = project_name`, `center` = the group's distinct
 *  lead centers (comma-joined), `caption = null` (project mode never shows one). */
function projectGroup(key: string, results: ResultToReview[], center: string | null = null): BilateralReviewGroup {
  return { key, label: key, caption: null, center: center ?? [...new Set(results.map(r => r.lead_center).filter(Boolean))].join(', '), results };
}

const GROUP_A = projectGroup('P1 - Alpha Project', [
  row({ id: 'a1', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-001', status_id: 5, status_name: 'Pending Review', lead_center: 'CIP' }),
  row({ id: 'a2', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-002', status_id: 6, status_name: 'Approved', lead_center: 'IITA' })
]);

const GROUP_B = projectGroup('P2 - Beta Project', [
  row({ id: 'b1', project_id: 'p2', project_name: 'P2 - Beta Project', result_code: 'BR-003', status_id: 7, status_name: 'Rejected', lead_center: 'CIAT' })
]);

describe('BilateralReviewTableComponent', () => {
  let fixture: ComponentFixture<BilateralReviewTableComponent>;
  let component: BilateralReviewTableComponent;

  const root = () => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement[] => Array.from(root().querySelectorAll(`[data-testid="${id}"]`));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BilateralReviewTableComponent] }).compileComponents();
    fixture = TestBed.createComponent(BilateralReviewTableComponent);
    component = fixture.componentInstance;
  });

  /** Sets inputs then flushes the constructor effect — this codebase's convention for
   *  effect-driven components is two `detectChanges()` passes (see `bilateral-review.component.spec.ts`). */
  function render(groups: BilateralReviewGroup[], extra: Record<string, unknown> = {}): void {
    fixture.componentRef.setInput('groups', groups);
    for (const [key, value] of Object.entries(extra)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    fixture.detectChanges();
  }

  it('creates', () => {
    render([GROUP_A]);
    expect(component).toBeTruthy();
  });

  describe('Grouped view — headers and counts (BRT-R-10, BRP-R-11)', () => {
    it('renders group headers with the label, "N results" and the pending figure', () => {
      render([GROUP_A, GROUP_B]);

      const codes = byTestId('bilateral-review-project-code').map(el => el.textContent?.trim());
      const names = byTestId('bilateral-review-group-name').map(el => el.textContent?.trim());
      const summaries = byTestId('bilateral-review-group-summary').map(el => el.textContent?.trim());
      const pending = byTestId('bilateral-review-group-pending').map(el => el.textContent?.trim());

      expect(codes).toEqual(['P1', 'P2']);
      expect(names).toEqual(['Alpha Project', 'Beta Project']);
      expect(summaries).toEqual(['2 results', '1 results']);
      expect(pending).toEqual(['1 pending', '0 pending']);
    });

    it('drops a group left with zero results', () => {
      const empty: BilateralReviewGroup = { key: 'P3 - Empty Project', label: 'P3 - Empty Project', caption: null, center: null, results: [] };
      render([GROUP_A, empty]);

      const names = byTestId('bilateral-review-group-name').map(el => el.textContent?.trim());
      expect(names).toEqual(['Alpha Project']);
    });

    it('smart progressive disclosure on initial load (BRH-R-4): expands groups with pending reviews and collapses zero-pending groups', () => {
      render([GROUP_A, GROUP_B]);
      // GROUP_A has pending > 0 (expanded: 2 action buttons), GROUP_B has pending = 0 (collapsed: 0 buttons)
      expect(byTestId('bilateral-review-row-action').length).toBe(2);
      expect(byTestId('bilateral-review-group-toggle')[0].getAttribute('aria-expanded')).toBe('true');
      expect(byTestId('bilateral-review-group-toggle')[1].getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Group header pending badge — token-based, only when M > 0 (BRP-R-11, R-12; BRV-R-5, judgment-day L-1)', () => {
    it('the pending badge carries the fixed pending token pair only for a group with M > 0; a zero-pending group renders muted text instead', () => {
      render([GROUP_A, GROUP_B]);
      const badges = byTestId('bilateral-review-group-pending');

      expect(badges[0].className).toContain('bg-[var(--pr-status-in-progress-bg)]');
      expect(badges[0].className).toContain('text-[var(--pr-status-in-progress-fg)]');
      expect(badges[0].className).not.toContain('yellow');
      expect(badges[1].className).not.toContain('bg-[var(--pr-status-in-progress-bg)]');
    });

    it('project-mode caption shows the distinct lead centers; center-mode caption shows "N projects"', () => {
      render([GROUP_A]);
      // GROUP_A spans CIP + IITA.
      expect(root().textContent).toContain('CIP');
      expect(root().textContent).toContain('IITA');

      const centerGroup: BilateralReviewGroup = {
        key: 'CIP',
        label: 'CIP',
        caption: BILATERAL_REVIEW_COPY.table.projectsCaption(2),
        center: null,
        results: GROUP_A.results
      };
      render([centerGroup], { groupMode: 'center' });
      expect(root().textContent).toContain('2 projects');
    });
  });

  describe('Toggling one group (dataKey correctness — FAIL input for a wrong dataKey)', () => {
    it('collapsing one group leaves the other group expanded', () => {
      render([GROUP_A, GROUP_B], { expandAllNonce: 1, allExpanded: true });
      expect(byTestId('bilateral-review-row-action').length).toBe(3);

      (byTestId('bilateral-review-group-toggle')[0] as HTMLButtonElement).click();
      fixture.detectChanges();

      // Group A (2 rows) collapsed, Group B (1 row) still expanded — a wrong `dataKey` would
      // collapse both groups together and this would read 0.
      expect(byTestId('bilateral-review-row-action').length).toBe(1);
    });

    // @akili-spec changes/bilateral-review-ux-polish (BRP-T-3, Reviewer FAIL #1, design.md §6.3)
    it('the group toggle carries the box-shadow focus ring, never the broken `ring-` utility', () => {
      render([GROUP_A]);
      const toggle = byTestId('bilateral-review-group-toggle')[0] as HTMLButtonElement;
      expect(toggle.className).toContain('focus-visible:shadow-[var(--pr-focus-ring)]');
      expect(toggle.className).not.toContain('ring-[var(--pr-focus-ring)]');
    });
  });

  describe('Expand all / Collapse all via nonce (assert rendered rows, not state)', () => {
    it('collapses every group when allExpanded=false and the nonce bumps, then re-expands', () => {
      render([GROUP_A, GROUP_B], { expandAllNonce: 1, allExpanded: true });
      expect(byTestId('bilateral-review-row-action').length).toBe(3);

      fixture.componentRef.setInput('allExpanded', false);
      fixture.componentRef.setInput('expandAllNonce', 2);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(0);

      fixture.componentRef.setInput('allExpanded', true);
      fixture.componentRef.setInput('expandAllNonce', 3);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(3);
    });
  });

  describe('Namespaced collapse memory survives a groupMode round trip (BRP-R-11, judgment-day L-4)', () => {
    it('collapsing a group in center mode, switching to project mode, then back to center — the group stays collapsed and no group is force-expanded', () => {
      const centerA: BilateralReviewGroup = { key: 'IITA', label: 'IITA', caption: BILATERAL_REVIEW_COPY.table.projectsCaption(1), center: null, results: [GROUP_A.results[1]] };
      const centerB: BilateralReviewGroup = { key: 'CIP', label: 'CIP', caption: BILATERAL_REVIEW_COPY.table.projectsCaption(1), center: null, results: [GROUP_A.results[0]] };

      render([centerA, centerB], { groupMode: 'center', expandAllNonce: 1, allExpanded: true });
      expect(byTestId('bilateral-review-row-action').length).toBe(2);

      (byTestId('bilateral-review-group-toggle')[0] as HTMLButtonElement).click(); // collapse IITA
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(1);

      // Switch to project mode — a DIFFERENT key space (no nonce bump, so this must not force
      // expand-all; both project groups render expanded because it's their first appearance).
      fixture.componentRef.setInput('groups', [GROUP_A, GROUP_B]);
      fixture.componentRef.setInput('groupMode', 'project');
      fixture.componentRef.setInput('expandAllNonce', 2);
      fixture.componentRef.setInput('allExpanded', true);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(3); // both project groups expanded

      // Back to center mode — IITA is still collapsed (FAIL input: bumping the nonce on switch
      // would instead force every group open here).
      fixture.componentRef.setInput('groups', [centerA, centerB]);
      fixture.componentRef.setInput('groupMode', 'center');
      fixture.detectChanges();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(1);
      expect(byTestId('bilateral-review-group-toggle')[0].getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Row action gating by status_id x canReview (BRT-AC-8)', () => {
    it('reads Review with the edit icon for a pending row when the user can review', () => {
      render([GROUP_A], { canReview: true });
      const action = byTestId('bilateral-review-row-action')[0];
      expect(action.textContent).toContain('Review');
      expect(action.querySelector('.material-icons-round')?.textContent).toBe('edit');
    });

    it('reads See with the visibility icon for a pending row when the user cannot review', () => {
      render([GROUP_A], { canReview: false });
      const action = byTestId('bilateral-review-row-action')[0];
      expect(action.textContent).toContain('See');
      expect(action.querySelector('.material-icons-round')?.textContent).toBe('visibility');
    });

    it('reads See for an already-decided row even when the user can review', () => {
      render([GROUP_A], { canReview: true });
      const approvedAction = byTestId('bilateral-review-row-action')[1];
      expect(approvedAction.textContent).toContain('See');
    });

    it('reads Review for a pending row whose status_id arrives as the wire string "5"', () => {
      const stringStatusGroup = projectGroup('P4 - String Status Project', [
        row({ id: 's1', project_id: 'p4', project_name: 'P4 - String Status Project', status_id: '5', status_name: 'Pending Review' })
      ]);
      render([stringStatusGroup], { canReview: true });
      expect(byTestId('bilateral-review-row-action')[0].textContent).toContain('Review');
    });

    it('emits openResult with the clicked row', () => {
      render([GROUP_A], { canReview: true });
      const emitted: ResultToReview[] = [];
      component.openResult.subscribe(row => emitted.push(row));

      (byTestId('bilateral-review-row-action')[0] as HTMLButtonElement).click();

      expect(emitted.length).toBe(1);
      expect(emitted[0].id).toBe('a1');
    });
  });

  describe('Decision in flight — aria-disabled guard, not native disabled (BRT-T-5, KZ-REH-2)', () => {
    it('marks the action aria-disabled with a title and swallows the click when actionsDisabled is true', () => {
      render([GROUP_A], { canReview: true, actionsDisabled: true });
      const action = byTestId('bilateral-review-row-action')[0] as HTMLButtonElement;

      expect(action.getAttribute('aria-disabled')).toBe('true');
      expect(action.getAttribute('title')).toBe(BILATERAL_REVIEW_COPY.table.decisionInFlightTitle);
      expect(action.hasAttribute('disabled')).toBe(false);

      const emitted: ResultToReview[] = [];
      component.openResult.subscribe(row => emitted.push(row));
      action.click();

      expect(emitted.length).toBe(0);
    });

    it('renders no aria-disabled or title when actionsDisabled is false', () => {
      render([GROUP_A], { canReview: true, actionsDisabled: false });
      const action = byTestId('bilateral-review-row-action')[0] as HTMLButtonElement;

      expect(action.getAttribute('aria-disabled')).toBeNull();
      expect(action.getAttribute('title')).toBeNull();
    });
  });

  describe('Flat view (BRT-R-30)', () => {
    it('renders no group headers or togglers', () => {
      fixture.componentRef.setInput('view', 'flat');
      fixture.componentRef.setInput('flatRows', GROUP_A.results);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(byTestId('bilateral-review-group-toggle').length).toBe(0);
      expect(byTestId('bilateral-review-group-name').length).toBe(0);
      expect(root().querySelector('[data-testid="bilateral-review-flat-table"]')).toBeTruthy();
    });

    it('sorts rows desc by submission_date even when the input arrives unsorted', () => {
      fixture.componentRef.setInput('view', 'flat');
      fixture.componentRef.setInput('flatRows', [
        row({ id: 'f1', result_code: 'OLD', submission_date: '2026-01-01' }),
        row({ id: 'f2', result_code: 'NEW', submission_date: '2026-03-01' }),
        row({ id: 'f3', result_code: 'MID', submission_date: '2026-02-01' })
      ]);
      fixture.detectChanges();
      fixture.detectChanges();

      const codes = byTestId('bilateral-review-row-code').map(el => el.textContent?.trim());
      expect(codes).toEqual(['NEW', 'MID', 'OLD']);
    });
  });

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-5, AC-8, judgment-day L-1)
  describe('Status chip tone by loose status_id — fixed token pairs, never raw Tailwind palette (BRV-R-5, AC-8)', () => {
    it('tones pending / approved / rejected / neutral from the SAME fg/bg pair, and shows the raw status_name for a neutral row', () => {
      const statuses = projectGroup('P5 - Statuses Project', [
        row({ id: 'st1', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 5, status_name: 'Pending Review' }),
        row({ id: 'st2', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 6, status_name: 'Approved' }),
        row({ id: 'st3', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 7, status_name: 'Rejected' }),
        row({ id: 'st4', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 1, status_name: 'Editing' })
      ]);
      render([statuses]);

      const chips = byTestId('bilateral-review-row-status');
      expect(chips[0].className).toContain('bg-[var(--pr-status-in-progress-bg)]');
      expect(chips[0].className).toContain('text-[var(--pr-status-in-progress-fg)]');
      expect(chips[1].className).toContain('bg-[var(--pr-status-approved-bg)]');
      expect(chips[1].className).toContain('text-[var(--pr-status-approved-fg)]');
      expect(chips[2].className).toContain('bg-[var(--pr-danger-bg)]');
      expect(chips[2].className).toContain('text-[var(--pr-danger)]');
      expect(chips[3].className).toContain('bg-[var(--pr-status-not-started-bg)]');
      expect(chips[3].className).toContain('text-[var(--pr-status-not-started-fg)]');
      expect(chips[3].textContent?.trim()).toBe('Editing');
    });

    it('carries border-transparent (sizing only) and no raw amber/emerald/red-/slate class anywhere in the rendered table (FAIL input: leave one raw class)', () => {
      const statuses = projectGroup('P5b - Statuses Project', [
        row({ id: 'st1b', project_id: 'p5b', project_name: 'P5b - Statuses Project', status_id: 5, status_name: 'Pending Review' }),
        row({ id: 'st2b', project_id: 'p5b', project_name: 'P5b - Statuses Project', status_id: 6, status_name: 'Approved' }),
        row({ id: 'st3b', project_id: 'p5b', project_name: 'P5b - Statuses Project', status_id: 7, status_name: 'Rejected' })
      ]);
      render([statuses]);

      const chips = byTestId('bilateral-review-row-status');
      chips.forEach(chip => expect(chip.className).toContain('border-transparent'));
      expect(root().innerHTML).not.toMatch(/\bamber-\d|\bemerald-\d|\bred-\d/);
    });
  });

  describe('Contributor tag — inline after the code (BRT-R-11, BRP-R-8)', () => {
    it('shows a Contributor tag in the CODE cell only for initiative_role_name = Contributor', () => {
      const group = projectGroup('P6 - Gamma Project', [
        row({ id: 'c1', project_id: 'p6', project_name: 'P6 - Gamma Project', initiative_role_name: 'Contributor' }),
        row({ id: 'c2', project_id: 'p6', project_name: 'P6 - Gamma Project', initiative_role_name: 'Primary submitter' })
      ]);
      render([group]);

      const codeCells = byTestId('bilateral-review-row-code');
      expect(codeCells[0].textContent).toContain(BILATERAL_REVIEW_COPY.table.contributorBadge);
      expect(codeCells[1].textContent).not.toContain(BILATERAL_REVIEW_COPY.table.contributorBadge);

      // In container card architecture, the group header is the card button (not a tbody tr).
      // Data rows in tbody start at index 0: [0] c1 (Contributor), [1] c2 (Primary submitter).
      const rows = root().querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('Contributor');
      expect(rows[1].textContent).not.toContain('Contributor');
    });
  });

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-8, AC-8)
  describe('Row density — no category column, caption under the title, line-clamp + title (BRP-R-8, AC-8)', () => {
    it('renders no "Indicator category" header/column and shows the category as a caption under the title', () => {
      render([GROUP_A]);
      const headerTexts = Array.from(root().querySelectorAll('thead th')).map(th => th.textContent?.trim());
      expect(headerTexts).not.toContain('Indicator category');
      // 7 in project mode (default groupMode): code, title, center, status, alignment, date, actions
      // — down from 8 now that TOC result + Indicator merge into one Alignment column (BRV-R-3).
      expect(headerTexts.length).toBe(7);

      const titleCell = byTestId('bilateral-review-row-action')[0].closest('tr')!.querySelectorAll('td')[1];
      expect(titleCell.textContent).toContain(GROUP_A.results[0].indicator_category);
    });

    it('clamps a long title to 2 lines and carries the full text in `title`', () => {
      const longTitle = 'A'.repeat(200);
      const group = projectGroup('P8 - Long Title Project', [row({ id: 'lt1', project_id: 'p8', project_name: 'P8 - Long Title Project', result_title: longTitle })]);
      render([group]);

      const titleParagraph = root().querySelector('tbody tr:first-child p') as HTMLElement;
      expect(titleParagraph.className).toContain('line-clamp-2');
      expect(titleParagraph.getAttribute('title')).toBe(longTitle);
    });

    it('carries `min-w-[128px]` and `whitespace-nowrap` on the status column so a long status name never wraps', () => {
      render([GROUP_A]);
      const statusCell = byTestId('bilateral-review-row-status')[0].closest('td') as HTMLElement;
      expect(statusCell.className).toContain('whitespace-nowrap');
      expect(statusCell.className).toContain('min-w-[128px]');
    });
  });

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-3, AC-4, AC-4b,
  // AC-5, design.md §2 L-6 truncation-on-a-td disqualifier)
  describe('Alignment column — merged TOC result + Indicator, per-line placeholder logic (BRV-R-3, AC-4, AC-4b, AC-5)', () => {
    it('both present: renders two lines by data-testid, inner spans truncate with title — never the td', () => {
      render([GROUP_A]); // a1: toc_title "ToC", indicator "Indicator" — both real values.
      const cell = byTestId('bilateral-review-row-alignment')[0];
      const spans = cell.querySelectorAll('span');

      expect(spans.length).toBe(2);
      expect(spans[0].textContent).toBe('ToC');
      expect(spans[0].className).toContain('truncate');
      expect(spans[0].getAttribute('title')).toBe('ToC');
      expect(spans[1].textContent).toBe('Indicator');
      expect(spans[1].className).toContain('truncate');
      expect(spans[1].getAttribute('title')).toBe('Indicator');
      // Disqualifier: truncation must live on the inner span, never the td (H2-1/L-6 — `max-width`
      // on a `td` is inert under `table-layout: auto`).
      expect(cell.className).not.toContain('truncate');
    });

    it('TOC only (Indicator placeholder): renders exactly one line, no dash (AC-4b)', () => {
      const group = projectGroup('P13 - TOC Only Project', [
        row({ id: 'al1', project_id: 'p13', project_name: 'P13 - TOC Only Project', toc_title: 'HLO1.AOW1.IO1 Steer to impact', indicator: 'Not Applicable' })
      ]);
      render([group]);
      const cell = byTestId('bilateral-review-row-alignment')[0];

      expect(cell.querySelectorAll('span[aria-hidden]').length).toBe(0);
      const spans = Array.from(cell.querySelectorAll('span')).filter(s => !s.classList.contains('sr-only'));
      expect(spans.length).toBe(1);
      expect(spans[0].textContent).toBe('HLO1.AOW1.IO1 Steer to impact');
    });

    it('Indicator only (TOC placeholder): renders exactly one line, no dash (AC-4b, and the reverse of the above)', () => {
      const group = projectGroup('P14 - Indicator Only Project', [
        row({ id: 'al2', project_id: 'p14', project_name: 'P14 - Indicator Only Project', toc_title: 'Not specified', indicator: 'Number of people trained' })
      ]);
      render([group]);
      const cell = byTestId('bilateral-review-row-alignment')[0];

      expect(cell.querySelectorAll('span[aria-hidden]').length).toBe(0);
      const spans = Array.from(cell.querySelectorAll('span')).filter(s => !s.classList.contains('sr-only'));
      expect(spans.length).toBe(1);
      expect(spans[0].textContent).toBe('Number of people trained');
    });

    it('both placeholders: exactly one aria-hidden dash + one sr-only text naming BOTH originals (AC-5)', () => {
      const group = projectGroup('P9 - Placeholder Project', [
        row({ id: 'ph1', project_id: 'p9', project_name: 'P9 - Placeholder Project', toc_title: 'Not specified', indicator: 'Not Applicable' })
      ]);
      render([group]);
      const cell = byTestId('bilateral-review-row-alignment')[0];

      const dashes = cell.querySelectorAll('span[aria-hidden="true"]');
      expect(dashes.length).toBe(1);
      expect(dashes[0].textContent).toBe('—');

      const srOnly = cell.querySelector('.sr-only');
      expect(srOnly?.textContent).toContain('Not specified');
      expect(srOnly?.textContent).toContain('Not Applicable');
    });

    it('a genuinely blank pair falls back to the "Not specified" copy in the sr-only text', () => {
      const group = projectGroup('P10 - Blank Project', [
        row({ id: 'bl1', project_id: 'p10', project_name: 'P10 - Blank Project', toc_title: '' as unknown as string, indicator: '' as unknown as string })
      ]);
      render([group]);
      const cell = byTestId('bilateral-review-row-alignment')[0];
      expect(cell.querySelector('.sr-only')?.textContent).toContain(BILATERAL_REVIEW_COPY.table.notSpecified);
    });

    it('th and td carry min-w-[220px]; the title column grows to min-w-[280px]', () => {
      render([GROUP_A]);
      const headerCells = Array.from(root().querySelectorAll('thead th'));
      const alignmentHeader = headerCells.find(th => th.textContent?.trim() === BILATERAL_REVIEW_COPY.table.headers.alignment) as HTMLElement;
      const titleHeader = headerCells[1] as HTMLElement;

      expect(alignmentHeader.className).toContain('min-w-[220px]');
      expect(titleHeader.className).toContain('min-w-[280px]');
      expect(byTestId('bilateral-review-row-alignment')[0].className).toContain('min-w-[220px]');
    });
  });

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-8, R-14 (f))
  describe('Date format — d MMM y, right-aligned (BRP-R-8, R-14 (f))', () => {
    it('renders "23 Feb 2026" from "2026-02-23"', () => {
      const group = projectGroup('P11 - Date Project', [row({ id: 'd1', project_id: 'p11', project_name: 'P11 - Date Project', submission_date: '2026-02-23' })]);
      render([group]);

      const rowEl = root().querySelectorAll('tbody tr')[0];
      // Column order (project mode, 7 columns): code(0) title(1) center(2) status(3)
      // alignment(4) date(5) actions(6) — was index 6 before the Alignment merge dropped one column.
      const dateCell = rowEl.querySelectorAll('td')[5];
      expect(dateCell.textContent?.trim()).toBe('23 Feb 2026');
      expect(dateCell.className).toContain('text-right');
    });
  });

  describe('Copy strings render from BILATERAL_REVIEW_COPY.table (Reviewer fix #4)', () => {
    // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-9 (a), AC-4, AC-7)
    // — header-ORDER is load-bearing: `alignment` sits in column position (between status and
    // date), replacing `toc`/`indicator`. Split project (7) / center-grouped (6) per R-9 (a).
    it('project mode: renders the seven column headers from copy.table.headers, in key order', () => {
      render([GROUP_A]);
      const headerTexts = Array.from(root().querySelectorAll('thead th')).map(th => th.textContent?.trim());
      expect(headerTexts).toEqual(Object.values(BILATERAL_REVIEW_COPY.table.headers));
    });

    it('center-grouped mode: renders six headers — the Lead center header/column is hidden (AC-7)', () => {
      const centerGroup: BilateralReviewGroup = { key: 'CIP', label: 'CIP', caption: BILATERAL_REVIEW_COPY.table.projectsCaption(1), center: null, results: GROUP_A.results };
      render([centerGroup], { groupMode: 'center' });
      const headerTexts = Array.from(root().querySelectorAll('thead th')).map(th => th.textContent?.trim());
      const expected = Object.values(BILATERAL_REVIEW_COPY.table.headers).filter(h => h !== BILATERAL_REVIEW_COPY.table.headers.center);
      expect(headerTexts).toEqual(expected);
    });

    it('center mode + FLAT view: the Lead center column stays (AC-7b — hiding is grouped-view only)', () => {
      fixture.componentRef.setInput('view', 'flat');
      fixture.componentRef.setInput('groupMode', 'center');
      fixture.componentRef.setInput('flatRows', GROUP_A.results);
      fixture.detectChanges();
      fixture.detectChanges();
      const headerTexts = Array.from(root().querySelectorAll('thead th')).map(th => th.textContent?.trim());
      expect(headerTexts).toEqual(Object.values(BILATERAL_REVIEW_COPY.table.headers));
    });

    it('renders the row action as a ghost button', () => {
      render([GROUP_A], { canReview: true });
      const action = byTestId('bilateral-review-row-action')[0];
      expect(action.getAttribute('variant')).toBe('ghost');
    });

    // Restored (Leader, examined ADVISORY, R-14): still passes against the new markup —
    // the Contributor badge moved into the code cell (BRP-R-8) and "Not specified" now reaches
    // the DOM via the Lead center column's own fallback AND the sr-only placeholder text on a
    // blank TOC/Indicator value; either way `root().textContent` still contains both strings.
    it('renders the Contributor badge and Not specified fallback from copy', () => {
      const group = projectGroup('P7 - Copy Project', [
        row({ id: 'cp1', project_id: 'p7', project_name: 'P7 - Copy Project', initiative_role_name: 'Contributor', lead_center: undefined })
      ]);
      render([group]);

      expect(root().textContent).toContain(BILATERAL_REVIEW_COPY.table.contributorBadge);
      expect(root().textContent).toContain(BILATERAL_REVIEW_COPY.table.notSpecified);
    });
  });

  describe('Actions column sticks to the right edge (Leader H2-1, BRP-R-10)', () => {
    it('gives the Actions header and row cell sticky classes plus a left divider (BRP-R-10)', () => {
      render([GROUP_A]);
      const headerCells = root().querySelectorAll('thead th');
      const actionsHeader = headerCells[headerCells.length - 1] as HTMLElement;
      expect(actionsHeader.className).toContain('sticky');
      expect(actionsHeader.className).toContain('right-0');
      expect(actionsHeader.className).toContain('border-l');

      const actionCell = byTestId('bilateral-review-row-action')[0].closest('td') as HTMLElement;
      expect(actionCell.className).toContain('sticky');
      expect(actionCell.className).toContain('right-0');
      expect(actionCell.className).toContain('border-l');
    });
  });

  describe('Grouped view leaves horizontal scroll to the nested per-card table (Reviewer fix #2; BRH-T-2: was PrGroupTableComponent, now each `<section>` card owns its own scroller)', () => {
    it('does not wrap app-bilateral-review-table in its own overflow-x-auto when grouped', () => {
      render([GROUP_A]);
      const wrapper = root().querySelector('[data-testid="bilateral-review-table"]') as HTMLElement;
      expect(wrapper.className).not.toContain('overflow-x-auto');
    });
  });

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-3, R-13, R-14 (d), AC-11, AC-12)
  describe('Narrow cards below 900px (BRP-R-13)', () => {
    it('narrow=true renders ul[role=list] with li count = row count and no <table> element (FAIL input: leave the table branch mounted)', () => {
      render([GROUP_A, GROUP_B], { narrow: true, expandAllNonce: 1, allExpanded: true });

      // FAIL input this test guards against: asserting only card count without also asserting
      // the table branch never mounted would still pass with BOTH branches rendered together.
      expect(root().querySelector('table')).toBeNull();

      const cards = root().querySelectorAll('ul[role="list"] li[data-testid="bilateral-review-card"]');
      expect(cards.length).toBe(GROUP_A.results.length + GROUP_B.results.length);
    });

    // @akili-spec changes/bilateral-review-ux-polish (BRP-T-3, Reviewer FAIL #1, design.md §6.3)
    it('the cards group-toggle bar carries the box-shadow focus ring, never the broken `ring-` utility', () => {
      render([GROUP_A], { narrow: true });
      const toggle = byTestId('bilateral-review-group-toggle')[0] as HTMLButtonElement;
      expect(toggle.className).toContain('focus-visible:shadow-[var(--pr-focus-ring)]');
      expect(toggle.className).not.toContain('ring-[var(--pr-focus-ring)]');
    });

    it('flat + narrow: renders one card per flatRow, in sortedFlatRows order, no <table>', () => {
      fixture.componentRef.setInput('view', 'flat');
      fixture.componentRef.setInput('narrow', true);
      fixture.componentRef.setInput('flatRows', [
        row({ id: 'f1', result_code: 'OLD', submission_date: '2026-01-01' }),
        row({ id: 'f2', result_code: 'NEW', submission_date: '2026-03-01' })
      ]);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(root().querySelector('table')).toBeNull();
      const codes = byTestId('bilateral-review-row-code').map(el => el.textContent?.trim());
      expect(codes).toEqual(['NEW', 'OLD']); // sortedFlatRows desc by submission_date
    });

    it('a card shows the code, status pill, title, caption with "—" placeholders, date and the action button', () => {
      const group = projectGroup('P12 - Card Project', [
        row({
          id: 'card1',
          project_id: 'p12',
          project_name: 'P12 - Card Project',
          result_code: 'BR-900',
          result_title: 'Card title',
          indicator_category: '',
          lead_center: undefined,
          toc_title: 'Not specified',
          submission_date: '2026-02-23'
        })
      ]);
      render([group], { narrow: true, canReview: true });

      const card = byTestId('bilateral-review-card')[0];
      expect(card.querySelector('[data-testid="bilateral-review-row-code"]')?.textContent).toContain('BR-900');
      expect(card.querySelector('[data-testid="bilateral-review-row-status"]')).toBeTruthy();
      expect(card.querySelector('p')?.textContent).toBe('Card title');
      // Every one of category / center / TOC is blank on this row — all three placeholder to "—".
      expect(card.querySelector('[data-testid="bilateral-review-card-caption"]')?.textContent).toBe('— · — · —');
      expect(card.textContent).toContain('23 Feb 2026');
      const action = card.querySelector('[data-testid="bilateral-review-row-action"]') as HTMLElement;
      expect(action).toBeTruthy();
      expect(action.textContent).toContain('Review');
    });

    // @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-2 attempt 2, Reviewer FAIL #2)
    it('narrow group header (project mode): renders capped contributing-center chips, never a bare comma-separated run (BRH-R-3)', () => {
      render([GROUP_A], { narrow: true }); // GROUP_A spans CIP + IITA.
      const chips = byTestId('bilateral-review-center-chip').map(el => el.textContent?.trim());
      expect(chips).toContain('CIP');
      expect(chips).toContain('IITA');
    });

    it('narrow group header (project mode, > 3 centers): caps chips at 3 and adds a "+N" overflow chip instead of overflowing the card', () => {
      const manyCenterResults = ['CIP', 'IITA', 'CIAT', 'ICRAF', 'ILRI'].map((center, i) =>
        row({ id: `mc${i}`, project_id: 'p20', project_name: 'P20 - Many Centers Project', result_code: `BR-2${i}`, lead_center: center })
      );
      const group = projectGroup('P20 - Many Centers Project', manyCenterResults);
      render([group], { narrow: true });

      const chips = byTestId('bilateral-review-center-chip');
      expect(chips.length).toBe(3);
      expect(root().textContent).toContain('+2');
    });

    it('narrow group header (center mode): renders the "N projects" caption instead of nothing', () => {
      const centerGroup: BilateralReviewGroup = { key: 'CIP', label: 'CIP', caption: BILATERAL_REVIEW_COPY.table.projectsCaption(2), center: null, results: GROUP_A.results };
      render([centerGroup], { narrow: true, groupMode: 'center' });
      expect(root().textContent).toContain('2 projects');
    });

    it('narrow=false renders the usual grouped table branch — no ul[role=list], group togglers still work', () => {
      render([GROUP_A], { narrow: false });
      expect(root().querySelector('ul[role="list"]')).toBeNull();
      expect(root().querySelector('table')).toBeTruthy();
      expect(byTestId('bilateral-review-group-toggle').length).toBe(1);
    });

    it('grouped narrow: the group header bar toggles the group\'s cards through the owned expandedKeys — collapsing in cards then switching narrow=false shows the group collapsed in the table too', () => {
      render([GROUP_A, GROUP_B], { narrow: true, expandAllNonce: 1, allExpanded: true });
      expect(byTestId('bilateral-review-card').length).toBe(3);

      (byTestId('bilateral-review-group-toggle')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-card').length).toBe(1); // only Group B's card remains
      expect(byTestId('bilateral-review-group-toggle')[0].getAttribute('aria-expanded')).toBe('false');

      fixture.componentRef.setInput('narrow', false);
      fixture.detectChanges();
      fixture.detectChanges();

      // Same `expandedKeys` single source (design.md §6.1) — Group A is still collapsed, now in
      // the grouped TABLE branch.
      expect(root().querySelector('ul[role="list"]')).toBeNull();
      expect(byTestId('bilateral-review-row-action').length).toBe(1);
      expect(byTestId('bilateral-review-group-toggle')[0].getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Manual group collapse survives an unrelated re-render (Leader advisory fix)', () => {
    it('keeps a manually collapsed group collapsed after a groups-array reference change (e.g. a search keystroke)', () => {
      render([GROUP_A, GROUP_B], { expandAllNonce: 1, allExpanded: true });
      expect(byTestId('bilateral-review-row-action').length).toBe(3);

      // Manually collapse Group A via the toggler — mutates only this component's OWN
      // `expandedKeys`/`userCollapsedKeys` signals (BRH-T-2: no child `PrGroupTableComponent`
      // anymore); without the `userCollapsedKeys` exclusion this test fails because the next
      // re-seed falls back to the stale `lastKeys` value and re-expands Group A.
      (byTestId('bilateral-review-group-toggle')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(1);

      // Simulate an unrelated re-render producing a NEW `groups` array reference with the same
      // project keys — exactly what a page-level search keystroke does upstream.
      fixture.componentRef.setInput('groups', [
        { ...GROUP_A, results: [...GROUP_A.results] },
        { ...GROUP_B, results: [...GROUP_B.results] }
      ]);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(byTestId('bilateral-review-row-action').length).toBe(1);
    });

    // @akili-spec changes/bilateral-review-hierarchy-ux (BRH-T-2 attempt 2, Reviewer FAIL #1)
    it('keeps a manually EXPANDED zero-pending group expanded after a groups-array reference change (the inverse defect: onToggleGroup used to write only userCollapsedKeys, never lastKeys, so expanding a 0-pending group was silently reverted by the next re-seed)', () => {
      // Default nonce/allExpanded — smart default applies: GROUP_A (pending>0) opens, GROUP_B
      // (0 pending) starts collapsed.
      render([GROUP_A, GROUP_B]);
      expect(byTestId('bilateral-review-group-toggle')[1].getAttribute('aria-expanded')).toBe('false');

      // Manually EXPAND Group B (the zero-pending group).
      (byTestId('bilateral-review-group-toggle')[1] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-group-toggle')[1].getAttribute('aria-expanded')).toBe('true');

      // Simulate an unrelated re-render producing a NEW `groups` array reference (e.g. a search
      // keystroke) — the constructor effect re-runs and must not fall back to the stale smart
      // default (`pendingCount(group) > 0` is still false for Group B).
      fixture.componentRef.setInput('groups', [
        { ...GROUP_A, results: [...GROUP_A.results] },
        { ...GROUP_B, results: [...GROUP_B.results] }
      ]);
      fixture.detectChanges();
      fixture.detectChanges();

      expect(byTestId('bilateral-review-group-toggle')[1].getAttribute('aria-expanded')).toBe('true');
    });
  });

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-4, AC-6, AC-7, AC-7b)
  describe('Lead center column — inner-span truncation, hidden ONLY for groupMode=center + grouped view (BRV-R-4)', () => {
    it('renders a truncating inner span with title, never on the td (Disqualifier)', () => {
      const group = projectGroup('P15 - Center Project', [row({ id: 'ce1', project_id: 'p15', project_name: 'P15 - Center Project', lead_center: 'Bioversity (Alliance)' })]);
      render([group]);
      const centerCell = byTestId('bilateral-review-row-center')[0];
      const span = centerCell.querySelector('span') as HTMLElement;
      expect(span).toBeTruthy();
      expect(span.className).toContain('truncate');
      expect(span.className).toContain('max-w-[150px]');
      expect(span.getAttribute('title')).toBe('Bioversity (Alliance)');
      expect(centerCell.className).not.toContain('max-w-');
      expect(centerCell.className).not.toContain('truncate');
    });

    it('project mode (grouped or flat): the column is present', () => {
      render([GROUP_A], { groupMode: 'project' });
      expect(byTestId('bilateral-review-row-center').length).toBeGreaterThan(0);
      expect(root().querySelectorAll('thead th')[2].textContent?.trim()).toBe(BILATERAL_REVIEW_COPY.table.headers.center);
    });

    it('center mode + GROUPED view: the column (header + cell) is hidden (AC-7)', () => {
      const centerGroup: BilateralReviewGroup = { key: 'CIP', label: 'CIP', caption: BILATERAL_REVIEW_COPY.table.projectsCaption(1), center: null, results: GROUP_A.results };
      render([centerGroup], { groupMode: 'center' });
      expect(byTestId('bilateral-review-row-center').length).toBe(0);
      const headerTexts = Array.from(root().querySelectorAll('thead th')).map(th => th.textContent?.trim());
      expect(headerTexts).not.toContain(BILATERAL_REVIEW_COPY.table.headers.center);
    });

    it('center mode + FLAT view: the column stays (AC-7b)', () => {
      fixture.componentRef.setInput('view', 'flat');
      fixture.componentRef.setInput('groupMode', 'center');
      fixture.componentRef.setInput('flatRows', GROUP_A.results);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-center').length).toBe(GROUP_A.results.length);
    });
  });

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-4, AC-7, AC-7b,
  // judgment-day L-8) — `columnCount()` must drive EVERY `colspan` site, not just one.
  describe('columnCount() drives every colspan site (BRV-R-4, judgment-day L-8)', () => {
    it('columnCount is 7 in project mode and 6 in center mode', () => {
      render([GROUP_A], { groupMode: 'project' });
      expect(component.columnCount()).toBe(7);

      const centerGroup: BilateralReviewGroup = { key: 'CIP', label: 'CIP', caption: BILATERAL_REVIEW_COPY.table.projectsCaption(1), center: null, results: GROUP_A.results };
      render([centerGroup], { groupMode: 'center' });
      expect(component.columnCount()).toBe(6);
    });

    it('flat view loading row: colspan equals the flat header count (7 in project mode, FAIL input guard: was hard-coded 8)', () => {
      fixture.componentRef.setInput('view', 'flat');
      fixture.componentRef.setInput('flatRows', []);
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();
      fixture.detectChanges();

      const loadingCells = root().querySelectorAll('tbody tr td[colspan]');
      expect(loadingCells.length).toBeGreaterThan(0);
      loadingCells.forEach(td => expect((td as HTMLTableCellElement).colSpan).toBe(7));
    });
  });

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-7, AC-10,
  // judgment-day L-9)
  describe('Action tone — primary text on canReviewRow, neutral otherwise, no background tint (BRV-R-7, AC-10)', () => {
    it('a pending row, member reviewer: "Review" carries the primary text tone (incl. on hover) and no bg class', () => {
      render([GROUP_A], { canReview: true });
      const action = byTestId('bilateral-review-row-action')[0]; // a1: pending
      expect(action.className).toContain('text-[var(--pr-color-primary-700)]');
      // Leader addition (ADVISORY (a), examined): repeats the token under `hover:` so the hlm
      // ghost button's own `hover:text-foreground` cannot erase the emphasis on pointer-over.
      expect(action.className).toContain('hover:text-[var(--pr-color-primary-700)]');
      expect(action.className).toContain('font-semibold');
      expect(action.className).not.toMatch(/\bbg-\[/);
    });

    it('an approved row (already decided): "See" is neutral even though the user can review', () => {
      render([GROUP_A], { canReview: true });
      const action = byTestId('bilateral-review-row-action')[1]; // a2: approved
      expect(action.className).not.toContain('text-[var(--pr-color-primary-700)]');
    });

    it('a pending row, non-member: "See" is neutral (judgment-day L-9 — tone keys on canReviewRow, not isPending alone)', () => {
      render([GROUP_A], { canReview: false });
      const action = byTestId('bilateral-review-row-action')[0]; // a1: pending, but canReview=false
      expect(action.textContent).toContain('See');
      expect(action.className).not.toContain('text-[var(--pr-color-primary-700)]');
    });
  });

  // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-6, AC-9)
  describe('Group header accent + single-line label (BRV-R-6, AC-9)', () => {
    it('a group with pending > 0 carries the pending-tone left accent; a zero-pending group carries the neutral border tone', () => {
      render([GROUP_A, GROUP_B]); // GROUP_A has 1 pending, GROUP_B has 0.
      const toggles = byTestId('bilateral-review-group-toggle');

      expect(toggles[0].className).toContain('!border-l-[var(--pr-status-in-progress-fg)]');
      expect(toggles[1].className).toContain('!border-l-[var(--pr-border)]');
      expect(toggles[1].className).not.toContain('!border-l-[var(--pr-status-in-progress-fg)]');
    });

    // @akili-spec changes/bilateral-review-viewport-and-table-polish (BRV-T-2, R-6, AC-9;
    // Reviewer FAIL #1, remediated) — the table-header proof above does NOT transfer to the cards
    // group-bar: it is a different element with a different class cascade. Requirements.md BRV-R-6
    // last sentence: "Cards' group bars carry the same accent."
    it('narrow cards: the group bar carries the SAME accent classes as the table header (pending vs zero-pending)', () => {
      render([GROUP_A, GROUP_B], { narrow: true }); // GROUP_A has 1 pending, GROUP_B has 0.
      const toggles = byTestId('bilateral-review-group-toggle');

      expect(toggles[0].className).toContain('!border-l-[3px]');
      expect(toggles[0].className).toContain('!border-l-[var(--pr-status-in-progress-fg)]');
      expect(toggles[1].className).toContain('!border-l-[var(--pr-border)]');
      expect(toggles[1].className).not.toContain('!border-l-[var(--pr-status-in-progress-fg)]');
    });

    it('the label is a single-line truncated span with title, inside a min-w-0 flex-1 container — the row never wraps', () => {
      const longName = 'P16 - A deliberately long bilateral project name that would wrap onto a second line without truncation';
      const group = projectGroup(longName, GROUP_A.results);
      render([group]);

      const nameEl = byTestId('bilateral-review-group-name')[0];
      const codeEl = byTestId('bilateral-review-project-code')[0];
      expect(codeEl.textContent?.trim()).toBe('P16');
      expect(nameEl.className).toContain('block');
      expect(nameEl.className).toContain('truncate');
      expect(nameEl.getAttribute('title')).toBe('A deliberately long bilateral project name that would wrap onto a second line without truncation');
      expect(nameEl.closest('.flex-1')?.className).toContain('min-w-0');
    });
  });

  // ── BRH-T-2 Container Card Architecture, Monospace Code & Progressive Disclosure ──────────────
  describe('BRH-T-2: Container Card Architecture, Monospace Code & Progressive Disclosure', () => {
    it('renders project groups as elevated container cards (BRH-R-1)', () => {
      render([GROUP_A, GROUP_B]);
      const cards = byTestId('bilateral-review-group-card');
      expect(cards.length).toBe(2);
      expect(cards[0].className).toContain('rounded-[12px]');
      expect(cards[0].className).toContain('bg-[var(--pr-surface-card)]');
    });

    it('separates project code into an authoritative monospace badge (BRH-R-2, parseProjectIdentifier)', () => {
      const groupWithCode = projectGroup('T-PJ-003262-An innovative approach to agribusiness', [
        row({ id: 'c1', project_name: 'T-PJ-003262-An innovative approach to agribusiness', result_code: 'BR-101', status_id: 5 })
      ]);
      render([groupWithCode]);

      const codeBadge = byTestId('bilateral-review-project-code')[0];
      expect(codeBadge).toBeTruthy();
      expect(codeBadge.textContent?.trim()).toBe('T-PJ-003262');
      expect(codeBadge.className).toContain('font-mono');

      const titleEl = byTestId('bilateral-review-group-name')[0];
      expect(titleEl.textContent?.trim()).toBe('An innovative approach to agribusiness');
    });

    it('parseProjectIdentifier handles spaced codes and labels without code prefix', () => {
      const p1 = component.parseProjectIdentifier('P1 - Alpha Project');
      expect(p1.code).toBe('P1');
      expect(p1.title).toBe('Alpha Project');

      const plain = component.parseProjectIdentifier('Standalone Title Without Code');
      expect(plain.code).toBeNull();
      expect(plain.title).toBe('Standalone Title Without Code');
    });

    it('renders discrete contributing center chips in card header (BRH-R-3)', () => {
      render([GROUP_A]);
      const chips = byTestId('bilateral-review-center-chip').map(el => el.textContent?.trim());
      expect(chips).toContain('CIP');
      expect(chips).toContain('IITA');
    });

    it('in-card quick filter toolbar filters rows locally without affecting other groups (BRH-R-6)', () => {
      render([GROUP_A], { expandAllNonce: 1, allExpanded: true });
      // GROUP_A has CIP (row a1) and IITA (row a2).
      const toolbar = byTestId('bilateral-review-incard-toolbar')[0];
      expect(toolbar).toBeTruthy();

      // Initially both rows are displayed
      expect(byTestId('bilateral-review-row-code').length).toBe(2);

      // Filter by CIP inside the card
      component.setInCardCenterFilter(GROUP_A.key, 'CIP');
      fixture.detectChanges();
      const rowsAfterCIP = byTestId('bilateral-review-row-code');
      expect(rowsAfterCIP.length).toBe(1);
      expect(rowsAfterCIP[0].textContent?.trim()).toBe('BR-001');

      // Reset in-card center filter
      component.setInCardCenterFilter(GROUP_A.key, null);
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-code').length).toBe(2);
    });

    it('copy button copies project name to clipboard and shows transient check state (BRH-R-5)', () => {
      const writeTextSpy = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextSpy }
      });

      render([GROUP_A]);
      const event = new MouseEvent('click');
      jest.spyOn(event, 'stopPropagation');

      component.copyText('Test Copy String', 'test-key', event);
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(writeTextSpy).toHaveBeenCalledWith('Test Copy String');
      expect(component.isCopied('test-key')).toBe(true);
    });
  });
});
