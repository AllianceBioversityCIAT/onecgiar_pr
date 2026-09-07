// @akili-spec changes/sp-bilateral-review-tab (BRT-T-4, BRT-AC-8, BRT-AC-15)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralReviewTableComponent } from './bilateral-review-table.component';
import { GroupedResult, ResultToReview } from '../result-review-drawer/result-review-drawer.interfaces';
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

const GROUP_A: GroupedResult = {
  project_id: 'p1',
  project_name: 'P1 - Alpha Project',
  results: [
    row({ id: 'a1', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-001', status_id: 5, status_name: 'Pending Review', lead_center: 'CIP' }),
    row({ id: 'a2', project_id: 'p1', project_name: 'P1 - Alpha Project', result_code: 'BR-002', status_id: 6, status_name: 'Approved', lead_center: 'IITA' })
  ]
};

const GROUP_B: GroupedResult = {
  project_id: 'p2',
  project_name: 'P2 - Beta Project',
  results: [row({ id: 'b1', project_id: 'p2', project_name: 'P2 - Beta Project', result_code: 'BR-003', status_id: 7, status_name: 'Rejected', lead_center: 'CIAT' })]
};

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
  function render(groups: GroupedResult[], extra: Record<string, unknown> = {}): void {
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

  describe('Grouped view — headers and counts (BRT-R-10)', () => {
    it('renders group headers with "N results · M pending" and the project name as delivered', () => {
      render([GROUP_A, GROUP_B]);

      const names = byTestId('bilateral-review-group-name').map(el => el.textContent?.trim());
      const summaries = byTestId('bilateral-review-group-summary').map(el => el.textContent?.trim());

      expect(names).toEqual(['P1 - Alpha Project', 'P2 - Beta Project']);
      expect(summaries).toEqual(['2 results · 1 pending', '1 results · 0 pending']);
    });

    it('drops a group left with zero results', () => {
      const empty: GroupedResult = { project_id: 'p3', project_name: 'P3 - Empty Project', results: [] };
      render([GROUP_A, empty]);

      const names = byTestId('bilateral-review-group-name').map(el => el.textContent?.trim());
      expect(names).toEqual(['P1 - Alpha Project']);
    });

    it('groups render expanded by default (BRT-R-10)', () => {
      render([GROUP_A, GROUP_B]);
      expect(byTestId('bilateral-review-row-action').length).toBe(3);
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
      const stringStatusGroup: GroupedResult = {
        project_id: 'p4',
        project_name: 'P4 - String Status Project',
        results: [row({ id: 's1', project_id: 'p4', project_name: 'P4 - String Status Project', status_id: '5', status_name: 'Pending Review' })]
      };
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
      const statuses: GroupedResult = {
        project_id: 'p5',
        project_name: 'P5 - Statuses Project',
        results: [
          row({ id: 'st1', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 5, status_name: 'Pending Review' }),
          row({ id: 'st2', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 6, status_name: 'Approved' }),
          row({ id: 'st3', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 7, status_name: 'Rejected' }),
          row({ id: 'st4', project_id: 'p5', project_name: 'P5 - Statuses Project', status_id: 1, status_name: 'Editing' })
        ]
      };
      render([statuses]);

      const chips = byTestId('bilateral-review-row-status');
      expect(chips[0].className).toContain('bg-amber-50');
      expect(chips[1].className).toContain('bg-emerald-50');
      expect(chips[2].className).toContain('bg-red-50');
      expect(chips[3].className).toContain('bg-slate-100');
      expect(chips[3].textContent?.trim()).toBe('Editing');
    });
  });

  describe('Contributor tag (BRT-R-11)', () => {
    it('shows a Contributor tag only for initiative_role_name = Contributor', () => {
      const group: GroupedResult = {
        project_id: 'p6',
        project_name: 'P6 - Gamma Project',
        results: [
          row({ id: 'c1', project_id: 'p6', project_name: 'P6 - Gamma Project', initiative_role_name: 'Contributor' }),
          row({ id: 'c2', project_id: 'p6', project_name: 'P6 - Gamma Project', initiative_role_name: 'Primary submitter' })
        ]
      };
      render([group]);

      // tbody rows: [0] group header, [1] c1 (Contributor), [2] c2 (Primary submitter).
      const rows = root().querySelectorAll('tbody tr');
      expect(rows[1].textContent).toContain('Contributor');
      expect(rows[2].textContent).not.toContain('Contributor');
    });
  });

  // ── Rework attempt 2 — Reviewer fix #2/#3/#4 + Leader H2-1/advisory (same lines, no new scope) ──

  describe('Header/cell chrome parity across grouped and flat (Reviewer fix #3)', () => {
    it('renders the identical header cell class list in grouped and flat views', () => {
      render([GROUP_A]);
      const groupedHeaderClass = (root().querySelector('thead th') as HTMLElement).className;

      fixture.componentRef.setInput('view', 'flat');
      fixture.componentRef.setInput('flatRows', GROUP_A.results);
      fixture.detectChanges();
      fixture.detectChanges();

      const flatHeaderClass = (root().querySelector('thead th') as HTMLElement).className;
      expect(flatHeaderClass).toBe(groupedHeaderClass);
      // Guards against reintroducing the inert grouped-only chrome class this fix removed.
      expect(flatHeaderClass).not.toContain('pr-table');
    });

    it('renders the identical first-row td class list in grouped and flat views, with a divider on every cell', () => {
      render([GROUP_A]);
      const groupedRowCells = Array.from(root().querySelectorAll('tbody tr')[1].querySelectorAll('td')).map(td => td.className);

      fixture.componentRef.setInput('view', 'flat');
      fixture.componentRef.setInput('flatRows', GROUP_A.results);
      fixture.detectChanges();
      fixture.detectChanges();

      const flatRowCells = Array.from(root().querySelectorAll('tbody tr')[0].querySelectorAll('td')).map(td => td.className);
      expect(flatRowCells).toEqual(groupedRowCells);
      // Row separation now lives on every cell (not the <tr>) since `border-collapse: separate`
      // on `.pr-table` never paints a row-level border — see Reviewer fix #3 remediation.
      for (const cellClass of groupedRowCells) {
        expect(cellClass).toContain('!border-b');
        expect(cellClass).toContain('!border-[var(--pr-border-divider)]');
      }
    });
  });

  describe('Copy strings render from BILATERAL_REVIEW_COPY.table (Reviewer fix #4)', () => {
    it('renders the nine column headers from copy.table.headers', () => {
      render([GROUP_A]);
      const headerTexts = Array.from(root().querySelectorAll('thead th')).map(th => th.textContent?.trim());
      expect(headerTexts).toEqual(Object.values(BILATERAL_REVIEW_COPY.table.headers));
    });

    it('renders the Contributor badge and Not specified fallback from copy', () => {
      const group: GroupedResult = {
        project_id: 'p7',
        project_name: 'P7 - Copy Project',
        results: [row({ id: 'cp1', project_id: 'p7', project_name: 'P7 - Copy Project', initiative_role_name: 'Contributor', lead_center: undefined })]
      };
      render([group]);

      expect(root().textContent).toContain(BILATERAL_REVIEW_COPY.table.contributorBadge);
      expect(root().textContent).toContain(BILATERAL_REVIEW_COPY.table.notSpecified);
    });

    it('renders the row action as a ghost button', () => {
      render([GROUP_A], { canReview: true });
      const action = byTestId('bilateral-review-row-action')[0];
      expect(action.getAttribute('variant')).toBe('ghost');
    });
  });

  describe('Actions column sticks to the right edge (Leader H2-1)', () => {
    it('gives the Actions header and row cell sticky classes', () => {
      render([GROUP_A]);
      const headerCells = root().querySelectorAll('thead th');
      const actionsHeader = headerCells[headerCells.length - 1] as HTMLElement;
      expect(actionsHeader.className).toContain('sticky');
      expect(actionsHeader.className).toContain('right-0');

      const actionCell = byTestId('bilateral-review-row-action')[0].closest('td') as HTMLElement;
      expect(actionCell.className).toContain('sticky');
      expect(actionCell.className).toContain('right-0');
    });
  });

  describe('Grouped view leaves horizontal scroll to PrGroupTableComponent (Reviewer fix #2)', () => {
    it('does not wrap app-bilateral-review-table in its own overflow-x-auto when grouped', () => {
      render([GROUP_A]);
      const wrapper = root().querySelector('[data-testid="bilateral-review-table"]') as HTMLElement;
      expect(wrapper.className).not.toContain('overflow-x-auto');
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
