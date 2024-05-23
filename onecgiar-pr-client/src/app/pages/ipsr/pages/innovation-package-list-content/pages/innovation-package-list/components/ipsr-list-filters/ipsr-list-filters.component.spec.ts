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

    const exportTablesServiceSpy = jest.spyOn(TestBed.inject(ExportTablesService), 'exportExcel');
    const apiServiceSpy = jest.spyOn(TestBed.inject(ApiService).resultsSE, 'GET_reportingList').mockReturnValue(of({ response: { response: [] } }));

    component.onDownLoadTableAsExcel(inits, phases, searchText);

    expect(exportTablesServiceSpy).toHaveBeenCalledWith([], 'IPSR_results_list');
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
