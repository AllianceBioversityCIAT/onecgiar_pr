import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { StepN1EoiOutcomesComponent } from './step-n1-eoi-outcomes.component';
import { of, throwError } from 'rxjs';
import { PrMultiSelectComponent } from '../../../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { FeedbackValidationDirective } from '../../../../../../../../../../shared/directives/feedback-validation.directive';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('StepN1EoiOutcomesComponent', () => {
  let component: StepN1EoiOutcomesComponent;
  let fixture: ComponentFixture<StepN1EoiOutcomesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1EoiOutcomesComponent, PrMultiSelectComponent, FeedbackValidationDirective, PrFieldHeaderComponent],
      imports: [HttpClientModule, FormsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StepN1EoiOutcomesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize eoiList with response data', () => {
    const mockResponse = {
      response: [
        { id: 1, name: 'EOI 1' },
        { id: 2, name: 'EOI 2' }
      ]
    };
    jest.spyOn(component.tocApiSE, 'GET_tocLevelsByconfig').mockReturnValue(of(mockResponse));

    component.GET_EOIList();

    expect(component.eoiList).toEqual([
      { id: 1, name: 'EOI 1' },
      { id: 2, name: 'EOI 2' }
    ]);
  });

  it('should handle error when getting EOI list', () => {
    const mockError = new Error('Failed to get EOI list');
    jest.spyOn(component.tocApiSE, 'GET_tocLevelsByconfig').mockReturnValue(throwError(() => mockError));
    const consoleSpy = jest.spyOn(console, 'error');
    component.GET_EOIList();

    expect(consoleSpy).toHaveBeenCalledWith(mockError);
  });
});
