import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScaleImpactAnalysisComponent } from './scale-impact-analysis.component';
import { PrRadioButtonComponent } from '../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';

describe('ScaleImpactAnalysisComponent', () => {
  let component: ScaleImpactAnalysisComponent;
  let fixture: ComponentFixture<ScaleImpactAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ScaleImpactAnalysisComponent,
        PrRadioButtonComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScaleImpactAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should have default values on initialization', () => {
    expect(component.body).toEqual(new InnovationDevInfoBody());
    expect(component.options).toBeUndefined();
    expect(component.example2).toBeNull();
  });
});
