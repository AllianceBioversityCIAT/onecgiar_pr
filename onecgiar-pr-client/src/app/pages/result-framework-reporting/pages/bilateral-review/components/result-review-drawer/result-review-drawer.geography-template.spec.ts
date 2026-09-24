import { ChangeDetectionStrategy, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { ResultReviewDrawerComponent } from './result-review-drawer.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { BilateralResultsService } from '../../services/bilateral-results.service';
import { BilateralReviewAccessService } from '../../services/bilateral-review-access.service';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { GeoscopeManagementModule } from '../../../../../../shared/components/geoscope-management/geoscope-management.module';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { RegionsCountriesService } from '../../../../../../shared/services/global/regions-countries.service';
import { ResultLevelService } from '../../../../../../pages/results/pages/result-creator/services/result-level.service';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { signal } from '@angular/core';

describe('ResultReviewDrawerComponent shipped geography template', () => {
  const roles = { readOnly: false, isAdmin: false };
  const api = { rolesSE: { isAdmin: false }, dataControlSE: { myInitiativesList: [], isKnowledgeProduct: false }, resultsSE: { GET_ClarisaProjects: () => of({ response: [] }) } };
  const detail = (geo: any) => ({
    commonFields: { id: 101, result_code: 'RC-1', result_level_id: 1, result_type_id: 6, result_title: 'Result', status_id: 5 },
    geographicScope: { regions: [], countries: [], has_regions: false, has_countries: false, ...geo },
    tocMetadata: null,
    contributingCenters: [], contributingInstitutions: [], contributingProjects: [], contributingInitiatives: [], evidence: [], resultTypeResponse: null
  });

  beforeEach(async () => {
    roles.readOnly = false;
    api.rolesSE.isAdmin = false;
    await TestBed.configureTestingModule({
      imports: [ResultReviewDrawerComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: RolesService, useValue: roles },
        { provide: CentersService, useValue: { centersList: [] } },
        { provide: InstitutionsService, useValue: { institutionsList: [] } },
        { provide: BilateralResultsService, useValue: { entityId: () => null } },
        { provide: BilateralReviewAccessService, useValue: { isProgramMember: () => false } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: DataControlService, useValue: api.dataControlSE },
        { provide: FieldsManagerService, useValue: { fields: signal({}) } },
        { provide: CustomizedAlertsFeService, useValue: {} }
        ,{ provide: RegionsCountriesService, useValue: { regionsList: [], countriesList: [] } }
        ,{ provide: ResultLevelService, useValue: { currentResultLevelName: null } }
        ,{ provide: ResultsApiService, useValue: { GET_subNationalByIsoAlpha2: () => of({ response: [] }) } }
      ]
    }).overrideComponent(ResultReviewDrawerComponent, {
      set: { imports: [CommonModule, FormsModule, CustomFieldsModule, GeoscopeManagementModule], schemas: [NO_ERRORS_SCHEMA], styles: [], changeDetection: ChangeDetectionStrategy.Default }
    }).compileComponents();
  });

  it.each([
    ['absent', { geo_scope_id: 3, has_extra_geo_scope: null, extra_regions: [], extra_countries: [] }, 0, 0],
    ['saved false', { geo_scope_id: 1, has_extra_geo_scope: false, extra_regions: [], extra_countries: [] }, 1, 0],
    ['saved true', { geo_scope_id: 1, has_extra_geo_scope: true, extra_regions: [], extra_countries: [] }, 1, 0],
    ['child only', { geo_scope_id: 1, has_extra_geo_scope: null, extra_regions: [{ id: 1, name: 'Africa' }], extra_countries: [] }, 0, 1]
  ])('renders %s from the production template', async (_name, geo, answerCount, childCount) => {
    const fixture = TestBed.createComponent(ResultReviewDrawerComponent);
    fixture.componentInstance.resultDetail.set(detail(geo) as any);
    fixture.componentInstance.isLoadingInformation.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const radios = [...element.querySelectorAll('app-pr-radio-button')];
    expect(radios.filter(node => node.getAttribute('label') === 'Are there any regions that you wish to specify for this Output?')).toHaveLength(answerCount);
    expect([...element.querySelectorAll('app-pr-multi-select')].filter(node => node.getAttribute('label') === 'Select extra regions')).toHaveLength(childCount);
    const answer = radios.find(node => node.getAttribute('label') === 'Are there any regions that you wish to specify for this Output?');
    expect(answer?.querySelectorAll('.fch_required') ?? []).toHaveLength(0);
    if (answer) {
      const control = fixture.debugElement.query(By.css('app-pr-radio-button[label="Are there any regions that you wish to specify for this Output?"]')).componentInstance;
      expect(control.required).toBe(false);
      if (_name === 'saved false') expect(control.value).toBe(false);
      if (_name === 'saved true') expect(control.value).toBe(true);
    }
    if (_name === 'child only') expect(element.querySelector('app-pr-multi-select[label="Select extra regions"] .pr_chip_selected')?.textContent).toContain('Africa');
  });

  it('shows saved country and sub-national values without an answer', async () => {
    const fixture = TestBed.createComponent(ResultReviewDrawerComponent);
    fixture.componentInstance.resultDetail.set(detail({ geo_scope_id: 1, has_extra_geo_scope: null, extra_regions: [], extra_countries: [{ id: 57, name: 'Colombia', full_name: 'Colombia', sub_national: [{ id: 4, formatedName: 'Cauca' }] }] }) as any);
    fixture.componentInstance.isLoadingInformation.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-pr-radio-button[label="Are there any regions that you wish to specify for this Output?"]')).toBeNull();
    expect(element.querySelector('app-pr-multi-select[label="Select extra countries"] .pr_chip_selected')?.textContent).toContain('Colombia');
    expect(element.querySelector('app-sub-geoscope')?.textContent).toContain('Cauca');
    expect(element.querySelector('app-pr-multi-select[label="Select extra countries"] .fch_required')).toBeNull();
  });

  it.each([false, true])('locks saved extra controls for non-admin=%s and exposes admin falsifier', async isAdmin => {
    api.rolesSE.isAdmin = isAdmin;
    const fixture = TestBed.createComponent(ResultReviewDrawerComponent);
    fixture.componentInstance.resultDetail.set(detail({ geo_scope_id: 1, has_extra_geo_scope: false, extra_regions: [{ id: 1, name: 'Africa' }], extra_countries: [] }) as any);
    fixture.componentInstance.isLoadingInformation.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const answer = element.querySelector('app-pr-radio-button[label="Are there any regions that you wish to specify for this Output?"]');
    const radios = [...(answer?.querySelectorAll('input.pr-native-radio') ?? [])] as HTMLInputElement[];
    expect(radios).toHaveLength(2);
    expect(radios.every(radio => radio.disabled)).toBe(!isAdmin);
    const radioControl = fixture.debugElement.query(By.css('app-pr-radio-button[label="Are there any regions that you wish to specify for this Output?"]')).componentInstance;
    const regionControl = fixture.debugElement.query(By.css('app-pr-multi-select[label="Select extra regions"]')).componentInstance;
    expect(radioControl.disabled).toBe(!isAdmin);
    expect(regionControl.readOnly()).toBe(!isAdmin);
  });
});
