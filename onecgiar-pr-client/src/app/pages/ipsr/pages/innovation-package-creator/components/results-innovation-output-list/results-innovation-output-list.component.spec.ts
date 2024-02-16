import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsInnovationOutputListComponent } from './results-innovation-output-list.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterByTextPipe } from '../../../../../../shared/pipes/filter-by-text.pipe';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';

describe('ResultsInnovationOutputListComponent', () => {
  let component: ResultsInnovationOutputListComponent;
  let fixture: ComponentFixture<ResultsInnovationOutputListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        ResultsInnovationOutputListComponent,
        FilterByTextPipe
      ],
      imports: [
        HttpClientTestingModule,
        TableModule,
        FormsModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsInnovationOutputListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit()', () => {
    it('should call cleanSelected and GETallInnovations', () => {
      const cleanSelectedSpy = jest.spyOn(component, 'cleanSelected');
      const getAllInnovationsSpy = jest.spyOn(component.manageInnovationsListSE, 'GETallInnovations');

      component.ngOnInit();

      expect(cleanSelectedSpy).toHaveBeenCalled();
      expect(getAllInnovationsSpy).toHaveBeenCalledWith(component.body.initiative_id);
    });
  });

  describe('ngOnDestroy()', () => {
    it('should call cleanSelected', () => {
      const cleanSelectedSpy = jest.spyOn(component, 'cleanSelected');

      component.ngOnDestroy();

      expect(cleanSelectedSpy).toHaveBeenCalled();
    });
  });

  describe('openInNewPage()', () => {
    it('should open a new page with the provided link', () => {
      const link = 'https://link.com';
      const windowOpenSpy = jest.spyOn(window, 'open');

      component.openInNewPage(link);

      expect(windowOpenSpy).toHaveBeenCalledWith(link, '_blank');
    });
  });

  describe('selectInnovation()', () => {
    it('should set the selected property to true and emit the result', () => {
      const result = {
        result_id: '123',
        result_code: 'ABC',
        title: 'Title',
        description: 'Description',
        initiative_id: 1,
        official_code: '1',
        creation_date: '2022-01-01',
        innovation_type: 'Type',
        selected: false,
      };
      const emitSpy = jest.spyOn(component.selectInnovationEvent, 'emit');
      const cleanSelectedSpy = jest.spyOn(component, 'cleanSelected');

      component.selectInnovation(result);

      expect(result.selected).toBeTruthy();
      expect(emitSpy).toHaveBeenCalledWith(result);
      expect(cleanSelectedSpy).toHaveBeenCalled();
    });
  });

  describe('cleanSelected()', () => {
    it('should set selected property to false for all innovations', () => {
      const mockInnovations = [
        { 
          result_id: '123',
          result_code: 'ABC',
          title: 'Title',
          description: 'Description',
          initiative_id: 1,
          official_code: '1',
          creation_date: '2022-01-01',
          innovation_type: 'Type',
          selected: true,
        },
      ];
      component.manageInnovationsListSE.allInnovationsList = mockInnovations;

      component.cleanSelected();

      expect(mockInnovations[0].selected).toBeFalsy();
    });
  });
});
