import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4AddPartnerComponent } from './step-n4-add-partner.component';
import { HttpClientModule } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { PrButtonComponent } from '../../../../../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrSelectComponent } from '../../../../../../../../../../../../custom-fields/pr-select/pr-select.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { LabelNamePipe } from '../../../../../../../../../../../../custom-fields/pr-select/label-name.pipe';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';

describe('StepN4AddPartnerComponent', () => {
  let component: StepN4AddPartnerComponent;
  let fixture: ComponentFixture<StepN4AddPartnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN4AddPartnerComponent, PrButtonComponent, PrSelectComponent, PrFieldHeaderComponent, LabelNamePipe],
      imports: [HttpClientModule, DialogModule, FormsModule, TooltipModule]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4AddPartnerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
