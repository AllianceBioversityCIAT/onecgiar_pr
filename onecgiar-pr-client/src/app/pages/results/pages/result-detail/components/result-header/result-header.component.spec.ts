import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
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
    apiMock = { resultsSE: { currentResultCode: 8871 } };
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
