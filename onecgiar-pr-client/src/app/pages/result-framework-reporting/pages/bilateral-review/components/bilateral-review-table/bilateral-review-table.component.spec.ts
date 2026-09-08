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

      const names = byTestId('bilateral-review-group-name').map(el => el.textContent?.trim());
      const summaries = byTestId('bilateral-review-group-summary').map(el => el.textContent?.trim());
      const pending = byTestId('bilateral-review-group-pending').map(el => el.textContent?.trim());

      expect(names).toEqual(['P1 - Alpha Project', 'P2 - Beta Project']);
      expect(summaries).toEqual(['2 results', '1 results']);
      expect(pending).toEqual(['1 pending', '0 pending']);
    });

    it('drops a group left with zero results', () => {
      const empty: BilateralReviewGroup = { key: 'P3 - Empty Project', label: 'P3 - Empty Project', caption: null, center: null, results: [] };
      render([GROUP_A, empty]);

      const names = byTestId('bilateral-review-group-name').map(el => el.textContent?.trim());
      expect(names).toEqual(['P1 - Alpha Project']);
    });

    it('groups render expanded by default (BRT-R-10)', () => {
      render([GROUP_A, GROUP_B]);
      expect(byTestId('bilateral-review-row-action').length).toBe(3);
    });
  });

  describe('Group header pending badge — token-based, only when M > 0 (BRP-R-11, R-12)', () => {
    it('the pending badge carries the yellow tokens only for a group with M > 0; a zero-pending group renders muted text instead', () => {
      render([GROUP_A, GROUP_B]);
      const badges = byTestId('bilateral-review-group-pending');

      expect(badges[0].className).toContain('bg-[var(--pr-color-yellow-100)]');
      expect(badges[0].className).toContain('text-[var(--pr-color-yellow-900)]');
      expect(badges[1].className).not.toContain('bg-[var(--pr-color-yellow-100)]');
    });

    it('project-mode caption shows the distinct lead centers; center-mode caption shows "N projects"', () => {
      render([GROUP_A]);
      // GROUP_A spans CIP + IITA.
      expect(root().textContent).toContain('CIP, IITA');

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
      render([GROUP_A, GROUP_B]);
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
      render([GROUP_A, GROUP_B]);
      expect(byTestId('bilateral-review-row-action').length).toBe(3);

      fixture.componentRef.setInput('allExpanded', false);
      fixture.componentRef.setInput('expandAllNonce', 1);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(0);

      fixture.componentRef.setInput('allExpanded', true);
      fixture.componentRef.setInput('expandAllNonce', 2);
      fixture.detectChanges();
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(3);
    });
  });

  describe('Namespaced collapse memory survives a groupMode round trip (BRP-R-11, judgment-day L-4)', () => {
    it('collapsing a group in center mode, switching to project mode, then back to center — the group stays collapsed and no group is force-expanded', () => {
      const centerA: BilateralReviewGroup = { key: 'IITA', label: 'IITA', caption: BILATERAL_REVIEW_COPY.table.projectsCaption(1), center: null, results: [GROUP_A.results[1]] };
      const centerB: BilateralReviewGroup = { key: 'CIP', label: 'CIP', caption: BILATERAL_REVIEW_COPY.table.projectsCaption(1), center: null, results: [GROUP_A.results[0]] };

      render([centerA, centerB], { groupMode: 'center' });
      expect(byTestId('bilateral-review-row-action').length).toBe(2);

      (byTestId('bilateral-review-group-toggle')[0] as HTMLButtonElement).click(); // collapse IITA
      fixture.detectChanges();
      expect(byTestId('bilateral-review-row-action').length).toBe(1);

      // Switch to project mode — a DIFFERENT key space (no nonce bump, so this must not force
      // expand-all; both project groups render expanded because it's their first appearance).
      fixture.componentRef.setInput('groups', [GROUP_A, GROUP_B]);
      fixture.componentRef.setInput('groupMode', 'project');
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

  describe('Status chip tone by loose status_id (neutral for non-5/6/7, e.g. Editing)', () => {
    it('tones amber / green / red / neutral and shows the raw status_name for a neutral row', () => {
      const statuses = projectGroup('P5 - Statuses Project', [
        row({ id: 'st1', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 5, status_name: 'Pending Review' }),
        row({ id: 'st2', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 6, status_name: 'Approved' }),
        row({ id: 'st3', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 7, status_name: 'Rejected' }),
        row({ id: 'st4', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 1, status_name: 'Editing' })
      ]);
      render([statuses]);

      const chips = byTestId('bilateral-review-row-status');
      expect(chips[0].className).toContain('bg-amber-50');
      expect(chips[1].className).toContain('bg-emerald-50');
      expect(chips[2].className).toContain('bg-red-50');
      expect(chips[3].className).toContain('bg-slate-100');
      expect(chips[3].textContent?.trim()).toBe('Editing');
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

      // tbody rows: [0] group header, [1] c1 (Contributor), [2] c2 (Primary submitter).
      const rows = root().querySelectorAll('tbody tr');
      expect(rows[1].textContent).toContain('Contributor');
      expect(rows[2].textContent).not.toContain('Contributor');
    });
  });

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-8, AC-8)
  describe('Row density — no category column, caption under the title, line-clamp + title (BRP-R-8, AC-8)', () => {
    it('renders no "Indicator category" header/column and shows the category as a caption under the title', () => {
      render([GROUP_A]);
      const headerTexts = Array.from(root().querySelectorAll('thead th')).map(th => th.textContent?.trim());
      expect(headerTexts).not.toContain('Indicator category');
      expect(headerTexts.length).toBe(8);

      const titleCell = byTestId('bilateral-review-row-action')[0].closest('tr')!.querySelectorAll('td')[1];
      expect(titleCell.textContent).toContain(GROUP_A.results[0].indicator_category);
    });

    it('clamps a long title to 2 lines and carries the full text in `title`', () => {
      const longTitle = 'A'.repeat(200);
      const group = projectGroup('P8 - Long Title Project', [row({ id: 'lt1', project_id: 'p8', project_name: 'P8 - Long Title Project', result_title: longTitle })]);
      render([group]);

      const titleParagraph = root().querySelector('tbody tr:nth-child(2) p') as HTMLElement;
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

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-9, AC-9, judgment-day JB-14)
  describe('Muted placeholders — TOC result / Indicator (BRP-R-9, AC-9)', () => {
    it('"Not specified" and "Not Applicable" render as an aria-hidden dash with an sr-only sibling carrying the original text', () => {
      const group = projectGroup('P9 - Placeholder Project', [
        row({ id: 'ph1', project_id: 'p9', project_name: 'P9 - Placeholder Project', toc_title: 'Not specified', indicator: 'Not Applicable' })
      ]);
      render([group]);

      const rowEl = root().querySelectorAll('tbody tr')[1];
      const tocCell = rowEl.querySelectorAll('td')[4];
      const indicatorCell = rowEl.querySelectorAll('td')[5];

      const tocDash = tocCell.querySelector('span[aria-hidden="true"]') as HTMLElement;
      expect(tocDash.textContent).toBe('—');
      expect(tocDash.getAttribute('title')).toBe('Not specified');
      expect(tocCell.querySelector('.sr-only')?.textContent).toBe('Not specified');

      const indicatorDash = indicatorCell.querySelector('span[aria-hidden="true"]') as HTMLElement;
      expect(indicatorDash.getAttribute('title')).toBe('Not Applicable');
      expect(indicatorCell.querySelector('.sr-only')?.textContent).toBe('Not Applicable');
    });

    it('a genuinely blank value falls back to the "Not specified" copy in both title and sr-only text', () => {
      const group = projectGroup('P10 - Blank Project', [row({ id: 'bl1', project_id: 'p10', project_name: 'P10 - Blank Project', toc_title: '' as unknown as string, indicator: '' as unknown as string })]);
      render([group]);

      const rowEl = root().querySelectorAll('tbody tr')[1];
      const tocCell = rowEl.querySelectorAll('td')[4];
      expect(tocCell.querySelector('span[aria-hidden="true"]')?.getAttribute('title')).toBe(BILATERAL_REVIEW_COPY.table.notSpecified);
    });

    it('a normal value renders as text, not the placeholder dash', () => {
      render([GROUP_A]);
      const rowEl = root().querySelectorAll('tbody tr')[1];
      const tocCell = rowEl.querySelectorAll('td')[4];
      expect(tocCell.querySelector('span[aria-hidden="true"]')).toBeNull();
      expect(tocCell.textContent).toContain('ToC');
    });
  });

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-2, R-8, R-14 (f))
  describe('Date format — d MMM y, right-aligned (BRP-R-8, R-14 (f))', () => {
    it('renders "23 Feb 2026" from "2026-02-23"', () => {
      const group = projectGroup('P11 - Date Project', [row({ id: 'd1', project_id: 'p11', project_name: 'P11 - Date Project', submission_date: '2026-02-23' })]);
      render([group]);

      const rowEl = root().querySelectorAll('tbody tr')[1];
      const dateCell = rowEl.querySelectorAll('td')[6];
      expect(dateCell.textContent?.trim()).toBe('23 Feb 2026');
      expect(dateCell.className).toContain('text-right');
    });
  });

  describe('Copy strings render from BILATERAL_REVIEW_COPY.table (Reviewer fix #4)', () => {
    it('renders the eight column headers from copy.table.headers', () => {
      render([GROUP_A]);
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

  describe('Grouped view leaves horizontal scroll to PrGroupTableComponent (Reviewer fix #2)', () => {
    it('does not wrap app-bilateral-review-table in its own overflow-x-auto when grouped', () => {
      render([GROUP_A]);
      const wrapper = root().querySelector('[data-testid="bilateral-review-table"]') as HTMLElement;
      expect(wrapper.className).not.toContain('overflow-x-auto');
    });
  });

  // @akili-spec changes/bilateral-review-ux-polish (BRP-T-3, R-13, R-14 (d), AC-11, AC-12)
  describe('Narrow cards below 900px (BRP-R-13)', () => {
    it('narrow=true renders ul[role=list] with li count = row count and no <table> element (FAIL input: leave the table branch mounted)', () => {
      render([GROUP_A, GROUP_B], { narrow: true });

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

    it('narrow=false renders the usual grouped table branch — no ul[role=list], group togglers still work', () => {
      render([GROUP_A], { narrow: false });
      expect(root().querySelector('ul[role="list"]')).toBeNull();
      expect(root().querySelector('table')).toBeTruthy();
      expect(byTestId('bilateral-review-group-toggle').length).toBe(1);
    });

    it('grouped narrow: the group header bar toggles the group\'s cards through the owned expandedKeys — collapsing in cards then switching narrow=false shows the group collapsed in the table too', () => {
      render([GROUP_A, GROUP_B], { narrow: true });
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
      render([GROUP_A, GROUP_B]);
      expect(byTestId('bilateral-review-row-action').length).toBe(3);

      // Manually collapse Group A via the toggler — mutates only the CHILD `PrGroupTableComponent`'s
      // own internal state; without the `userCollapsedKeys` exclusion this test fails because the
      // next re-seed falls back to the stale `lastKeys` value and re-expands Group A.
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
  });
});
