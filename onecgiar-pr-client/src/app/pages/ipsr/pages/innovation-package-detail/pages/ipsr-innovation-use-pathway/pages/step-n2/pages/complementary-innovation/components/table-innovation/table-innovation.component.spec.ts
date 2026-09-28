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
        YesOrNotByBooleanPipe
      ],
      imports: [HttpClientTestingModule, FormsModule],
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

  // P2-3846 — search-first list: ranking, type chips and paging are pure component logic.
  describe('P2-3846 — search, type chips and paging', () => {
    const rows = () => [
      { result_id: '1', result_code: '9001', title: 'Drought tolerant maize varieties for East Africa', result_type_id: 7, result_type_name: 'Innovation development (QAed)', status_id: '3', initiative_official_code: 'SP01' },
      { result_id: '2', result_code: '9002', title: 'Training of national extension officers on seed systems', result_type_id: 5, result_type_name: 'Capacity sharing for development', status_id: '2', initiative_official_code: 'SP02' },
      { result_id: '3', result_code: '9003', title: 'Maize seed policy framework revision', result_type_id: 1, result_type_name: 'Policy change', status_id: '2', initiative_official_code: 'SP03' },
      { result_id: '4', result_code: '9004', title: 'East Africa maize drought', result_type_id: 7, result_type_name: 'Innovation development (QAed)', status_id: '2', initiative_official_code: 'SP01' }
    ];

    beforeEach(() => {
      component.dataTable = rows();
    });

    it('lists every row by newest code when there is no search', () => {
      expect(component.filteredRows.map(r => r.result_code)).toEqual(['9004', '9003', '9002', '9001']);
    });

    it('ranks the exact phrase first, then the same words in another order', () => {
      component.searchText = 'maize drought';
      expect(component.filteredRows.map(r => r.result_code)).toEqual(['9004', '9001']);
    });

    it('still finds a result with a typo', () => {
      component.searchText = 'extensoin officers';
      expect(component.filteredRows.map(r => r.result_code)).toEqual(['9002']);
    });

    it('offers one chip per type present, counted against the search, and filters by it', () => {
      component.searchText = 'maize';
      expect(component.typeChips).toEqual([
        { id: 7, label: 'Innovation development', count: 2 },
        { id: 1, label: 'Policy change', count: 1 },
        { id: 5, label: 'Capacity sharing', count: 0 }
      ]);
      component.toggleType(1);
      expect(component.filteredRows.map(r => r.result_code)).toEqual(['9003']);
      component.showAllTypes();
      expect(component.filteredRows).toHaveLength(3);
    });

    it('drops the "(QAed)" suffix from the type and shows the real status instead', () => {
      const submitted = component.dataTable[0];
      expect(component.typeLabel(submitted)).toBe('Innovation development');
      expect(component.statusLabel(submitted)).toBe('Submitted');
    });

    it('pages by ten and resets the page when the search changes', () => {
      component.dataTable = Array.from({ length: 25 }, (_, i) => ({ result_id: String(i), result_code: String(1000 + i), title: `Result ${i}`, result_type_id: 7 }));
      expect(component.visibleRows).toHaveLength(10);
      component.showMore();
      expect(component.visibleRows).toHaveLength(20);
      component.searchText = 'Result';
      component.onSearchChange();
      expect(component.visibleRows).toHaveLength(10);
    });

    it('toggleLink links an unlinked row and unlinks a linked one', () => {
      const selectSpy = jest.spyOn(component.selectEvent, 'emit');
      const cancelSpy = jest.spyOn(component.cancelEvent, 'emit');
      const row: any = component.dataTable[0];
      component.toggleLink(row);
      expect(selectSpy).toHaveBeenCalledWith(row);
      expect(row.selected).toBe(true);
      component.toggleLink(row);
      expect(cancelSpy).toHaveBeenCalledWith(row);
    });

    it('does not match a row by its type name alone (the chips filter by type)', () => {
      component.searchText = 'capacity sharing';
      expect(component.filteredRows).toHaveLength(0);
    });

    it('re-evaluates when the parent swaps the list', () => {
      component.searchText = 'maize';
      expect(component.filteredRows).toHaveLength(3);
      component.dataTable = rows().slice(0, 1);
      expect(component.filteredRows).toHaveLength(1);
    });
  });
});
