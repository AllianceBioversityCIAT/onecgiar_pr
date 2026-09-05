import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LabReportFormComponent } from '../lab-report-form/lab-report-form.component';
import { DrawerTab, IndicatorDrawerComponent, initialDrawerWidth, toReportedResultRow } from './indicator-drawer.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { PrToastService } from '../../../../../../shared/components/pr-toast';

/**
 * Template replaced on purpose — these tests cover the drawer's rules (which id it queries with,
 * how it reads the answer, the unsaved-work guard), not its markup.
 */

describe('IndicatorDrawerComponent', () => {
  let fixture: ComponentFixture<IndicatorDrawerComponent>;
  let component: IndicatorDrawerComponent;
  let getExisting: jest.Mock;

  async function setup(indicator: Record<string, any>, phases: any[] = []) {
    getExisting = jest.fn().mockReturnValue(of({ response: { contributors: [], resultTocResultId: 1, tocResultIndicatorId: 'IND-55' } }));

    await TestBed.configureTestingModule({
      imports: [IndicatorDrawerComponent],
      providers: [
        { provide: ApiService, useValue: { resultsSE: { GET_ExistingResultsContributors: getExisting } } },
        { provide: PhasesService, useValue: { phases: { reporting: phases } } }
      ]
    })
      .overrideComponent(IndicatorDrawerComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(IndicatorDrawerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('indicator', indicator);
    fixture.detectChanges();
  }

  describe('existing results', () => {
    it('queries with related_node_id — the column the server actually persists', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55', toc_result_indicator_id: 'SOMETHING-ELSE' });

      expect(getExisting).toHaveBeenCalledWith('toc-1', 'IND-55', 'all');
    });

    it('reads response.contributors — the endpoint answers an object, never an array', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      getExisting.mockReturnValue(
        of({ response: { contributors: [{ result_code: 'R-1', result_title: 'A result' }], resultTocResultId: 1, tocResultIndicatorId: 'IND-55' } })
      );
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.existing()).toEqual([{ result_code: 'R-1', result_title: 'A result' }]);
      expect(component.existing()!.length).toBe(1);
    });

    it('does not call the endpoint when the indicator carries no node id', async () => {
      await setup({ toc_result_id: 'toc-1' });

      expect(getExisting).not.toHaveBeenCalled();
      expect(component.existing()).toEqual([]);
    });

    it('falls back to an empty list when the endpoint errors — 404 is expected for a virgin indicator', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      getExisting.mockReturnValue(throwError(() => ({ status: 404 })));
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.existing()).toEqual([]);
      expect(component.loadingExisting()).toBe(false);
    });
  });

  // @akili-spec changes/indicator-reported-results
  // IRR-R-2.2 / IRR-R-2.3 / IRR-DD-3 — the view-model mapper. Category comes from the server name,
  // phase from the client's phase list; both have a fallback that must never leak `undefined`,
  // `null` or a numeric id into a cell.
  describe('toReportedResultRow (IRR-R-2.2, IRR-R-2.3)', () => {
    const PHASES = [
      { id: 11, phase_name: 'Reporting 2026' },
      { id: 12, phase_name: 'Reporting 2025' }
    ];

    it('maps a full contributor payload to the row view model', () => {
      const row = toReportedResultRow(
        {
          result_id: 9006,
          title: 'A knowledge product',
          result_code: '9006',
          status_name: 'Quality Assessed',
          status_id: 2,
          version_id: 11,
          result_type_id: 6,
          result_type_name: 'Knowledge product',
          contributing_indicator: 3
        },
        PHASES
      );

      expect(row).toEqual({
        id: 9006,
        code: '9006',
        title: 'A knowledge product',
        category: 'Knowledge product',
        statusId: 2,
        statusName: 'Quality Assessed',
        contribution: 3,
        versionId: 11,
        phaseName: 'Reporting 2026',
        raw: expect.objectContaining({ result_id: 9006 })
      });
    });

    it('renders an em dash for a null result_type_name — never the numeric id (IRR-R-2.2)', () => {
      const row = toReportedResultRow({ result_code: '8871', result_type_id: 6, result_type_name: null }, PHASES);

      expect(row.category).toBe('\u2014');
      expect(row.category).not.toBe('6');
    });

    it('falls back to the raw version_id digits when the phase is not in the list (IRR-R-2.3)', () => {
      const row = toReportedResultRow({ result_code: '8702', version_id: 99 }, PHASES);

      expect(row.phaseName).toBe('99');
    });

    it('keeps contribution numeric and null-safe (IRR-R-2.4)', () => {
      expect(toReportedResultRow({ contributing_indicator: '4' }, PHASES).contribution).toBe(4);
      expect(toReportedResultRow({ contributing_indicator: null }, PHASES).contribution).toBeNull();
      expect(toReportedResultRow({}, PHASES).contribution).toBeNull();
    });
  });

  // @akili-spec changes/indicator-reported-results
  // IRR-R-3 / IRR-R-3.2 / IRR-R-7 — one request per indicator open, opted into the wider population,
  // and an error channel that tells a 404 (virgin indicator = empty) from a real failure.
  describe('Reported results data path (IRR-R-3, IRR-R-7)', () => {
    it('requests the wider population with scope=all, once per indicator open (IRR-R-3, IRR-R-3.2)', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });

      expect(getExisting).toHaveBeenCalledTimes(1);
      expect(getExisting).toHaveBeenCalledWith('toc-1', 'IND-55', 'all');
    });

    it('treats 404 as an empty list and leaves loadError null (IRR-R-7)', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      getExisting.mockReturnValue(throwError(() => ({ status: 404 })));
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.existing()).toEqual([]);
      expect(component.loadError()).toBeNull();
    });

    it('raises loadError for a 500 — a failure must never read as "nothing reported" (IRR-R-7)', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      getExisting.mockReturnValue(throwError(() => ({ status: 500 })));
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.loadError()).toBe('Could not load reported results');
      expect(component.loadingExisting()).toBe(false);
    });

    it('clears loadError when the next indicator loads — new state must reset per indicator', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      getExisting.mockReturnValue(throwError(() => ({ status: 500 })));
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();
      expect(component.loadError()).not.toBeNull();

      getExisting.mockReturnValue(of({ response: { contributors: [] } }));
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-3', related_node_id: 'IND-57' });
      fixture.detectChanges();

      expect(component.loadError()).toBeNull();
    });

    it('orders reportedRows by contribution descending, then by code (IRR-R-6 default order)', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' }, [{ id: 11, phase_name: 'Reporting 2026' }]);
      getExisting.mockReturnValue(
        of({
          response: {
            contributors: [
              { result_code: '8871', title: 'Submitted one', status_name: 'Submitted', contributing_indicator: 1, version_id: 11 },
              { result_code: '8702', title: 'Editing one', status_name: 'Editing', contributing_indicator: 1, version_id: 11 },
              { result_code: '9006', title: 'QA one', status_name: 'Quality Assessed', contributing_indicator: 3, version_id: 11, result_type_name: 'Knowledge product' }
            ]
          }
        })
      );
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.reportedRows().map(r => r.code)).toEqual(['9006', '8702', '8871']);
      expect(component.reportedRows()[0].category).toBe('Knowledge product');
      expect(component.reportedRows()[0].phaseName).toBe('Reporting 2026');
      expect(component.reportedRows()[1].category).toBe('\u2014');
    });
  });

  describe('reporting permission', () => {
    it('defaults to false so a host that forgets to pass it cannot expose the action', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });

      expect(component.canReport()).toBe(false);
    });

    it('takes the value the host passes', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      fixture.componentRef.setInput('canReport', true);
      fixture.detectChanges();

      expect(component.canReport()).toBe(true);
    });
  });

  describe('unsaved-work guard', () => {
    it('asks before closing when the form has been touched', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      const closed = jest.fn();
      component.closed.subscribe(closed);

      component.onDirtyChange(true);
      component.requestClose();

      expect(component.confirmingExit()).toBe('close');
      expect(closed).not.toHaveBeenCalled();
    });

    it('closes straight away when nothing was typed', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      const closed = jest.fn();
      component.closed.subscribe(closed);

      component.requestClose();

      expect(closed).toHaveBeenCalled();
    });

    it('keeps what was typed when the user chooses to keep editing', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      const closed = jest.fn();
      component.closed.subscribe(closed);

      component.onDirtyChange(true);
      component.requestClose();
      component.cancelExit();

      expect(component.confirmingExit()).toBeNull();
      expect(closed).not.toHaveBeenCalled();
    });

    it('discards and closes when the user confirms', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      const closed = jest.fn();
      component.closed.subscribe(closed);

      component.onDirtyChange(true);
      component.requestClose();
      component.discardAndClose();

      expect(closed).toHaveBeenCalled();
      expect(component.formDirty()).toBe(false);
    });

    it('clears unsaved state when a different indicator is shown', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      component.onDirtyChange(true);

      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
      fixture.detectChanges();

      expect(component.formDirty()).toBe(false);
    });
  });
  describe('responsive width and collapsible context header (2026-08-27)', () => {
    const setViewport = (w: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
    const originalWidth = window.innerWidth;
    afterEach(() => setViewport(originalWidth));

    it('initialDrawerWidth: full-bleed under 768px, 740 baseline on laptops, capped at 1100 on very wide screens', () => {
      setViewport(390);
      expect(initialDrawerWidth()).toBe(390);
      setViewport(1280);
      expect(initialDrawerWidth()).toBe(740);
      setViewport(3800);
      expect(initialDrawerWidth()).toBe(1100);
      setViewport(1000);
      expect(initialDrawerWidth()).toBe(680); // viewport - 320 guard beats the 740 baseline
    });

    it('context header starts expanded on desktop widths and toggles collapsed/expanded', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55' });
      // jsdom default innerWidth (1024) >= 768 -> expanded
      expect(component.contextCollapsed()).toBe(false);
      component.toggleContext();
      expect(component.contextCollapsed()).toBe(true);
      component.toggleContext();
      expect(component.contextCollapsed()).toBe(false);
    });

    it('indicator description clamp: starts unexpanded and toggles with toggleDescription', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55', indicator_description: 'A very long indicator description' });
      expect(component.descriptionExpanded()).toBe(false);
      component.toggleDescription();
      expect(component.descriptionExpanded()).toBe(true);
      component.toggleDescription();
      expect(component.descriptionExpanded()).toBe(false);
    });

    it('needsDescriptionMore is false for short descriptions and true for descriptions over 120 chars', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55', indicator_description: 'Short indicator' });
      expect(component.needsDescriptionMore()).toBe(false);

      const longText = 'A'.repeat(125);
      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-1', related_node_id: 'IND-55', indicator_description: longText });
      fixture.detectChanges();
      expect(component.needsDescriptionMore()).toBe(true);
    });

    it('resets descriptionExpanded to false when indicator input changes', async () => {
      await setup({ toc_result_id: 'toc-1', related_node_id: 'IND-55', indicator_description: 'A'.repeat(150) });
      component.toggleDescription();
      expect(component.descriptionExpanded()).toBe(true);

      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56', indicator_description: 'Another indicator' });
      fixture.detectChanges();
      expect(component.descriptionExpanded()).toBe(false);
    });

    it('template declares clamped heading and Show more toggle for long descriptions', () => {
      const fs = require('fs');
      const tpl = fs.readFileSync(require('path').join(__dirname, 'indicator-drawer.component.html'), 'utf8');
      expect(tpl).toContain('line-clamp-2');
      expect(tpl).toContain('Show more');
      expect(tpl).toContain('Show less');
    });

    // The suite renders with template:'' (shallow), so the stacking fix is asserted on the
    // template source itself. Presence-level only: it proves the overlay declares a higher
    // z-index (z-60) than the sticky form footer (z-30) and that the old z-[5] is gone —
    // the actual paint order was verified manually (T6/HITL 2026-08-27 screenshots).
    it('unsaved-changes overlay declares z-[60], above the sticky form footer (z-30)', () => {
      const fs = require('fs');
      const tpl = fs.readFileSync(require('path').join(__dirname, 'indicator-drawer.component.html'), 'utf8');
      expect(tpl).toContain('inset-0 z-[60]');
      expect(tpl).not.toContain('inset-0 z-[5]');
      expect(tpl).toContain('max-w-[100vw]');
    });
  });
});

// @akili-spec changes/indicator-reported-results
// The create form is swapped for a stub so the drawer can be mounted with its REAL template: these
// assertions are about markup (which header the tab shows, what the Info tab no longer holds), and
// a shallow `template: ''` mount cannot see any of it.
@Component({ selector: 'app-lab-report-form', standalone: true, template: '' })
class LabReportFormStub {
  readonly tocNode = input<any>(null);
  readonly indicator = input<any>(null);
  readonly emergingMode = input<boolean>(false);
  readonly emergingCategory = input<{ id: number; name: string; levelId: number } | null>(null);
  readonly initiativeId = input<number>(0);
  readonly programCode = input<string>('');
  readonly columns = input<number>(1);
  readonly canReport = input<boolean>(false);
  readonly dirtyChange = output<boolean>();
  readonly cancelled = output<void>();
  readonly created = output<void>();
}

describe('IndicatorDrawerComponent — Reported results tab DOM (IRR-R-1, IRR-R-9, IRR-R-10)', () => {
  const CONTRIBUTORS = [
    { result_code: '9006', title: 'QA one', status_name: 'Quality Assessed', status_id: 2, contributing_indicator: 3, version_id: 11, result_type_name: 'Knowledge product' },
    { result_code: '8871', title: 'Submitted one', status_name: 'Submitted', status_id: 3, contributing_indicator: 1, version_id: 11 }
  ];

  async function mount(initialTab: 'report' | 'info' | 'results', contributors: any[] = CONTRIBUTORS) {
    await TestBed.configureTestingModule({
      imports: [IndicatorDrawerComponent],
      providers: [
        {
          provide: ApiService,
          useValue: { resultsSE: { GET_ExistingResultsContributors: jest.fn().mockReturnValue(of({ response: { contributors } })) } }
        },
        { provide: PhasesService, useValue: { phases: { reporting: [{ id: 11, phase_name: 'Reporting 2026' }] } } }
      ]
    })
      .overrideComponent(IndicatorDrawerComponent, { remove: { imports: [LabReportFormComponent] }, add: { imports: [LabReportFormStub] } })
      .compileComponents();

    const fixture = TestBed.createComponent(IndicatorDrawerComponent);
    fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-1', related_node_id: 'IND-55', indicator_description: 'HL04', target_value_sum: 8 });
    fixture.componentRef.setInput('initialTab', initialTab);
    fixture.detectChanges();
    return fixture;
  }

  const headerText = (fixture: ComponentFixture<IndicatorDrawerComponent>) =>
    fixture.nativeElement.querySelector('h3')?.textContent?.trim();

  it('titles the drawer exactly "Reported results" on the results tab (IRR-R-10)', async () => {
    const fixture = await mount('results');

    expect(headerText(fixture)).toBe('Reported results');
    expect(fixture.nativeElement.textContent).toContain('fact_check');
  });

  it('keeps the host initialTab authoritative: "report" on an indicator WITH results still shows the form (IRR-R-1)', async () => {
    const fixture = await mount('report');

    expect(fixture.componentInstance.tab()).toBe('report');
    expect(headerText(fixture)).toBe('Report result');
  });

  it('still titles the info tab "Indicator information" (unchanged)', async () => {
    const fixture = await mount('info');

    expect(headerText(fixture)).toBe('Indicator information');
  });

  it('removes the Reported results card list from the Info tab, keeping Target and the split (IRR-R-9, IRR-AC-8)', async () => {
    const fixture = await mount('info');
    // The report pane stays mounted (hidden) so the form survives tab switches — measure only what
    // the Info tab shows.
    const pane: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="irr-report-pane"]');
    const text: string = fixture.nativeElement.textContent.replace(pane?.textContent ?? '', '');

    expect(text).not.toContain('Reported results');
    expect(text).not.toContain('QA one');
    expect(text).toContain('Overall target');
    expect(text).toContain('Achieved so far');
  });

  it('renders the contributing results on the results tab, ordered by contribution', async () => {
    const fixture = await mount('results');
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('9006');
    expect(text).toContain('8871');
    expect(text.indexOf('9006')).toBeLessThan(text.indexOf('8871'));
  });

  it('sends "See all N in detail" on the Report tab to the results tab, not to info (IRR-R-9)', async () => {
    const fixture = await mount('report');
    const link = seeAllLink(fixture);

    expect(link).toBeTruthy();
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe(`See all ${CONTRIBUTORS.length} in detail`);
    link.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.tab()).toBe('results');
    expect(headerText(fixture)).toBe('Reported results');
  });

  // Follow-up 2026-09-04 (quick/indicator-reported-results-followups) — three field findings on the
  // shipped tab: the preview grew without bound, "See them in detail" was a one-way trip that also
  // unmounted the form being filled, and the table added a second scroller (scss, not testable here).
  describe('follow-ups: capped preview, back link, form survives the round trip', () => {
    const NINE = Array.from({ length: 9 }, (_, i) => ({
      result_id: 100 + i,
      result_code: String(9000 + i),
      title: `Result ${i}`,
      status_id: 1,
      status_name: 'Editing',
      version_id: 11,
      contributing_indicator: 1,
      result_type_name: 'Knowledge product'
    }));

    it('lists at most three results in the Report-tab preview and counts the rest', async () => {
      const fixture = await mount('report', NINE);
      const items: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('ul li'));
      const more: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="irr-preview-more"]');

      expect(items.length).toBe(4); // 3 rows + the "…and N more" line
      expect(more?.textContent?.trim()).toBe('…and 6 more');
      expect(fixture.nativeElement.textContent).toContain('9000');
      expect(fixture.nativeElement.textContent).not.toContain('9003');
      expect(seeAllLink(fixture).textContent?.replace(/\s+/g, ' ').trim()).toBe('See all 9 in detail');
    });

    it('offers "Back to Report result" only when the table was reached from the Report tab', async () => {
      const direct = await mount('results');
      expect(direct.nativeElement.querySelector('[data-testid="irr-back"]')).toBeNull();
      TestBed.resetTestingModule();

      const viaReport = await mount('report');
      seeAllLink(viaReport).click();
      viaReport.detectChanges();
      const back: HTMLButtonElement | null = viaReport.nativeElement.querySelector('[data-testid="irr-back"]');
      expect(back?.textContent?.replace(/\s+/g, ' ').trim()).toBe('arrow_back Back to Report result');

      back!.click();
      viaReport.detectChanges();
      expect(viaReport.componentInstance.tab()).toBe('report');
      expect(headerText(viaReport)).toBe('Report result');
      expect(viaReport.componentInstance.returnTab()).toBeNull();
    });

    it('keeps the report form mounted (and its unsaved state) while the table is shown', async () => {
      const fixture = await mount('report');
      const component = fixture.componentInstance;
      const formBefore = fixture.nativeElement.querySelector('app-lab-report-form');
      component.onDirtyChange(true);

      seeAllLink(fixture).click();
      fixture.detectChanges();
      const pane: HTMLElement = fixture.nativeElement.querySelector('[data-testid="irr-report-pane"]');
      expect(pane.style.display).toBe('none');
      expect(fixture.nativeElement.querySelector('app-lab-report-form')).toBe(formBefore);
      expect(component.formDirty()).toBe(true);

      fixture.nativeElement.querySelector('[data-testid="irr-back"]').click();
      fixture.detectChanges();
      expect(pane.style.display).toBe('');
      expect(component.formDirty()).toBe(true);
    });

    it('forgets the return tab when another indicator is shown', async () => {
      const fixture = await mount('report');
      seeAllLink(fixture).click();
      fixture.detectChanges();
      expect(fixture.componentInstance.returnTab()).toBe('report');

      fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-99', indicator_description: 'HL05', target_value_sum: 3 });
      fixture.detectChanges();
      expect(fixture.componentInstance.returnTab()).toBeNull();
    });
  });

  function seeAllLink(fixture: any): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) =>
      b.textContent?.replace(/\s+/g, ' ').trim().startsWith('See all ')
    ) as HTMLButtonElement;
  }
});

// @akili-spec changes/indicator-reported-results
// IRR-T-3 — the table itself. These mount the REAL template (the create form stubbed) because every
// assertion below is about rendered DOM: cell text, the resolved pill token PAIR, the strip's exact
// sentence, which control navigates and which one must not.
describe('IndicatorDrawerComponent — Reported results table (IRR-T-3)', () => {
  /** The spec's fixture: target 8, row ACHIEVED 3, Σ contribution 5 (IRR-AC-2). */
  const FIXTURE = [
    {
      result_id: 9006,
      result_code: '9006',
      title: 'Barley EAF ICARDA TPP00143 gender-responsive trait profile published',
      status_name: 'Quality assessed',
      status_id: 2,
      contributing_indicator: 3,
      version_id: 11,
      result_type_name: 'Knowledge product'
    },
    {
      result_id: 8871,
      result_code: '8871',
      title: 'Partnership expansion brief — thematic collaboration with NARES',
      status_name: 'Submitted',
      status_id: 3,
      contributing_indicator: 1,
      version_id: 11,
      result_type_name: 'Knowledge product'
    },
    {
      result_id: 8702,
      result_code: '8702',
      title: 'Dataset: crop-agnostic partner map v2',
      status_name: 'Editing',
      status_id: 1,
      contributing_indicator: 1,
      version_id: 11,
      result_type_name: 'Knowledge product'
    }
  ];

  const INDICATOR = {
    toc_result_id: 'toc-1',
    related_node_id: 'IND-55',
    indicator_description: 'HL04',
    target_value_sum: 8,
    actual_achieved_value_sum: 3
  };

  let getExisting: jest.Mock;
  let router: { navigate: jest.Mock; createUrlTree: jest.Mock; serializeUrl: jest.Mock };

  async function mount(contributors: any[] = FIXTURE, indicator: Record<string, any> = INDICATOR, error?: { status: number }) {
    getExisting = jest.fn().mockReturnValue(error ? throwError(() => error) : of({ response: { contributors } }));
    router = {
      navigate: jest.fn().mockResolvedValue(true),
      // Minimal stand-in for the real pair used by `resultLink()`: keep commands and query params
      // intact so the spec can assert the DESTINATION, not the router's encoding.
      createUrlTree: jest.fn((commands: unknown[], extras: { queryParams?: Record<string, unknown> }) => ({ commands, extras })),
      serializeUrl: jest.fn((tree: { commands: unknown[]; extras: { queryParams?: Record<string, unknown> } }) => {
        const path = (tree.commands as string[]).join('/').replace(/\/{2,}/g, '/');
        const query = new URLSearchParams(
          Object.entries(tree.extras?.queryParams ?? {}).map(([key, value]) => [key, String(value)])
        ).toString();
        return query ? `${path}?${query}` : path;
      })
    };

    await TestBed.configureTestingModule({
      imports: [IndicatorDrawerComponent],
      providers: [
        { provide: ApiService, useValue: { resultsSE: { GET_ExistingResultsContributors: getExisting } } },
        { provide: PhasesService, useValue: { phases: { reporting: [{ id: 11, phase_name: 'Reporting 2026' }] } } },
        { provide: Router, useValue: router }
      ]
    })
      .overrideComponent(IndicatorDrawerComponent, { remove: { imports: [LabReportFormComponent] }, add: { imports: [LabReportFormStub] } })
      .compileComponents();

    const fixture = TestBed.createComponent(IndicatorDrawerComponent);
    fixture.componentRef.setInput('indicator', indicator);
    fixture.componentRef.setInput('initialTab', 'results');
    fixture.detectChanges();
    return fixture;
  }

  const squash = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

  /** Every data row as its cell strings, Code → Phase (the actions cell is the icon, not data). */
  const cells = (fixture: ComponentFixture<IndicatorDrawerComponent>): string[][] =>
    Array.from(fixture.nativeElement.querySelectorAll('tr.irr-data-row')).map((tr: any) =>
      Array.from(tr.querySelectorAll('td')).slice(0, 6).map((td: any) => squash(td.textContent))
    );

  const stripEl = (fixture: ComponentFixture<IndicatorDrawerComponent>): HTMLElement =>
    fixture.nativeElement.querySelector('[data-testid="irr-strip"]');

  /** `includes`, not `===`: several buttons prefix their label with a material-icon ligature. */
  const buttonWithText = (fixture: ComponentFixture<IndicatorDrawerComponent>, text: string): HTMLButtonElement =>
    (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(b => squash(b.textContent).includes(text))!;

  // ── IRR-R-2, IRR-AC-2 ─────────────────────────────────────────────────────
  it('renders every column of every row with its exact text (IRR-R-2, IRR-AC-2)', async () => {
    const fixture = await mount();

    expect(cells(fixture)).toEqual([
      ['#9006', 'Barley EAF ICARDA TPP00143 gender-responsive trait profile published', 'Knowledge product', 'Quality assessed', '3', 'Reporting 2026'],
      ['#8702', 'Dataset: crop-agnostic partner map v2', 'Knowledge product', 'Editing', '1', 'Reporting 2026'],
      ['#8871', 'Partnership expansion brief — thematic collaboration with NARES', 'Knowledge product', 'Submitted', '1', 'Reporting 2026']
    ]);
  });

  it('carries the full title in the Result cell title attribute and clamps it to two lines (IRR-R-2.5)', async () => {
    const fixture = await mount();
    const clamp: HTMLElement = fixture.nativeElement.querySelector('tr.irr-data-row .irr-clamp');

    expect(clamp.getAttribute('title')).toBe('Barley EAF ICARDA TPP00143 gender-responsive trait profile published');
  });

  it('paints the status pill with the RESOLVED token PAIR, and the not-started pair for an unknown id (IRR-R-2.1)', async () => {
    const fixture = await mount([
      FIXTURE[0],
      { result_id: 42, result_code: '0042', title: 'Unknown status', status_name: 'Something new', status_id: 99, contributing_indicator: 0, version_id: 11 }
    ]);
    const component = fixture.componentInstance;
    const rendered = component.reportedRows();

    // The PAIR, resolved from the status ids the table actually rendered — not a class name, which
    // would only prove a pill is present.
    expect(component.statusFg(rendered[0].statusId)).toBe('var(--pr-status-approved-fg)');
    expect(component.statusBg(rendered[0].statusId)).toBe('var(--pr-status-approved-bg)');
    // status_id 99 is not in the map → the not-started pair, whole, never a recombination.
    expect(rendered[1].statusId).toBe(99);
    expect(component.statusFg(rendered[1].statusId)).toBe('var(--pr-status-not-started-fg)');
    expect(component.statusBg(rendered[1].statusId)).toBe('var(--pr-status-not-started-bg)');

    // jsdom's cssstyle DROPS any `var()` value, so `el.style.color` is '' here for a binding that
    // works in a browser (probed: setting `style.color = 'var(--x)'` leaves the attribute null).
    // The wiring is therefore asserted at the template, against the two helpers above.
    const tpl: string = require('fs').readFileSync(require('path').join(__dirname, 'indicator-drawer.component.html'), 'utf8');
    expect(tpl).toContain('[style.color]="statusFg(row.statusId)"');
    expect(tpl).toContain('[style.background]="statusBg(row.statusId)"');

    const pills: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('tr.irr-data-row td:nth-child(4) span'));
    expect(pills.map(p => squash(p.textContent))).toEqual(['Quality assessed', 'Something new']);
  });

  it('renders an em dash for a null contribution and leaves it OUT of the sum (IRR-R-2.4, IRR-R-4)', async () => {
    const fixture = await mount([FIXTURE[0], { ...FIXTURE[1], contributing_indicator: null }, FIXTURE[2]]);
    const contributions = cells(fixture).map(row => row[4]);

    expect(contributions).toContain('—');
    // 3 + 1 + (null excluded) = 4, not 5 and not "0 counted as a row".
    expect(fixture.componentInstance.contributionSum()).toBe(4);
    expect(squash(stripEl(fixture).textContent)).toBe('3 results reported · Σ contribution 4 of target 8');
  });

  // ── IRR-R-4 / IRR-R-4.1 ───────────────────────────────────────────────────
  it('reads the strip exactly "3 results reported · Σ contribution 5 of target 8" (IRR-R-4, IRR-AC-2)', async () => {
    const fixture = await mount();

    expect(squash(stripEl(fixture).textContent)).toBe('3 results reported · Σ contribution 5 of target 8');
  });

  it('discloses BOTH numbers and the reason in the strip title when Σ ≠ the row ACHIEVED (IRR-R-4.1)', async () => {
    const fixture = await mount();
    const title = stripEl(fixture).getAttribute('title');

    expect(title).toBe('Achieved on the row: 3 — it counts reviewed results only; this list sums 5 across every status.');
  });

  it('drops the disclosure entirely when Σ and the row ACHIEVED agree', async () => {
    const fixture = await mount(FIXTURE, { ...INDICATOR, actual_achieved_value_sum: 5 });

    expect(stripEl(fixture).getAttribute('title')).toBeNull();
  });

  it('splits the count by status on its own line when more than one status is present (IRR-R-11)', async () => {
    const fixture = await mount();
    const split: HTMLElement = fixture.nativeElement.querySelector('[data-testid="irr-status-split"]');

    expect(squash(split.textContent)).toBe('1 quality assessed · 1 editing · 1 submitted');
  });

  // ── IRR-R-6 / IRR-R-6.1 / IRR-AC-5 ────────────────────────────────────────
  it('sorts by a header click and reflects the direction in aria-sort (IRR-R-6)', async () => {
    const fixture = await mount();
    const contributionTh: HTMLElement = Array.from(fixture.nativeElement.querySelectorAll('th')).find(
      (th: any) => squash(th.textContent).startsWith('Contribution')
    ) as HTMLElement;

    expect(contributionTh.getAttribute('aria-sort')).toBeNull();
    contributionTh.click();
    fixture.detectChanges();

    expect(contributionTh.getAttribute('aria-sort')).toBe('ascending');
    expect(cells(fixture).map(row => row[0])).toEqual(['#8702', '#8871', '#9006']);
  });

  it('hides the search box at 8 rows and shows it at 9 (IRR-R-6.1)', async () => {
    const eight = Array.from({ length: 8 }, (_, i) => ({ ...FIXTURE[0], result_id: i, result_code: `700${i}` }));
    let fixture = await mount(eight);
    expect(fixture.nativeElement.querySelector('[data-testid="irr-search"]')).toBeNull();

    TestBed.resetTestingModule();
    fixture = await mount([...eight, FIXTURE[1]]);
    expect(fixture.nativeElement.querySelector('[data-testid="irr-search"]')).not.toBeNull();
  });

  it('filters to the single matching row when "88" is typed (IRR-R-6.1, IRR-AC-5)', async () => {
    const nine = [...Array.from({ length: 8 }, (_, i) => ({ ...FIXTURE[0], result_id: i, result_code: `700${i}` })), FIXTURE[1]];
    const fixture = await mount(nine);
    const search: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="irr-search"]');

    search.value = '88';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(cells(fixture).map(row => row[0])).toEqual(['#8871']);
  });

  it('shows the TABLE empty template for a search that matches nothing — not the "nothing reported" block', async () => {
    const nine = [...Array.from({ length: 8 }, (_, i) => ({ ...FIXTURE[0], result_id: i, result_code: `700${i}` })), FIXTURE[1]];
    const fixture = await mount(nine);
    const search: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="irr-search"]');

    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('No results match your search.');
    expect(text).not.toContain('Nothing reported against this indicator yet.');
    expect(text).not.toContain('Report the first result');
  });

  // ── IRR-R-5 / IRR-AC-4 ────────────────────────────────────────────────────
  it('navigates to Result Detail with the row phase on Enter (IRR-R-5, IRR-AC-4)', async () => {
    const fixture = await mount();
    const row: HTMLElement = fixture.nativeElement.querySelectorAll('tr.irr-data-row')[2]; // #8871

    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/result', 'result-detail', '8871', 'general-information'], { queryParams: { phase: 11 } });
  });

  it('navigates on a plain row click too', async () => {
    const fixture = await mount();
    const row: HTMLElement = fixture.nativeElement.querySelectorAll('tr.irr-data-row')[0];

    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/result', 'result-detail', '9006', 'general-information'], { queryParams: { phase: 11 } });
  });

  it('does NOT navigate when the click lands on the row-menu kebab (IRR-R-5, BUT clause)', async () => {
    const fixture = await mount();
    const kebab: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Open row actions"]');

    kebab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('opens the same destination from the menu\'s "Open result"', async () => {
    const fixture = await mount();
    (fixture.nativeElement.querySelector('button[aria-label="Open row actions"]') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    fixture.detectChanges();

    buttonWithText(fixture, 'Open result').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/result', 'result-detail', '9006', 'general-information'], { queryParams: { phase: 11 } });
    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
  });

  it('copies the ABSOLUTE url of that same destination and toasts on globalUserNotification (IRR-R-5, IRR-AC-4)', async () => {
    const fixture = await mount();
    const copySpy = jest.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
    const toastSpy = jest.spyOn(TestBed.inject(PrToastService), 'add').mockImplementation(() => undefined);

    (fixture.nativeElement.querySelector('button[aria-label="Open row actions"]') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    fixture.detectChanges();
    buttonWithText(fixture, 'Copy link').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(copySpy.mock.calls[0][0]).toBe(`${window.location.origin}/result/result-detail/9006/general-information?phase=11`);
    expect(toastSpy).toHaveBeenCalledWith({ key: 'globalUserNotification', severity: 'success', summary: 'Result link copied' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('opens a new tab instead of navigating on a ctrl/cmd-click (IRR-R-12)', async () => {
    const fixture = await mount();
    const openSpy = jest.spyOn(window, 'open').mockReturnValue(null);
    const row: HTMLElement = fixture.nativeElement.querySelectorAll('tr.irr-data-row')[0];

    row.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    fixture.detectChanges();

    expect(openSpy).toHaveBeenCalledWith(`${window.location.origin}/result/result-detail/9006/general-information?phase=11`, '_blank', 'noopener');
    expect(router.navigate).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('closes the row menu on Escape without closing the drawer (IRR-R-10)', async () => {
    const fixture = await mount();
    const closed = jest.fn();
    fixture.componentInstance.closed.subscribe(closed);
    (fixture.nativeElement.querySelector('button[aria-label="Open row actions"]') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    fixture.detectChanges();

    fixture.componentInstance.onEscape();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="menu"]')).toBeNull();
    expect(closed).not.toHaveBeenCalled();
  });

  // ── IRR-R-7 / IRR-AC-6 ────────────────────────────────────────────────────
  it('shows the empty state for a 404 and its CTA switches to the Report tab (IRR-R-7, IRR-AC-6)', async () => {
    const fixture = await mount(FIXTURE, INDICATOR, { status: 404 });

    expect(fixture.nativeElement.textContent).toContain('Nothing reported against this indicator yet.');
    buttonWithText(fixture, 'Report the first result').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.tab()).toBe('report');
  });

  it('shows the error block for a 500 and Retry re-issues the request (IRR-R-7, IRR-AC-6)', async () => {
    const fixture = await mount(FIXTURE, INDICATOR, { status: 500 });
    const text: string = fixture.nativeElement.textContent;

    expect(text).toContain('Could not load reported results');
    // Never the empty state: a failed request cannot claim the indicator has nothing.
    expect(text).not.toContain('Nothing reported against this indicator yet.');
    expect(getExisting).toHaveBeenCalledTimes(1);

    getExisting.mockReturnValue(of({ response: { contributors: FIXTURE } }));
    buttonWithText(fixture, 'Retry').click();
    fixture.detectChanges();

    expect(getExisting).toHaveBeenCalledTimes(2);
    expect(cells(fixture).map(row => row[0])).toEqual(['#9006', '#8702', '#8871']);
  });

  it('marks the table up as a table: scope="col" headers and focusable rows (IRR-R-10)', async () => {
    const fixture = await mount();

    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    const headers: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('th.irr-th'));
    expect(headers.length).toBe(7);
    expect(headers.every(th => th.getAttribute('scope') === 'col')).toBe(true);
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('tr.irr-data-row'));
    expect(rows.every(tr => tr.getAttribute('tabindex') === '0')).toBe(true);
  });
});


// @akili-spec changes/indicator-reported-results
// ─────────────────────────────────────────────────────────────────────────────
// IRR-T-4 — the width floor, its restore, and the card fallback (IRR-R-8, IRR-R-8.1, IRR-DD-5).
//
// These tests prove the SIGNAL: what `width()` holds, what `widthChange` emits, which branch of the
// template renders. They do NOT prove the layout — jsdom lays nothing out, so an assertion here
// that "760 px is enough room for the table" would be worthless. The real-layout gate for
// `IRR-AC-7` is `indicator-drawer.reported-results.cy.ts`, in Chromium.
// ─────────────────────────────────────────────────────────────────────────────
describe('IndicatorDrawerComponent — width floor, restore and card fallback (IRR-R-8, IRR-R-8.1)', () => {
  const CONTRIBUTORS = [
    { result_id: 9006, result_code: '9006', title: 'QA one', status_name: 'Quality assessed', status_id: 2, contributing_indicator: 3, version_id: 11 },
    { result_id: 8871, result_code: '8871', title: 'Submitted one', status_name: 'Submitted', status_id: 3, contributing_indicator: 1, version_id: 11 }
  ];

  const INDICATOR = { toc_result_id: 'toc-1', related_node_id: 'IND-55', target_value_sum: 8, actual_achieved_value_sum: 3 };

  const setViewport = (w: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  const originalWidth = window.innerWidth;
  afterEach(() => setViewport(originalWidth));

  /**
   * Mounts with the REAL template (the create form stubbed): the card-vs-table assertion is a
   * template-branch assertion and a `template: ''` mount cannot see either branch.
   *
   * `widthChange` is subscribed BEFORE the first `detectChanges()` so a mount-time emission — the
   * floor firing because `initialTab` is already `results` — is captured rather than missed.
   */
  async function mount(initialTab: DrawerTab = 'report', indicator: Record<string, any> = INDICATOR) {
    const getExisting = jest.fn().mockReturnValue(of({ response: { contributors: CONTRIBUTORS } }));

    await TestBed.configureTestingModule({
      imports: [IndicatorDrawerComponent],
      providers: [
        { provide: ApiService, useValue: { resultsSE: { GET_ExistingResultsContributors: getExisting } } },
        { provide: PhasesService, useValue: { phases: { reporting: [{ id: 11, phase_name: 'Reporting 2026' }] } } },
        { provide: Router, useValue: { navigate: jest.fn(), createUrlTree: jest.fn(), serializeUrl: jest.fn(() => '') } }
      ]
    })
      .overrideComponent(IndicatorDrawerComponent, { remove: { imports: [LabReportFormComponent] }, add: { imports: [LabReportFormStub] } })
      .compileComponents();

    const fixture = TestBed.createComponent(IndicatorDrawerComponent);
    const emitted: number[] = [];
    fixture.componentInstance.widthChange.subscribe(w => emitted.push(w));
    fixture.componentRef.setInput('indicator', indicator);
    fixture.componentRef.setInput('initialTab', initialTab);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, emitted };
  }

  /** A real drag: mousedown on the handle, one move, mouseup — the listeners live on `window`. */
  function dragTo(component: IndicatorDrawerComponent, targetWidth: number, viewport: number): void {
    component.startResize(new MouseEvent('mousedown'));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: viewport - targetWidth }));
    window.dispatchEvent(new MouseEvent('mouseup'));
  }

  it('raises a 520 px drawer to the 760 px floor on entering the tab and emits widthChange once (IRR-R-8)', async () => {
    setViewport(1440);
    const { fixture, component, emitted } = await mount('report');
    component.width.set(520);
    fixture.detectChanges();
    emitted.length = 0;

    component.setTab('results');
    fixture.detectChanges();

    expect(component.width()).toBe(760);
    expect(emitted).toEqual([760]);
  });

  it('restores the width the user had when the tab is left (IRR-R-8)', async () => {
    setViewport(1440);
    const { fixture, component, emitted } = await mount('report');
    component.width.set(520);
    fixture.detectChanges();
    emitted.length = 0;

    component.setTab('results');
    fixture.detectChanges();
    component.setTab('info');
    fixture.detectChanges();

    expect(component.width()).toBe(520);
    expect(emitted).toEqual([760, 520]);
  });

  it('leaves a drawer that is ALREADY wide enough exactly where it is, and emits nothing (IRR-R-8)', async () => {
    setViewport(1440);
    const { fixture, component, emitted } = await mount('report');
    component.width.set(900);
    fixture.detectChanges();
    emitted.length = 0;

    component.setTab('results');
    fixture.detectChanges();

    // A FLOOR, not a set: 900 must not shrink to 760, and an unchanged width must not emit.
    expect(component.width()).toBe(900);
    expect(emitted).toEqual([]);

    component.setTab('info');
    fixture.detectChanges();
    expect(component.width()).toBe(900);
    expect(emitted).toEqual([]);
  });

  it('a drag ON the tab outranks the remembered width — leaving does not undo it (IRR-R-8)', async () => {
    setViewport(1440);
    const { fixture, component } = await mount('report');
    component.width.set(520);
    fixture.detectChanges();

    component.setTab('results');
    fixture.detectChanges();
    expect(component.width()).toBe(760);

    dragTo(component, 900, 1440);
    fixture.detectChanges();
    expect(component.width()).toBe(900);

    component.setTab('info');
    fixture.detectChanges();

    expect(component.width()).toBe(900);
  });

  it('never exceeds the viewport clamp: on a 1000 px window the floor is 680, not 760 (IRR-R-8)', async () => {
    setViewport(1000);
    const { fixture, component, emitted } = await mount('report');
    component.width.set(520);
    fixture.detectChanges();
    emitted.length = 0;

    component.setTab('results');
    fixture.detectChanges();

    // min(1100, 1000 - 320, 1000) = 680 — the same clamp the drag obeys.
    expect(component.width()).toBe(680);
    expect(emitted).toEqual([680]);
  });

  it('forgets the remembered width when the drawer is re-armed for another indicator (reset-effect trap)', async () => {
    setViewport(1440);
    const { fixture, component } = await mount('report');
    component.width.set(520);
    fixture.detectChanges();
    component.setTab('results');
    fixture.detectChanges();
    expect(component.width()).toBe(760);

    fixture.componentRef.setInput('indicator', { toc_result_id: 'toc-2', related_node_id: 'IND-56' });
    fixture.detectChanges();
    component.setTab('info');
    fixture.detectChanges();

    // The 520 belonged to the previous indicator; nothing is owed, so nothing is restored.
    expect(component.width()).toBe(760);
  });

  it('switches the template from the table to the card stack under 640 px (IRR-R-8.1)', async () => {
    setViewport(1440);
    const { fixture, component } = await mount('results');

    component.width.set(760);
    fixture.detectChanges();
    expect(component.tableLayout()).toBe(true);
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.irr-card').length).toBe(0);

    // 640 is the boundary and belongs to the TABLE side of it.
    component.width.set(640);
    fixture.detectChanges();
    expect(component.tableLayout()).toBe(true);
    expect(fixture.nativeElement.querySelector('table')).not.toBeNull();

    component.width.set(600);
    fixture.detectChanges();
    expect(component.tableLayout()).toBe(false);
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.irr-card').length).toBe(CONTRIBUTORS.length);
  });

  it('keeps the strip and the row actions in the card layout — only the ROWS change shape (IRR-R-8.1)', async () => {
    setViewport(1440);
    const { fixture, component } = await mount('results');
    component.width.set(600);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="irr-strip"]')).not.toBeNull();
    const kebabs: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.irr-card button[aria-label="Open row actions"]'));
    expect(kebabs.length).toBe(CONTRIBUTORS.length);

    kebabs[0].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.irr-card .pr-row-menu[role="menu"]').length).toBe(1);
  });
});

// @akili-spec changes/report-result-form-ux (RFUX-T-1, RFUX-R-1, RFUX-R-8)
describe('IndicatorDrawerComponent — Verbatim Context Card & Empty State Micro-Card (RFUX-T-1)', () => {
  const VERBATIM_DESC = '.--- IRRI - (GloMIP) ------ Multi-Crop --..-------- KEY ACTIVITIES...';

  async function mountDrawer(indicator: Record<string, any>, initialTab: DrawerTab = 'report', contributors: any[] = []) {
    await TestBed.configureTestingModule({
      imports: [IndicatorDrawerComponent],
      providers: [
        {
          provide: ApiService,
          useValue: { resultsSE: { GET_ExistingResultsContributors: jest.fn().mockReturnValue(of({ response: { contributors } })) } }
        },
        { provide: PhasesService, useValue: { phases: { reporting: [{ id: 11, phase_name: 'Reporting 2026' }] } } },
        { provide: Router, useValue: { navigate: jest.fn(), createUrlTree: jest.fn(), serializeUrl: jest.fn(() => '') } }
      ]
    })
      .overrideComponent(IndicatorDrawerComponent, { remove: { imports: [LabReportFormComponent] }, add: { imports: [LabReportFormStub] } })
      .compileComponents();

    const fixture = TestBed.createComponent(IndicatorDrawerComponent);
    fixture.componentRef.setInput('indicator', indicator);
    fixture.componentRef.setInput('initialTab', initialTab);
    fixture.detectChanges();
    return fixture;
  }

  it('renders indicator description verbatim without stripping punctuation or characters (RFUX-R-1, RFUX-AC-1)', async () => {
    const fixture = await mountDrawer({
      toc_result_id: 'toc-1',
      related_node_id: 'IND-55',
      indicator_description: VERBATIM_DESC,
      target_value_sum: 15,
      center_acronym: 'IRRI',
      unit_messurament: 'varieties',
      type_name: 'Output'
    });

    const descEl: HTMLElement | null = fixture.nativeElement.querySelector('#drawer-context-details h2');
    expect(descEl).toBeTruthy();
    expect(descEl?.textContent?.trim()).toBe(VERBATIM_DESC);

    const contextEl: HTMLElement | null = fixture.nativeElement.querySelector('#drawer-context-details');
    expect(contextEl?.textContent).toContain('2026 Target:');
    expect(contextEl?.textContent).toContain('15');
    expect(contextEl?.textContent).toContain('Center:');
    expect(contextEl?.textContent).toContain('IRRI');
    expect(contextEl?.textContent).toContain('Unit:');
    expect(contextEl?.textContent).toContain('varieties');
    expect(contextEl?.textContent).toContain('Indicator type:');
    expect(contextEl?.textContent).toContain('Output');
  });

  it('renders structured micro-empty-state card when reportedRows and existing results are 0 (RFUX-R-8)', async () => {
    const fixture = await mountDrawer({
      toc_result_id: 'toc-1',
      related_node_id: 'IND-55',
      indicator_description: 'Test Indicator',
      target_value_sum: 10
    }, 'report', []);

    const emptyCard: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="irr-micro-empty-card"]');
    expect(emptyCard).toBeTruthy();
    expect(emptyCard?.textContent).toContain('No results reported against this indicator yet. Your report will be the first recorded toward the 2026 target.');
    expect(emptyCard?.textContent).toContain('flag');
    expect(fixture.nativeElement.textContent).not.toContain('Nothing has been reported against this indicator yet.');
  });
});

// @akili-spec changes/emerging-result-cta-placement (ERC-T-3)
describe('IndicatorDrawerComponent — emerging mode (ERC-T-3)', () => {
  let getExisting: jest.Mock;

  async function mountEmerging() {
    getExisting = jest.fn().mockReturnValue(of({ response: { contributors: [{ result_code: 'R-1' }] } }));
    await TestBed.configureTestingModule({
      imports: [IndicatorDrawerComponent],
      providers: [
        { provide: ApiService, useValue: { resultsSE: { GET_ExistingResultsContributors: getExisting } } },
        { provide: PhasesService, useValue: { phases: { reporting: [{ id: 11, phase_name: 'Reporting 2026' }] } } },
        { provide: Router, useValue: { navigate: jest.fn(), createUrlTree: jest.fn(), serializeUrl: jest.fn(() => '') } }
      ]
    })
      .overrideComponent(IndicatorDrawerComponent, { remove: { imports: [LabReportFormComponent] }, add: { imports: [LabReportFormStub] } })
      .compileComponents();

    const fixture = TestBed.createComponent(IndicatorDrawerComponent);
    fixture.componentRef.setInput('emerging', true);
    fixture.componentRef.setInput('indicator', null);
    fixture.componentRef.setInput('initialTab', 'report');
    fixture.detectChanges();
    return fixture;
  }

  it('does not fetch existing contributors when emerging', async () => {
    await mountEmerging();
    expect(getExisting).not.toHaveBeenCalled();
  });

  it('shows Report emerging result chrome and passes emergingMode to the form', async () => {
    const fixture = await mountEmerging();
    expect(fixture.nativeElement.textContent).toContain('Report emerging result');
    const form = fixture.debugElement.query(de => de.name === 'app-lab-report-form');
    expect(form).toBeTruthy();
    expect(form.componentInstance.emergingMode()).toBe(true);
    expect(form.componentInstance.emergingCategory()).toBeNull();
  });

  it('keeps the report tab when info/results are requested in emerging mode', async () => {
    const fixture = await mountEmerging();
    fixture.componentInstance.setTab('info');
    fixture.detectChanges();
    expect(fixture.componentInstance.tab()).toBe('report');
    expect(getExisting).not.toHaveBeenCalled();
  });
});

