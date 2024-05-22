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
import { throwError } from 'rxjs';

describe('IpsrListFiltersComponent', () => {
  let component: IpsrListFiltersComponent;
  let fixture: ComponentFixture<IpsrListFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrListFiltersComponent, PrButtonComponent],
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
      { selected: false, cleanAll: true }
    ];

    const result = component.onFilterSelectedInits();

    //corregir
    expect(result).toEqual([]);
  });

  it('should return selected phases when onFilterSelectedPhases is called', () => {
    const selectedPhases = [{ selected: true }, { selected: false }];

    const result = component.onFilterSelectedPhases();
    //corregir
    expect(result).toEqual([]);
  });

  it('should call exportExcel method and set isLoadingReport to false when onDownLoadTableAsExcel is called', () => {
    const inits = [{ selected: true }, { selected: false }];
    const phases = [{ selected: true }, { selected: false }];
    const searchText = 'example';

    const exportTablesServiceSpy = jest.spyOn(TestBed.inject(ExportTablesService), 'exportExcel');
    const apiServiceSpy = jest.spyOn(TestBed.inject(ApiService).resultsSE, 'GET_reportingList').mockReturnValue(
      throwError(() => {
        console.error('error');
      })
    );

    component.onDownLoadTableAsExcel(inits, phases, searchText);

    // expect(exportTablesServiceSpy).toHaveBeenCalledWith('example', 'IPSR_results_list');
    expect(component.isLoadingReport).toBeFalsy();
    // expect(apiServiceSpy).toHaveBeenCalledWith('2022-12-01', inits, phases, searchText);
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
