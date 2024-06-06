import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';

import { IpsrListFiltersComponent } from './ipsr-list-filters.component';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';
import { IpsrListFilterService } from '../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../services/ipsr-list.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { of, throwError } from 'rxjs';
import { InnovationPackageListFilterPipe } from '../innovation-package-custom-table/pipes/innovation-package-list-filter.pipe';

describe('IpsrListFiltersComponent', () => {
  let component: IpsrListFiltersComponent;
  let fixture: ComponentFixture<IpsrListFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrListFiltersComponent, PrButtonComponent, InnovationPackageListFilterPipe],
      imports: [HttpClientTestingModule, FormsModule, TooltipModule],
      providers: [IpsrListFilterService, IpsrListService, ExportTablesService, ApiService]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrListFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return selected inits when onFilterSelectedInits is called', () => {
    const selectedInits = [
      { selected: true, cleanAll: false },
      { selected: false, cleanAll: false },
      { selected: false, cleanAll: false }
    ];
    component.ipsrListFilterSE.filters.general[0].options = selectedInits;

    const result = component.onFilterSelectedInits();

    //corregir
    expect(result.length).toEqual(1);
  });

  it('should return an empty array if all options are not selected or there is an option with cleanAll in true', () => {
    const selectedInits = [
      { selected: false, cleanAll: true },
      { selected: false, cleanAll: false },
      { selected: false, cleanAll: false }
    ];
    component.ipsrListFilterSE.filters.general[0].options = selectedInits;

    const result = component.onFilterSelectedInits();

    expect(result).toEqual([]);
  });

  it('should return selected phases when onFilterSelectedPhases is called', () => {
    const selectedPhases = [{ selected: true }, { selected: true }, { selected: false }];
    component.ipsrListFilterSE.filters.general[1].options = selectedPhases;

    const result = component.onFilterSelectedPhases();
    //corregir
    expect(result.length).toEqual(2);
  });

  it('should call exportExcel method and set isLoadingReport to false when onDownLoadTableAsExcel is called', () => {
    const inits = [{ selected: true }, { selected: false }];
    const phases = [{ selected: true }, { selected: false }];
    const searchText = 'example';

    const wscols = [
      { header: 'Result code', key: 'result_code', width: 13 },
      { header: 'Reporting phase', key: 'phase_name', width: 17.5 },
      { header: 'Reporting year', key: 'reporting_year', width: 16.5 },
      { header: 'Result title', key: 'result_title', width: 115.83 },
      { header: 'Result type', key: 'result_type', width: 21 },
      { header: 'Core innovation', key: 'core_innovation', width: 65.83 },
      { header: 'Link - core innovation', key: 'link_core_innovation', width: 75.33 },
      { header: 'Geofocus', key: 'geo_focus', width: 48.33 },
      { header: 'Submitter', key: 'submitted_by', width: 15.83 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Gender tag level', key: 'gender_tag_level', width: 17.17 },
      { header: 'Climate change tag level', key: 'climate_change_tag_level', width: 25.17 },
      { header: 'Nutrition tag level', key: 'nutrition_tag_level', width: 19.17 },
      { header: 'Environment AND/or biodiversity tag Level', key: 'environmental_biodiversity_tag_level', width: 44.83 },
      { header: 'Poverty tag level', key: 'poverty_tag_level', width: 17.5 },
      { header: 'Creation date', key: 'creation_date', width: 14.33 },
      { header: 'Lead initiative', key: 'lead_initiative', width: 92.17 },
      { header: 'Contributing initiative(s)', key: 'contributing_initiatives', width: 32.5 },
      { header: 'Scaling ambition', key: 'scaling_ambition', width: 65.67 },
      { header: 'Sustainable Development Goals (SDGs) targetted', key: 'sdg_targets', width: 50.67 },
      { header: 'Scaling Readiness score', key: 'scalability_potential_score_min', width: 23.83 },
      { header: 'Scalability potential score', key: 'scalability_potential_score_avg', width: 26.33 },
      { header: 'Link to IPSR metadata PDF report', key: 'link_to_pdf', width: 59 }
    ];

    const exportTablesServiceSpy = jest.spyOn(TestBed.inject(ExportTablesService), 'exportExcelIpsr');
    const apiServiceSpy = jest.spyOn(TestBed.inject(ApiService).resultsSE, 'GET_reportingList').mockReturnValue(of({ response: { response: [] } }));

    component.onDownLoadTableAsExcel(inits, phases, searchText);

    expect(exportTablesServiceSpy).toHaveBeenCalledWith([], 'IPSR_results_list', wscols, undefined, true);
    expect(component.isLoadingReport).toBeFalsy();
    expect(apiServiceSpy).toHaveBeenCalledWith('2022-12-01', inits, phases, searchText);
  });

  it('should log error and set isLoadingReport to false when onDownLoadTableAsExcel encounters an error', () => {
    const inits = [{ selected: true }, { selected: false }];
    const phases = [{ selected: true }, { selected: false }];
    const searchText = 'example';

    const consoleErrorSpy = jest.spyOn(console, 'error');
    const apiServiceSpy = jest.spyOn(TestBed.inject(ApiService).resultsSE, 'GET_reportingList').mockReturnValue(
      throwError(() => {
        console.error('error');
      })
    );

    component.onDownLoadTableAsExcel(inits, phases, searchText);

    expect(consoleErrorSpy).toHaveBeenCalledWith('error');
    expect(component.isLoadingReport).toBeFalsy();
    expect(apiServiceSpy).toHaveBeenCalledWith('2022-12-01', inits, phases, searchText);
  });
});
