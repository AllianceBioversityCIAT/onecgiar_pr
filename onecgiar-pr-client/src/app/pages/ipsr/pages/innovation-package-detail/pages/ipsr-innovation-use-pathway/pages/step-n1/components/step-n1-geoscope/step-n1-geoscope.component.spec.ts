import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { StepN1GeoscopeComponent } from './step-n1-geoscope.component';
import { PrRadioButtonComponent } from '../../../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('StepN1GeoscopeComponent', () => {
  let component: StepN1GeoscopeComponent;
  let fixture: ComponentFixture<StepN1GeoscopeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN1GeoscopeComponent, PrRadioButtonComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule, RadioButtonModule, FormsModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StepN1GeoscopeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default geoscope options', () => {
    expect(component.geoscopeOptions).toEqual([
      { full_name: 'Global', id: 1 },
      { full_name: 'Regional', id: 2 },
      { full_name: 'Country', id: 4 },
      { full_name: 'Sub-national', id: 5 }
    ]);
  });

  it('should have a selectRegionsDescription', () => {
    expect(component.selectRegionsDescription).toBe('The list of regions below follows the UN <a class="open_route" href="https://unstats.un.org/unsd/methodology/m49/" target=\'_blank\'>(M.49)</a> standard');
  });
});
