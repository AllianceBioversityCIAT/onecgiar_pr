import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TocInitiativeAaoComponent } from './toc-initiative-aao.component';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CustomFieldsModule } from '../../../../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TocInitiativeAaoComponent],
  exports: [TocInitiativeAaoComponent],
  imports: [CommonModule, CustomFieldsModule, RadioButtonModule]
})
export class TocInitiativeAaoModule {}
