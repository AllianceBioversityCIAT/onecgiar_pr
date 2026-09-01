import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import {
  BilateralResultsListComponent,
  BilateralCenterResult,
  BILATERAL_COLUMNS,
} from './bilateral-results-list.component';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';

describe('BilateralResultsListComponent', () => {
  let component: BilateralResultsListComponent;
  let fixture: ComponentFixture<BilateralResultsListComponent>;
  let bilateralApiService: any;
  let phasesService: any;
  let rolesService: any;

  const result = (overrides: Partial<BilateralCenterResult> = {}): BilateralCenterResult => ({
    id: 1,
    result_code: '8706',
    title: 'Kenya County Climate Risk Profiles',
    result_type: 'Other output',
    status_id: 1,
    status_name: 'Editing',
    created_date: '2026-07-30T00:00:00.000Z',
    version_id: 36,
    source: 'API',
    is_leading_result: 1,
    description: 'Profiles co-developed with the county governments of Kenya.',
    project_name: 'Accelerating Impacts of CGIAR Climate Research for Africa',
    ...overrides,
  });

  beforeEach(async () => {
    localStorage.clear();

    bilateralApiService = {
      GET_bilateralCenterResults: jest.fn().mockReturnValue(of({ response: [result()] })),
    };
    phasesService = {
      phases: { reporting: [{ id: 36, phase_year: 2026, status: true, obj_portfolio: { acronym: 'P25' } }] },
      getPhasesObservable: jest.fn().mockReturnValue(of([])),
    };
    rolesService = {
      isAdmin: true,
      getMyCenters: jest.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralResultsListComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BilateralApiService, useValue: bilateralApiService },
        { provide: PhasesService, useValue: phasesService },
        { provide: RolesService, useValue: rolesService },
        ResultsApiService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralResultsListComponent);
    component = fixture.componentInstance;

    const ctx = TestBed.inject(BilateralContextService);
    ctx.setCenter('Bioversity (Alliance)', 'Alliance of Bioversity and CIAT', 'CIAT-BIOVERSITY');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads results for the active phase once the center resolves', () => {
    expect(bilateralApiService.GET_bilateralCenterResults).toHaveBeenCalledWith('CIAT-BIOVERSITY', 36);
    expect(component.results().length).toBe(1);
    expect(component.visibleColumns().find(c => c.attr === 'result_type')).toEqual(
      expect.objectContaining({ title: 'Result type' }),
    );
  });

  describe('column visibility', () => {
    it('starts with every column visible', () => {
      expect(component.visibleColumns().map(c => c.key)).toEqual(BILATERAL_COLUMNS.map(c => c.key));
    });

    it('hides a column when toggled off and persists the choice', () => {
      component.toggleColumn('type');
      expect(component.isColumnVisible('type')).toBe(false);
      expect(component.visibleColumns().find(c => c.key === 'type')).toBeUndefined();

      const stored = JSON.parse(localStorage.getItem('pr.bilateralResults.visibleColumns.v3') ?? '{}');
      expect(stored.type).toBe(false);
    });

    it('refuses to hide the last remaining visible column', () => {
      for (const col of BILATERAL_COLUMNS.slice(1)) {
        component.toggleColumn(col.key);
      }
      expect(component.visibleColumns().length).toBe(1);

      component.toggleColumn(BILATERAL_COLUMNS[0].key);
      expect(component.visibleColumns().length).toBe(1);
    });
  });

  /**
   * P2-3152 AC6 — the centre dashboard must list Project name and Description next to
   * Title and Status. Both were absent from BILATERAL_COLUMNS and from the payload, so
   * the row rendered without them. Asserting on the rendered cells (not on the column
   * catalog alone) is deliberate: with zoneless change detection a catalog-only check
   * would pass even if the template never grew a branch for the new attributes.
   */
  describe('P2-3152 AC6 — Project name and Description columns', () => {
    const cellText = (attr: string): string | null => {
      const cell = fixture.nativeElement.querySelector(`td.rc-td--${attr}`);
      return cell ? cell.textContent.trim() : null;
    };

    it('offers both columns, visible by default', () => {
      const keys = component.visibleColumns().map(c => c.key);
      expect(keys).toContain('project');
      expect(keys).toContain('description');
      expect(BILATERAL_COLUMNS.find(c => c.key === 'project')).toEqual(
        expect.objectContaining({ title: 'Project name', attr: 'project_name', defaultOn: true }),
      );
      expect(BILATERAL_COLUMNS.find(c => c.key === 'description')).toEqual(
        expect.objectContaining({ title: 'Description', attr: 'description', defaultOn: true }),
      );
    });

    it('renders the project name and the description in the row', () => {
      expect(cellText('project_name')).toBe('Accelerating Impacts of CGIAR Climate Research for Africa');
      expect(cellText('description')).toBe('Profiles co-developed with the county governments of Kenya.');
    });

    it('falls back to a dash when the result has no project or description', () => {
      component.results.set([result({ project_name: null, description: null })]);
      fixture.detectChanges();

      expect(cellText('project_name')).toBe('-');
      expect(cellText('description')).toBe('-');
    });

    // `cellText` is what the CSV export writes for each visible column; without a case for the
    // new attributes it silently returned '' and the export shipped two empty columns.
    it('carries both fields into the CSV export', () => {
      const row = result();
      const text = (attr: string) => (component as any).cellText(row, attr);

      expect(text('project_name')).toBe('Accelerating Impacts of CGIAR Climate Research for Africa');
      expect(text('description')).toBe('Profiles co-developed with the county governments of Kenya.');
      expect((component as any).cellText(result({ project_name: null, description: null }), 'project_name')).toBe('');
    });
  });

  describe('statusClass', () => {
    it('maps a status id to the Results Center status_tag classes', () => {
      expect(component.statusClass(6)).toBe('status_tag status_6');
    });
  });

  describe('exportCsv', () => {
    let createObjectURL: jest.Mock;
    let revokeObjectURL: jest.Mock;

    beforeEach(() => {
      createObjectURL = jest.fn().mockReturnValue('blob:mock');
      revokeObjectURL = jest.fn();
      (URL as any).createObjectURL = createObjectURL;
      (URL as any).revokeObjectURL = revokeObjectURL;
    });

    it('builds and downloads a CSV without throwing', () => {
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      expect(() => component.exportCsv()).not.toThrow();

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

      clickSpy.mockRestore();
    });
  });

  describe('filteredResults', () => {
    it('filters by source and role chips', () => {
      component.results.set([
        result({ id: 1, source: 'API', is_leading_result: 1 }),
        result({ id: 2, source: 'Result', is_leading_result: 0 }),
      ]);

      expect(component.filteredResults().map(r => r.id)).toEqual([1]);

      component.toggleContributing();
      expect(component.filteredResults().map(r => r.id).sort()).toEqual([1]);

      component.toggleW1W2();
      expect(component.filteredResults().map(r => r.id).sort()).toEqual([1, 2]);
    });
  });
});
