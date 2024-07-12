import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MappedResultsModalComponent } from './mapped-results-modal.component';
import { MappedResultsModalServiceService } from './mapped-results-modal-service.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';

jest.useFakeTimers();

describe('MappedResultsModalComponent', () => {
  let component: MappedResultsModalComponent;
  let fixture: ComponentFixture<MappedResultsModalComponent>;
  let mappedResultService: MappedResultsModalServiceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MappedResultsModalComponent],
      providers: [MappedResultsModalServiceService]
    }).compileComponents();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MappedResultsModalComponent],
      imports: [HttpClientTestingModule, TableModule, DialogModule],
      providers: [{ provide: 'Window', useValue: window }]
    }).compileComponents();

    fixture = TestBed.createComponent(MappedResultsModalComponent);
    component = fixture.componentInstance;
    TestBed.inject(MappedResultsModalServiceService);
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should open the result detail page in a new tab', () => {
    const windowOpenSpy = jest.spyOn(window, 'open');
    component.openInNewPage('123', '18');
    expect(windowOpenSpy).toHaveBeenCalledWith('/result/result-detail/123/general-information?phase=18', '_blank');
  });

  it('should return the correct dynamic modal title when isTarget is true', () => {
    component.mappedResultService.isTarget = true;
    const modalTitle = component.dynamicModalTitle();
    expect(modalTitle).toBe('Target contributions');
  });

  it('should return the correct dynamic modal title when isTarget is false', () => {
    component.mappedResultService.isTarget = false;
    component.activeTab.planned_result = true;
    component.resultLevelId = 1;
    const modalTitle = component.dynamicModalTitle();
    expect(modalTitle).toBe('Results mapped to the same TOC Output');
  });

  it('should return the correct dynamic modal title when isTarget is false', () => {
    component.mappedResultService.isTarget = false;
    component.activeTab.planned_result = false;
    component.resultLevelId = 1;
    const modalTitle = component.dynamicModalTitle();
    expect(modalTitle).toBe('Results mapped to the same TOC Outcome');
  });

  it('should set combine to true if columnAttr is "result_code"', () => {
    component.validateOrder('result_code');

    jest.runAllTimers();

    expect(component.combine).toBe(true);
  });

  it('should set combine to true if no column is sorted in ascending or descending order', () => {
    document.body.innerHTML = `
      <table id="mappedResultTable">
        <thead>
          <tr>
            <th></th>
            <th></th>
          </tr>
        </thead>
      </table>
    `;
    component.validateOrder('some_column');
    expect(component.combine).toBe(true);
  });

  it('should close the modal and reset the service properties', () => {
    component.onCloseModal();
    expect(component.mappedResultService.mappedResultsModal).toBe(false);
    expect(component.mappedResultService.isTarget).toBe(false);
    expect(component.mappedResultService.targetData).toEqual({
      statement: '',
      measure: '',
      overall: '',
      date: '',
      contributors: []
    });
  });

  it('should calculate the overall progress correctly', () => {
    component.mappedResultService.targetData = {
      statement: '',
      measure: '',
      date: '',
      contributors: [{ contributing_indicator: '10' }, { contributing_indicator: '20' }, { contributing_indicator: '30' }],
      overall: '100'
    };
    const overallProgress = component.calcOverallProgress();
    expect(overallProgress).toBe('60 out of 100');
  });
});
