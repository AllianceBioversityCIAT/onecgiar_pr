import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableInnovationComponent } from './table-innovation.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrInputComponent } from '../../../../../../../../../../../../custom-fields/pr-input/pr-input.component';
import { PrTextareaComponent } from '../../../../../../../../../../../../custom-fields/pr-textarea/pr-textarea.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrFieldValidationsComponent } from '../../../../../../../../../../../../custom-fields/pr-field-validations/pr-field-validations.component';
import { YesOrNotByBooleanPipe } from '../../../../../../../../../../../../custom-fields/pipes/yes-or-not-by-boolean.pipe';
import { PrTableComponent, PrSortIconComponent, PrSortableColumnDirective, PrTableHeaderDirective, PrTableBodyDirective } from 'src/app/shared/components/pr-table';
import { NgIcon } from '@ng-icons/core';
import { FilterByTextPipe } from '../../../../../../../../../../../../shared/pipes/filter-by-text.pipe';
import { CustomizedAlertsFeService } from '../../../../../../../../../../../../shared/services/customized-alerts-fe.service';

describe('TableInnovationComponent', () => {
  let component: TableInnovationComponent;
  let fixture: ComponentFixture<TableInnovationComponent>;
  let mockCustomizedAlertsFeService: any;

  beforeEach(async () => {
    mockCustomizedAlertsFeService = {
      show: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [
        TableInnovationComponent,
        PrFieldHeaderComponent,
        PrInputComponent,
        PrTextareaComponent,
        PrRadioButtonComponent,
        PrButtonComponent,
        PrFieldValidationsComponent,
        YesOrNotByBooleanPipe,
        FilterByTextPipe
      ],
      imports: [HttpClientTestingModule, FormsModule, PrTableComponent, PrSortIconComponent, PrSortableColumnDirective, PrTableHeaderDirective, PrTableBodyDirective, NgIcon],
      providers: [{ provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeService }]
    }).compileComponents();

    fixture = TestBed.createComponent(TableInnovationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit selectEvent when selectInnovation is called', () => {
    const result = { selected: false };
    const selectInnovationSpy = jest.spyOn(component.selectEvent, 'emit');
    component.selectInnovation(result as any);
    expect(selectInnovationSpy).toHaveBeenCalledWith(result);
    expect(result.selected).toBe(true);
  });

  it('should emit cancelEvent when cancelInnovationEvent is called', () => {
    const result = { id: 1 };
    const cancelEventSpy = jest.spyOn(component.cancelEvent, 'emit');
    component.cancelInnovationEvent(result);
    expect(cancelEventSpy).toHaveBeenCalledWith(result);
  });

  it('should open new window with correct URL when openNewWindow is called', () => {
    const result = {
      result_code: 'TEST123',
      version_id: 1
    };
    const windowSpy = jest.spyOn(window, 'open').mockImplementation();
    component.openNewWindow(result);
    expect(windowSpy).toHaveBeenCalledWith(`/result/result-detail/${result.result_code}/general-information?phase=${result.version_id}`, '_blank');
  });

  it('should show confirmation dialog and delete innovation when onDelete is called', () => {
    const id = 1;
    const callback = jest.fn();

    component.onDelete(id, callback);

    expect(mockCustomizedAlertsFeService.show).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'confirm-delete-result',
        title: 'Are you sure you want to remove this complementary innovation?',
        status: 'success',
        confirmText: 'Yes, delete'
      }),
      expect.any(Function)
    );
  });

  it('should open new window with correct URL when openNewWindow is called', () => {
    const result = {
      result_code: 'TEST123',
      version_id: 1
    };
    const windowSpy = jest.spyOn(window, 'open').mockImplementation();

    component.openNewWindow(result);

    const expectedUrl = `/result/result-detail/${result.result_code}/general-information?phase=${result.version_id}`;
    expect(windowSpy).toHaveBeenCalledWith(expectedUrl, '_blank');
  });

  describe('PF2 lead label (M6)', () => {
    const renderRows = (rows: any[]) => {
      fixture.componentRef.setInput('dataTable', rows);
      fixture.detectChanges();
      return Array.from(fixture.nativeElement.querySelectorAll('td.initiative_official_code .cell_chip')) as HTMLElement[];
    };

    it('renders `CODE - Name` with a title; a local row shows only its code', () => {
      const chips = renderRows([
        { result_id: 1, result_code: '1', title: 'A', initiative_official_code: 'SP05', initiative_name: 'Better Diets', created_date: '2026-01-01' },
        { result_id: 2, result_code: '2', title: 'B', initiative_official_code: 'INIT-012', created_date: '2026-01-01' }
      ]);
      const texts = chips.map(c => c.textContent.trim());
      expect(texts.sort()).toEqual(['INIT-012', 'SP05 - Better Diets']);
      const named = chips.find(c => c.textContent.trim() === 'SP05 - Better Diets');
      expect(named.getAttribute('title')).toBe('SP05 - Better Diets');
    });

    it('search by the P/A name keeps the named row and drops the one without it (real input)', () => {
      renderRows([
        { result_id: 1, result_code: '1', title: 'A', initiative_official_code: 'SP05', initiative_name: 'Better Diets', full_name: '1 A SP05 SP05 - Better Diets', created_date: '2026-01-01' },
        { result_id: 2, result_code: '2', title: 'B', initiative_official_code: 'SP01', full_name: '2 B SP01 SP01', created_date: '2026-01-01' }
      ]);
      const input = fixture.nativeElement.querySelector('[data-testid="candidate-search"] input') as HTMLInputElement;
      input.value = 'Diets';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      const chips = Array.from(fixture.nativeElement.querySelectorAll('td.initiative_official_code .cell_chip')) as HTMLElement[];
      expect(chips.map(c => c.textContent.trim())).toEqual(['SP05 - Better Diets']);
    });
  });
});
