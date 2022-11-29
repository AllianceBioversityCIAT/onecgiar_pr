import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TocInitiativeOutComponent } from './toc-initiative-out.component';
import { CustomFieldsModule } from '../../../../../../../../../custom-fields/custom-fields.module';
import { OutcomeLevelFilterPipe } from '../../../outcome-level-filter.pipe';

@NgModule({
  declarations: [TocInitiativeOutComponent, OutcomeLevelFilterPipe],
  exports: [TocInitiativeOutComponent],
  imports: [CommonModule, CustomFieldsModule]
})
export class TocInitiativeOutModule {}
