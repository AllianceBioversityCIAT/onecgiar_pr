import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareRequestModalComponent } from './share-request-modal.component';
import { DialogModule } from 'primeng/dialog';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TocInitiativeOutModule } from '../../pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.module';
import { TocInitiativeAaoModule } from '../../pages/rd-theory-of-change/components/shared/toc-initiative-aao/toc-initiative-aao.module';

@NgModule({
  declarations: [ShareRequestModalComponent],
  exports: [ShareRequestModalComponent],
  imports: [CommonModule, DialogModule, CustomFieldsModule, TocInitiativeOutModule, TocInitiativeAaoModule]
})
export class ShareRequestModalModule {}
