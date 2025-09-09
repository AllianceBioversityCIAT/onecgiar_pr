import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN4Component } from './step-n4.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';
import { StepN4InitiativeInvestmentTableComponent } from './components/step-n4-initiative-investment-table/step-n4-initiative-investment-table.component';
import { StepN4BilateralInvestmentTableComponent } from './components/step-n4-bilateral-investment-table/step-n4-bilateral-investment-table.component';
import { StepN4PartnerCoInvestmentTableComponent } from './components/step-n4-partner-co-investment-table/step-n4-partner-co-investment-table.component';
import { PrRadioButtonComponent } from '../../../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { SaveButtonComponent } from '../../../../../../../../custom-fields/save-button/save-button.component';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { StepN4AddBilateralComponent } from './components/step-n4-bilateral-investment-table/modal/step-n4-add-bilateral/step-n4-add-bilateral.component';
import { StepN4AddPartnerComponent } from './components/step-n4-partner-co-investment-table/modal/step-n4-add-partner/step-n4-add-partner.component';
import { NoDataTextComponent } from '../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { DialogModule } from 'primeng/dialog';
import { PrSelectComponent } from '../../../../../../../../custom-fields/pr-select/pr-select.component';
import { LabelNamePipe } from '../../../../../../../../custom-fields/pr-select/label-name.pipe';
import { TermPipe } from '../../../../../../../../internationalization/term.pipe';

describe('StepN4Component', () => {
  let component: StepN4Component;
  let fixture: ComponentFixture<StepN4Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, TooltipModule, DialogModule, TermPipe],
      declarations: [
        StepN4Component,
        PrButtonComponent,
        StepN4InitiativeInvestmentTableComponent,
        LabelNamePipe,
        StepN4BilateralInvestmentTableComponent,
        StepN4PartnerCoInvestmentTableComponent,
        PrRadioButtonComponent,
        SaveButtonComponent,
        PrFieldHeaderComponent,
        StepN4AddBilateralComponent,
        StepN4AddPartnerComponent,
        NoDataTextComponent,
        PrSelectComponent
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN4Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
