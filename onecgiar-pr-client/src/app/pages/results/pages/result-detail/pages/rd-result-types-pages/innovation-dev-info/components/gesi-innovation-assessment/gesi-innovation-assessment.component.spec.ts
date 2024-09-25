import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GesiInnovationAssessmentComponent } from './gesi-innovation-assessment.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';

describe('GesiInnovationAssessmentComponent', () => {
  let component: GesiInnovationAssessmentComponent;
  let fixture: ComponentFixture<GesiInnovationAssessmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        GesiInnovationAssessmentComponent,
        PrRadioButtonComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(GesiInnovationAssessmentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
