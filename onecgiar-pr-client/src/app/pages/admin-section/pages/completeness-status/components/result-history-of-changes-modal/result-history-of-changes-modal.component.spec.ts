import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultHistoryOfChangesModalComponent } from './result-history-of-changes-modal.component';
import { HttpClientModule } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { NoDataTextComponent } from '../../../../../../custom-fields/no-data-text/no-data-text.component';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';

describe('ResultHistoryOfChangesModalComponent', () => {
  let component: ResultHistoryOfChangesModalComponent;
  let fixture: ComponentFixture<ResultHistoryOfChangesModalComponent>;
  let mockExportTablesService: any;

  beforeEach(async () => {
    mockExportTablesService = {
      exportExcel: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [ResultHistoryOfChangesModalComponent, NoDataTextComponent],
      imports: [HttpClientModule, DialogModule, CustomFieldsModule],
      providers: [{ provide: ExportTablesService, useValue: mockExportTablesService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultHistoryOfChangesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a defined columnOrder', () => {
    expect(component.columnOrder).toBeDefined();
    expect(component.columnOrder.length).toBeGreaterThan(0);
  });

  it('should call cleanObject', () => {
    const cleanObjectSpy = jest.spyOn(component, 'cleanObject');
    component.cleanObject();

    expect(cleanObjectSpy).toHaveBeenCalled();
  });

  it('should call exportTablesSE.exportExcel with correct parameters in exportExcel', () => {
    const wscols = [
      { header: 'Comment', key: 'comment', width: 50 },
      { header: 'First name', key: 'user_first_name', width: 18 },
      { header: 'Last name', key: 'user_last_name', width: 18 },
      { header: 'Email', key: 'email', width: 38 },
      { header: 'Initiative role', key: 'initiative_role', width: 22 },
      { header: 'Application role', key: 'app_role', width: 22 },
      { header: 'Date', key: 'created_date', width: 15 },
      { header: 'Status', key: 'is_submit', width: 15 }
    ];

    const exportExcelSpy = jest.spyOn(mockExportTablesService, 'exportExcel');

    component.exportExcel([]);

    expect(exportExcelSpy).toHaveBeenCalledWith([], 'History_of_changes', wscols);
  });

  it('convertToNodata should return value if it is not null or "null"', () => {
    expect(component.convertToNodata('Test')).toBe('Test');
    expect(component.convertToNodata('')).toBe('Not applicable');
  });

  it('convertToNodata should return "Not applicable" if value is null or "null"', () => {
    expect(component.convertToNodata(null)).toBe('Not applicable');
    expect(component.convertToNodata('null')).toBe('Not applicable');
  });

  it('convertToYesOrNot should return "Submit" if value is 1', () => {
    expect(component.convertToYesOrNot(1)).toBe('Submit');
  });

  it('convertToYesOrNot should return "Un-submit" if value is 0', () => {
    expect(component.convertToYesOrNot(0)).toBe('Un-submit');
  });

  it('convertToYesOrNot should return "Not applicable" if value is neither 0 nor 1', () => {
    expect(component.convertToYesOrNot(null)).toBe('Not applicable');
    expect(component.convertToYesOrNot(2)).toBe('Not applicable');
  });
});
