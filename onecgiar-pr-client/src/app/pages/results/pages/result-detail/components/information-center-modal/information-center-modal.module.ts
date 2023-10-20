import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InformationCenterModalComponent } from './information-center-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TocInitiativeOutModule } from '../../pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.module';

@NgModule({
  declarations: [InformationCenterModalComponent],
  exports: [InformationCenterModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule, TocInitiativeOutModule]
})
export class InformationCenterModalModule {}
