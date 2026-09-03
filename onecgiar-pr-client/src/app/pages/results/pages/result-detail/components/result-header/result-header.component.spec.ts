import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { ResultHeaderComponent } from './result-header.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { PdfExportService } from '../../../../../../shared/services/pdf-export.service';
import { ResultMetadataPanelService } from '../../../../../../shared/components/result-metadata/result-metadata-panel.service';

describe('ResultHeaderComponent', () => {
  let fixture: ComponentFixture<ResultHeaderComponent>;
  let component: ResultHeaderComponent;
  let apiMock: any;
  let dataControlMock: any;
  let rolesMock: any;
  let pdfMock: any;
  let panelMock: any;

  const html = () => fixture.nativeElement as HTMLElement;
  const q = (sel: string) => html().querySelector(sel) as HTMLElement;

  const build = async (url = '/result/result-detail/1234/general-information?phase=7') => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ResultHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiMock },
        { provide: DataControlService, useValue: dataControlMock },
        { provide: RolesService, useValue: rolesMock },
        { provide: PdfExportService, useValue: pdfMock },
        { provide: ResultMetadataPanelService, useValue: panelMock }
      ]
    }).compileComponents();

    jest.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(url);

    fixture = TestBed.createComponent(ResultHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    apiMock = {
      resultsSE: {
        currentResultCode: 8871,
        // RIBL-T-2 forward pointer: T-2 keys the GET by result id, so the default fixture needs
        // one (T-1 only had `currentResultCode`).
        currentResultId: 1234,
        // RIBL-T-1: default is an unmapped result (no owning AOW). Individual "area of work"
        // cases below swap this for a mapping that carries a WP code.
        GET_ContributorsPartners: jest.fn().mockReturnValue(of({ response: {} }))
      }
    };
    dataControlMock = {
      currentResult: {
        title: 'Genetic basis of yield and striga resistance in infested maize hybrids',
        status_id: 1,
        status_name: 'Editing',
        result_level_name: 'Output',
        result_type_name: 'Capacity sharing for development',
        source_name: 'W3/Bilaterals',
        initiative_official_code: 'SP04',
        initiative_name: 'Multifunctional Landscapes',
        phase_name: 'Reporting 2026',
        portfolio: 'P25',
        is_phase_open: 1
      },
      changeResultTypeModal: false
    };
    rolesMock = { readOnly: false };
    pdfMock = {
      enabled: signal(true),
      menuOpen: signal(false),
      toggle: jest.fn(),
      close: jest.fn(),
      view: jest.fn(),
      copy: jest.fn()
    };
    panelMock = { floating: signal(false), open: jest.fn() };
  });

  describe('identity', () => {
    it('shows the result title', async () => {
      await build();

      expect(q('[data-testid="result-header-title"]').textContent.trim()).toContain('Genetic basis of yield');
    });

    it('links back to the results table', async () => {
      await build();

      expect(q('[data-testid="result-detail-back-link"]').getAttribute('href')).toBe('/result/results-outlet/results-list');
    });

    it('shows the code, category, level and funding inline', async () => {
      await build();
      const strip = html().textContent;

      expect(q('[data-testid="result-header-code"]').textContent.trim()).toBe('8871');
      expect(strip).toContain('Capacity sharing for development');
      expect(strip).toContain('Output');
      expect(strip).toContain('W3/Bilaterals');
    });

    it('colours the status chip from the status_id token pair', async () => {
      await build();
      const chip = q('[data-testid="result-header-status"]');

      expect(chip.textContent.trim()).toBe('Editing');
      // The rendered colour is asserted on the getters the style bindings read: jsdom refuses a
      // `var(...)` value on [style.color] / [style.background-color] and writes nothing, so the
      // DOM says nothing useful here. Verified in a real browser instead.
      expect(component.statusFg).toBe('var(--pr-status-in-progress-fg)');
      expect(component.statusBg).toBe('var(--pr-status-in-progress-bg)');
    });

    it('uses the approved pair for a quality assessed result', async () => {
      dataControlMock.currentResult.status_id = 2;
      await build();

      expect(component.statusFg).toBe('var(--pr-status-approved-fg)');
      expect(component.statusBg).toBe('var(--pr-status-approved-bg)');
    });

    it('falls back to the neutral pair on an unknown status', async () => {
      dataControlMock.currentResult.status_id = 99;
      await build();

      expect(component.statusFg).toBe('var(--pr-status-not-started-fg)');
      expect(component.statusBg).toBe('var(--pr-status-not-started-bg)');
    });

    it('omits an inline field the result does not carry', async () => {
      dataControlMock.currentResult.source_name = '';
      await build();

      expect(html().textContent).not.toContain('W3/Bilaterals');
    });
  });

  // RSBL-R-1, RSBL-R-2, RSBL-R-6 / RSBL-AC-1, RSBL-AC-2, RSBL-AC-6. Fixture already carries
  // initiative_official_code: 'SP04' and initiative_name: 'Multifunctional Landscapes' (do not
  // swap in SP09 — that value is the legacy screenshot copy example only, not the live fixture).
  describe('submitter (Science Program)', () => {
    it('shows the Science Program as Submitter, code and name, without opening the ⓘ popover', async () => {
      await build();

      expect(q('[data-testid="result-header-submitter"]').textContent.trim()).toBe('SP04 - Multifunctional Landscapes');
      expect(q('[data-testid="result-header-meta-popover"]')).toBeNull();
    });

    it('links the Submitter value to the program home in the same tab', async () => {
      await build();
      const link = q('[data-testid="result-header-submitter"]');

      expect(link.getAttribute('routerLink') ?? link.getAttribute('href')).toBe('/result-framework-reporting/entity-details/SP04');
      expect(link.getAttribute('target')).toBeNull();
    });

    it('gives the Submitter link an accessible name that includes "Submitter" and the official code', async () => {
      await build();
      const ariaLabel = q('[data-testid="result-header-submitter"]').getAttribute('aria-label');

      expect(ariaLabel).toContain('Submitter');
      expect(ariaLabel).toContain('SP04');
    });

    it('renders no Submitter node when the official code is missing', async () => {
      delete dataControlMock.currentResult.initiative_official_code;
      await build();

      expect(q('[data-testid="result-header-submitter"]')).toBeNull();
      expect(html().innerHTML).not.toContain('entity-details/undefined');
    });

    it('renders no Submitter node when the official code is an empty string', async () => {
      dataControlMock.currentResult.initiative_official_code = '';
      await build();

      expect(q('[data-testid="result-header-submitter"]')).toBeNull();
    });

    it('renders no Submitter node when the official code is whitespace-only', async () => {
      dataControlMock.currentResult.initiative_official_code = '   ';
      await build();

      expect(q('[data-testid="result-header-submitter"]')).toBeNull();
    });

    it('shows the code alone, without a fabricated name, when the result has no initiative name', async () => {
      dataControlMock.currentResult.initiative_name = '';
      await build();

      expect(q('[data-testid="result-header-submitter"]').textContent.trim()).toBe('SP04');
    });

    it('keeps the stored code spelling in both the value and the link path (SGP-02 stays SGP-02)', async () => {
      dataControlMock.currentResult.initiative_official_code = 'SGP-02';
      dataControlMock.currentResult.initiative_name = '';
      await build();
      const link = q('[data-testid="result-header-submitter"]');

      expect(link.textContent.trim()).toBe('SGP-02');
      expect(link.getAttribute('href')).toBe('/result-framework-reporting/entity-details/SGP-02');
    });
  });

  // RIBL-R-1, RIBL-R-2, RIBL-R-6 / RIBL-AC-1, RIBL-AC-2, RIBL-AC-6. Official code fixture stays
  // 'SP04' (same as Submitter above); the owning AOW comes from a mocked GET_ContributorsPartners
  // planned submitter mapping whose first result_toc_results row carries WP code 'AOW01'
  // (design.md §5: read `result_toc_result.result_toc_results[]`, `planned_result`,
  // `work_package_code` first; ignore `contributors_result_toc_result`). These cases are RED on
  // current HEAD — `result-header.component.html` has no Area of Work node yet.
  describe('area of work', () => {
    // `rows` accepts either a single row object (existing 19 single-row cases keep working
    // unchanged) or an array of rows (RIBL-R-1 multi-HLO cases below). `contributorsRows`, when
    // given, adds a sibling `contributors_result_toc_result` (Center-contributor mappings) that
    // production MUST ignore — mirrors the server shape at
    // `results-framework-reporting/contributors-partners/contributors-partners.service.ts`
    // (`contributors_result_toc_result` is a sibling of `result_toc_result`, not nested under it).
    const plannedAowMapping = (rows: any = { work_package_code: 'AOW01' }, plannedResult = true, contributorsRows?: any[]) => ({
      response: {
        result_toc_result: {
          planned_result: plannedResult,
          result_toc_results: Array.isArray(rows) ? rows : [rows]
        },
        ...(contributorsRows ? { contributors_result_toc_result: contributorsRows } : {})
      }
    });

    const mockAowMapping = (rows?: any, plannedResult?: boolean, contributorsRows?: any[]) => {
      apiMock.resultsSE.GET_ContributorsPartners = jest.fn().mockReturnValue(of(plannedAowMapping(rows, plannedResult, contributorsRows)));
    };

    it('shows the owning Area of Work code from the planned submitter mapping', async () => {
      mockAowMapping();
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeTruthy();
      expect(q('[data-testid="result-header-aow"]').textContent.trim()).toBe('AOW01');
    });

    it('links the Area of Work value to By AOW for that official code, in the same tab', async () => {
      mockAowMapping();
      await build();
      const link = q('[data-testid="result-header-aow"]');
      const href = link.getAttribute('routerLink') ?? link.getAttribute('href');

      expect(href).toContain('/result-framework-reporting/entity-details/SP04');
      expect(href).toContain('tocView=byAow');
      expect(href).toContain('tocAow=AOW01');
      expect(link.getAttribute('target')).toBeNull();
      // RIBL-R-2 BUT: no guessed search / type / status / center filters.
      expect(href).not.toContain('q=');
      expect(href).not.toContain('typ=');
      expect(href).not.toContain('st=');
    });

    it('gives the Area of Work link an accessible name that includes "Area of Work" and the AOW code', async () => {
      mockAowMapping();
      await build();
      const ariaLabel = q('[data-testid="result-header-aow"]').getAttribute('aria-label');

      expect(ariaLabel).toContain('Area of Work');
      expect(ariaLabel).toContain('AOW01');
    });

    // RIBL-R-1 multi-HLO / tasks.md §3 clause coverage — several planned rows exist; the FIRST
    // one must win. Swapping `.find` for `.at(-1)` (or any "last row wins" reading) turns this red.
    it('uses the first planned row when several result_toc_results rows exist (multi-HLO)', async () => {
      mockAowMapping([{ work_package_code: 'AOW01' }, { work_package_code: 'AOW09' }]);
      await build();
      const link = q('[data-testid="result-header-aow"]');
      const href = link.getAttribute('routerLink') ?? link.getAttribute('href');

      expect(link.textContent.trim()).toBe('AOW01');
      expect(href).toContain('tocAow=AOW01');
      expect(href).not.toContain('AOW09');
    });

    // RIBL-R-1 / design.md §5 — "Ignore `contributors_result_toc_result`." A `contributors_result_toc_result`
    // fallback would leave this red because it carries a different (Center-contributor) code.
    it('ignores contributors_result_toc_result and uses the submitter mapping only', async () => {
      mockAowMapping({ work_package_code: 'AOW01' }, true, [{ result_toc_results: [{ work_package_code: 'AOW07' }] }]);
      await build();
      const link = q('[data-testid="result-header-aow"]');
      const href = link.getAttribute('routerLink') ?? link.getAttribute('href');

      expect(link.textContent.trim()).toBe('AOW01');
      expect(href).toContain('tocAow=AOW01');
      expect(href).not.toContain('AOW07');
    });

    // design.md §5 display-rules table: "WP code present, short name present → {code} - {name}".
    // The name must render in the visible text but MUST NOT leak into the `tocAow` query value.
    it('shows {code} - {name} when the mapping carries a short name, without leaking the name into tocAow', async () => {
      mockAowMapping({ work_package_code: 'AOW01', work_package_name: 'Multifunctional Landscapes' });
      await build();
      const link = q('[data-testid="result-header-aow"]');
      const href = link.getAttribute('routerLink') ?? link.getAttribute('href');

      expect(link.textContent.trim()).toBe('AOW01 - Multifunctional Landscapes');
      expect(href).toContain('tocAow=AOW01');
      expect(href).not.toContain('tocAow=AOW01 - Multifunctional Landscapes');
    });

    // RIBL-R-3 / AC-3 — official code missing / empty / whitespace hides the AOW node even when a
    // valid mapping is mocked, and never leaves `entity-details/undefined` in the DOM.
    it('renders no Area of Work node when the official code is missing', async () => {
      mockAowMapping();
      delete dataControlMock.currentResult.initiative_official_code;
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
      expect(html().innerHTML).not.toContain('entity-details/undefined');
    });

    it('renders no Area of Work node when the official code is an empty string', async () => {
      mockAowMapping();
      dataControlMock.currentResult.initiative_official_code = '';
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    it('renders no Area of Work node when the official code is whitespace-only', async () => {
      mockAowMapping();
      dataControlMock.currentResult.initiative_official_code = '   ';
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    // RIBL-R-3 / AC-3 — owning AOW missing / empty / whitespace / unmapped / program-level bucket.
    it('renders no Area of Work node when the mapping has no result_toc_result at all', async () => {
      apiMock.resultsSE.GET_ContributorsPartners = jest.fn().mockReturnValue(of({ response: {} }));
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    it('renders no Area of Work node when the WP field is missing on every row', async () => {
      mockAowMapping({});
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    it('renders no Area of Work node when the WP code is an empty string', async () => {
      mockAowMapping({ work_package_code: '' });
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    it('renders no Area of Work node when the WP code is whitespace-only', async () => {
      mockAowMapping({ work_package_code: '   ' });
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    it('renders no Area of Work node when the mapping is unplanned (planned_result === false)', async () => {
      mockAowMapping({ work_package_code: 'AOW01' }, false);
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    it('renders no Area of Work node when the WP code is the Intermediate Outcomes sentinel', async () => {
      mockAowMapping({ work_package_code: 'intermediate-outcomes' });
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    it('renders no Area of Work node when the WP code is the 2030 Outcomes sentinel', async () => {
      mockAowMapping({ work_package_code: '2030-outcomes' });
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
    });

    it('renders no Area of Work node and no tocAow=undefined when the GET errors', async () => {
      apiMock.resultsSE.GET_ContributorsPartners = jest.fn().mockReturnValue(throwError(() => new Error('network')));
      await build();

      expect(q('[data-testid="result-header-aow"]')).toBeNull();
      expect(html().innerHTML).not.toContain('tocAow=undefined');
    });

    // RIBL-R-4 / AC-4 — adding Area of Work must not change Submitter's target or Back to results.
    it('keeps Submitter targeting program home without tocAow when Area of Work is also shown', async () => {
      mockAowMapping();
      await build();
      const submitterLink = q('[data-testid="result-header-submitter"]');
      const href = submitterLink.getAttribute('routerLink') ?? submitterLink.getAttribute('href');

      expect(href).toBe('/result-framework-reporting/entity-details/SP04');
      expect(href).not.toContain('tocAow');
    });

    it('keeps Back to results targeting the results list when Area of Work is also shown', async () => {
      mockAowMapping();
      await build();

      expect(q('[data-testid="result-detail-back-link"]').getAttribute('href')).toBe('/result/results-outlet/results-list');
    });

    // RIBL-R-10 / AC-8 — `kpi` only when exactly one contributing indicator id is known.
    it('includes kpi=42 in the href when exactly one contributing indicator id is known', async () => {
      mockAowMapping({ work_package_code: 'AOW01', indicators: [{ toc_results_indicator_id: 42 }] });
      await build();
      const href = q('[data-testid="result-header-aow"]').getAttribute('routerLink') ?? q('[data-testid="result-header-aow"]').getAttribute('href');

      expect(href).toContain('kpi=42');
      expect(href).toContain('tocAow=AOW01');
    });

    it('omits kpi from the href when zero contributing indicator ids are known', async () => {
      mockAowMapping({ work_package_code: 'AOW01', indicators: [] });
      await build();
      const href = q('[data-testid="result-header-aow"]').getAttribute('routerLink') ?? q('[data-testid="result-header-aow"]').getAttribute('href');

      expect(href).not.toContain('kpi=');
    });

    it('omits kpi from the href when two or more contributing indicator ids are known', async () => {
      mockAowMapping({
        work_package_code: 'AOW01',
        indicators: [{ toc_results_indicator_id: 42 }, { toc_results_indicator_id: 43 }]
      });
      await build();
      const href = q('[data-testid="result-header-aow"]').getAttribute('routerLink') ?? q('[data-testid="result-header-aow"]').getAttribute('href');

      expect(href).not.toContain('kpi=');
    });
  });

  describe('metadata popover', () => {
    it('is closed until the info button is clicked', async () => {
      await build();
      expect(q('[data-testid="result-header-meta-popover"]')).toBeNull();

      q('[data-testid="result-header-meta-toggle"]').click();
      fixture.detectChanges();

      expect(q('[data-testid="result-header-meta-popover"]')).toBeTruthy();
    });

    it('lists the five fields the design puts in this popover', async () => {
      await build();

      // Ya no repite Status / Level / Category / Funding: los cuatro están en la tira de
      // identidad, a un centímetro de este botón.
      expect(component.metaRows.map(r => r.label)).toEqual(['Center', 'Phase', 'Portfolio', 'Origin', 'Created by']);
      expect(component.metaRows.find(r => r.label === 'Phase').value).toBe('Reporting 2026 - P25');
      expect(component.metaRows.find(r => r.label === 'Portfolio').value).toBe('P25');
    });

    it('marks as Coming soon the rows the payload cannot fill yet', async () => {
      await build();

      // Center, Origin y Created by no llegan en `GET /api/results/get/:id` — Created by sólo
      // llega como id numérico. Se muestran marcadas en vez de ocultarse.
      expect(component.metaRows.filter(r => r.pending).map(r => r.label)).toEqual(['Center', 'Origin', 'Created by']);

      q('[data-testid="result-header-meta-toggle"]').click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('[data-testid="result-header-meta-pending"]').length).toBe(3);
    });

    it('pops the metadata out into the floating card', async () => {
      await build();
      q('[data-testid="result-header-meta-toggle"]').click();
      fixture.detectChanges();

      q('[data-testid="result-header-metadata-popout"]').click();
      fixture.detectChanges();

      expect(panelMock.open).toHaveBeenCalled();
      expect(component.metaOpen()).toBe(false);
    });

    it('hides the pop-out control once the card is already floating', async () => {
      panelMock.floating = signal(true);
      await build();
      q('[data-testid="result-header-meta-toggle"]').click();
      fixture.detectChanges();

      expect(q('[data-testid="result-header-metadata-popout"]')).toBeNull();
    });
  });

  describe('actions', () => {
    it('offers Change result type on the General information section', async () => {
      await build();
      q('[data-testid="result-header-actions"]').click();
      fixture.detectChanges();

      expect(q('[data-testid="result-header-change-type"]')).toBeTruthy();
    });

    // The modal it opens is rendered by the General information section and needs that section's
    // form body, so offering it elsewhere would set an inert flag.
    it('hides Change result type on any other section', async () => {
      await build('/result/result-detail/1234/evidences');
      q('[data-testid="result-header-actions"]').click();
      fixture.detectChanges();

      expect(q('[data-testid="result-header-change-type"]')).toBeNull();
    });

    it('hides Change result type for a read-only user', async () => {
      rolesMock.readOnly = true;
      await build();
      q('[data-testid="result-header-actions"]').click();
      fixture.detectChanges();

      expect(q('[data-testid="result-header-change-type"]')).toBeNull();
    });

    it('hides Change result type when the phase is closed', async () => {
      dataControlMock.currentResult.is_phase_open = 0;
      await build();
      q('[data-testid="result-header-actions"]').click();
      fixture.detectChanges();

      expect(q('[data-testid="result-header-change-type"]')).toBeNull();
    });

    it('raises the change-result-type flag and closes the menu', async () => {
      await build();
      q('[data-testid="result-header-actions"]').click();
      fixture.detectChanges();
      q('[data-testid="result-header-change-type"]').click();

      expect(dataControlMock.changeResultTypeModal).toBe(true);
      expect(component.actionsOpen()).toBe(false);
    });

    it('copies the result link from the menu', async () => {
      await build();
      q('[data-testid="result-header-actions"]').click();
      fixture.detectChanges();
      q('[data-testid="result-header-copy-link"]').click();

      expect(pdfMock.copy).toHaveBeenCalled();
    });
  });

  describe('PDF', () => {
    it('is not rendered while export is disabled', async () => {
      pdfMock.enabled = signal(false);
      await build();

      expect(q('[data-testid="result-header-pdf"]')).toBeNull();
    });

    it('opens its menu with View PDF and Copy link', async () => {
      pdfMock.menuOpen = signal(true);
      await build();

      expect(html().textContent).toContain('View PDF');
      expect(html().textContent).toContain('Copy link');
    });
  });

  describe('closing popovers', () => {
    it('closes the metadata popover on an outside click', async () => {
      await build();
      component.metaOpen.set(true);
      fixture.detectChanges();

      document.body.click();
      expect(component.metaOpen()).toBe(false);
    });

    it('keeps it open when the click lands inside', async () => {
      await build();
      component.metaOpen.set(true);
      fixture.detectChanges();

      q('[data-testid="result-header-meta-popover"]').click();
      expect(component.metaOpen()).toBe(true);
    });

    it('closes the actions menu on an outside click', async () => {
      await build();
      component.actionsOpen.set(true);
      fixture.detectChanges();

      document.body.click();
      expect(component.actionsOpen()).toBe(false);
    });

    it('closes the PDF menu on an outside click', async () => {
      pdfMock.menuOpen = signal(true);
      await build();

      document.body.click();
      expect(pdfMock.close).toHaveBeenCalled();
    });
  });
});
