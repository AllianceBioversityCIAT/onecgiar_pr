import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepN1ConsensusAndConsultationComponent } from './step-n1-consensus-and-consultation.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { PrRadioButtonComponent } from '../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('StepN1ConsensusAndConsultationComponent', () => {
  let component: StepN1ConsensusAndConsultationComponent;
  let fixture: ComponentFixture<StepN1ConsensusAndConsultationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1ConsensusAndConsultationComponent, PrRadioButtonComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN1ConsensusAndConsultationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize fields with radio options', () => {
    const mockResponse = ['Option 1', 'Option 2', 'Option 3'];

    const apiService = TestBed.inject(ApiService);
    jest.spyOn(apiService.resultsSE, 'getAllInnoPaConsensusInitiativeWorkPackage').mockReturnValue(of({ response: mockResponse }));
    jest.spyOn(apiService.resultsSE, 'getAllInnoPaRelevantCountry').mockReturnValue(of({ response: mockResponse }));
    jest.spyOn(apiService.resultsSE, 'getAllInnoPaRegionalLeadership').mockReturnValue(of({ response: mockResponse }));
    jest.spyOn(apiService.resultsSE, 'getAllInnoPaRegionalIntegrated').mockReturnValue(of({ response: mockResponse }));
    jest.spyOn(apiService.resultsSE, 'getAllInnoPaActiveBackstopping').mockReturnValue(of({ response: mockResponse }));

    component.getInformation();

    expect(component.fields[0].radioOptions).toEqual(mockResponse);
    expect(component.fields[1].radioOptions).toEqual(mockResponse);
    expect(component.fields[2].radioOptions).toEqual(mockResponse);
    expect(component.fields[3].radioOptions).toEqual(mockResponse);
    expect(component.fields[4].radioOptions).toEqual(mockResponse);
  });
});
