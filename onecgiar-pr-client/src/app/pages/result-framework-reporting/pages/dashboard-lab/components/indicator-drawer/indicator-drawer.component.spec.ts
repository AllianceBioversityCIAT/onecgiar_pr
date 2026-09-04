import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LabReportFormComponent } from '../lab-report-form/lab-report-form.component';
import { IndicatorDrawerComponent, initialDrawerWidth, toReportedResultRow } from './indicator-drawer.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';

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
    const text: string = fixture.nativeElement.textContent;

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

  it('sends "See them in detail" on the Report tab to the results tab, not to info (IRR-R-9)', async () => {
    const fixture = await mount('report');
    const link: HTMLButtonElement = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (b: any) => b.textContent?.trim() === 'See them in detail'
    ) as HTMLButtonElement;

    expect(link).toBeTruthy();
    link.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.tab()).toBe('results');
    expect(headerText(fixture)).toBe('Reported results');
  });
});
