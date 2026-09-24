import { ChangeDetectionStrategy, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SectionGeographyComponent } from './section-geography.component';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { RegionsCountriesService } from '../../../../shared/services/global/regions-countries.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralExpandableStateService } from '../../services/bilateral-expandable-state.service';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { GeoscopeManagementModule } from '../../../../shared/components/geoscope-management/geoscope-management.module';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../shared/services/fields-manager.service';
import { CustomizedAlertsFeService } from '../../../../shared/services/customized-alerts-fe.service';

describe('SectionGeographyComponent shipped template', () => {
  const currentResultId = signal<number | null>(77);
  const response = (extra: Record<string, unknown>) => ({
    geo_scope_id: 3, has_countries: true, countries: [{ id: 9 }], has_regions: false, regions: [],
    has_extra_geo_scope: null, extra_geo_scope_id: null, extra_regions: [], extra_countries: [], ...extra
  });
  let geographicResponse: ReturnType<typeof response>;

  beforeEach(async () => {
    currentResultId.set(77);
    geographicResponse = response({});
    await TestBed.configureTestingModule({
      imports: [SectionGeographyComponent],
      providers: [
        { provide: BilateralApiService, useValue: { GET_geographic: () => of({ response: geographicResponse }) } },
        { provide: RegionsCountriesService, useValue: { regionsList: [], countriesList: [] } },
        { provide: BilateralCreationService, useValue: { currentResultId, isLoadingResult: signal(false), resultTypeId: signal(7), isEditableByCenterUser: () => false } },
        { provide: BilateralAutoSaveService, useValue: { fieldStatus: signal({}), schedulePayload: jest.fn() } },
        { provide: BilateralMdsTrackerService, useValue: { setSectionFields: jest.fn() } },
        { provide: BilateralExpandableStateService, useValue: { getShowAllFields: () => false, setShowAllFields: jest.fn() } }
        ,{ provide: RolesService, useValue: { readOnly: true } }
        ,{ provide: DataControlService, useValue: { isKnowledgeProduct: false } }
        ,{ provide: FieldsManagerService, useValue: { fields: signal({}) } }
        ,{ provide: CustomizedAlertsFeService, useValue: {} }
      ]
    }).overrideComponent(SectionGeographyComponent, {
      set: { imports: [CommonModule, FormsModule, CustomFieldsModule, GeoscopeManagementModule], schemas: [NO_ERRORS_SCHEMA], styles: [], changeDetection: ChangeDetectionStrategy.Default }
    }).compileComponents();
  });

  it.each([
    ['absent', {}, 0, 0],
    ['saved false', { has_extra_geo_scope: false }, 1, 0],
    ['saved true', { has_extra_geo_scope: true }, 1, 0],
    ['child only', { extra_regions: [{ id: 1, name: 'Africa' }] }, 0, 1]
  ])('renders %s extra metadata from the production template', async (_name, extra, answerCount, regionCount) => {
    geographicResponse = response(extra);
    const fixture = TestBed.createComponent(SectionGeographyComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const disclosure = element.querySelector('button[aria-controls="geography-full-metadata"]') as HTMLButtonElement | null;
    expect(disclosure === null).toBe(answerCount === 0 && regionCount === 0);
    if (disclosure) {
      expect(disclosure.getAttribute('aria-expanded')).toBe('false');
      disclosure.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    }
    expect(element.querySelectorAll('#geography-full-metadata app-pr-yes-or-not')).toHaveLength(answerCount);
    expect([...element.querySelectorAll('#geography-full-metadata app-pr-multi-select')].filter(node => node.getAttribute('label') === 'Select extra regions')).toHaveLength(regionCount);
    expect(element.querySelectorAll('#geography-full-metadata .fch_required')).toHaveLength(0);
    if (_name === 'saved false') expect(element.querySelector('#geography-full-metadata app-pr-yes-or-not .choice')?.textContent?.trim()).toBe('No');
    if (_name === 'saved true') expect(element.querySelector('#geography-full-metadata app-pr-yes-or-not .choice')?.textContent?.trim()).toBe('Yes');
    if (_name === 'child only') expect(element.querySelector('#geography-full-metadata .pr_chip_selected')?.textContent).toContain('Africa');
  });

  it('renders saved country and sub-national values without an answer', () => {
    geographicResponse = response({ extra_geo_scope_id: 5, extra_countries: [{ id: 57, name: 'Colombia', full_name: 'Colombia', sub_national: [{ id: 3, formatedName: 'Cauca' }] }] });
    const fixture = TestBed.createComponent(SectionGeographyComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    (element.querySelector('button[aria-controls="geography-full-metadata"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('#geography-full-metadata app-pr-yes-or-not')).toBeNull();
    expect(element.querySelector('#geography-full-metadata app-pr-multi-select[label="Select extra countries"]')).not.toBeNull();
    expect(element.querySelector('#geography-full-metadata app-sub-geoscope')?.textContent).toContain('Colombia');
    expect(element.querySelector('#geography-full-metadata app-sub-geoscope')?.textContent).toContain('Cauca');
    expect(element.querySelectorAll('#geography-full-metadata .fch_required')).toHaveLength(0);
  });
});
