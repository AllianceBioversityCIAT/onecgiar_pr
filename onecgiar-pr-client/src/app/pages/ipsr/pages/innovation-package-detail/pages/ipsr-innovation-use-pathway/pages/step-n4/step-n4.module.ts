import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StepN4RoutingModule } from './step-n4-routing.module';
import { StepN4Component } from './step-n4.component';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import { StepN4PictureLinksComponent } from './components/step-n4-picture-links/step-n4-picture-links.component';
import { StepN4ReferenceMaterialLinksComponent } from './components/step-n4-reference-material-links/step-n4-reference-material-links.component';
import { StepN4InitiativeInvestmentTableComponent } from './components/step-n4-initiative-investment-table/step-n4-initiative-investment-table.component';
import { StepN4BilateralInvestmentTableComponent } from './components/step-n4-bilateral-investment-table/step-n4-bilateral-investment-table.component';
import { StepN4PartnerCoInvestmentTableComponent } from './components/step-n4-partner-co-investment-table/step-n4-partner-co-investment-table.component';

@NgModule({
  declarations: [StepN4Component, StepN4PictureLinksComponent, StepN4ReferenceMaterialLinksComponent, StepN4InitiativeInvestmentTableComponent, StepN4BilateralInvestmentTableComponent, StepN4PartnerCoInvestmentTableComponent],
  imports: [CommonModule, StepN4RoutingModule, CustomFieldsModule]
})
export class StepN4Module {}
