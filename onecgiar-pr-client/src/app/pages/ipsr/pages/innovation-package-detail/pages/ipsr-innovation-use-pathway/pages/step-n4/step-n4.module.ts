import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN4RoutingModule } from './step-n4-routing.module';
import { StepN4Component } from './step-n4.component';
import { StepN4InitiativeInvestmentTableComponent } from './components/step-n4-initiative-investment-table/step-n4-initiative-investment-table.component';
import { StepN4BilateralInvestmentTableComponent } from './components/step-n4-bilateral-investment-table/step-n4-bilateral-investment-table.component';
import { StepN4PartnerCoInvestmentTableComponent } from './components/step-n4-partner-co-investment-table/step-n4-partner-co-investment-table.component';
import { StepN4AddBilateralComponent } from './components/step-n4-bilateral-investment-table/modal/step-n4-add-bilateral/step-n4-add-bilateral.component';
import { StepN4AddPartnerComponent } from './components/step-n4-partner-co-investment-table/modal/step-n4-add-partner/step-n4-add-partner.component';
import { DialogModule } from 'primeng/dialog';
import { StepN4EditBilateralComponent } from './components/step-n4-bilateral-investment-table/modal/step-n4-edit-bilateral/step-n4-edit-bilateral.component';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { StepN4ReferenceMaterialLinksComponent } from './components/step-n4-reference-material-links/step-n4-reference-material-links.component';
import { TermPipe } from '../../../../../../../../internationalization/term.pipe';
import { StepN4AddProjectComponent } from './components/step-n4-bilateral-investment-table/modal/step-n4-add-project/step-n4-add-project.component';

@NgModule({
  declarations: [
    StepN4Component,
    StepN4InitiativeInvestmentTableComponent,
    StepN4BilateralInvestmentTableComponent,
    StepN4PartnerCoInvestmentTableComponent,
    StepN4AddBilateralComponent,
    StepN4AddProjectComponent,
    StepN4ReferenceMaterialLinksComponent,
    StepN4AddPartnerComponent,
    StepN4EditBilateralComponent
  ],
  imports: [CommonModule, StepN4RoutingModule, CustomFieldsModule, DialogModule, CustomFieldsModule, TermPipe]
})
export class StepN4Module {}
