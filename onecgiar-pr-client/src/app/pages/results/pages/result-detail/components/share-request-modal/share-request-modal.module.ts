import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareRequestModalComponent } from './share-request-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TocInitiativeOutModule } from '../../pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.module';
import { SelectModule } from 'primeng/select';

@NgModule({
  declarations: [ShareRequestModalComponent],
  exports: [ShareRequestModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule, TocInitiativeOutModule, SelectModule]
})
export class ShareRequestModalModule {}
