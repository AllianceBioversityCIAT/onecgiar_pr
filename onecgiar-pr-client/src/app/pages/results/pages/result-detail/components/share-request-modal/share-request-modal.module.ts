import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShareRequestModalComponent } from './share-request-modal.component';
import { DialogModule } from 'primeng/dialog';
import { TocInitiativeOutModule } from '../../pages/rd-theory-of-change/components/shared/toc-initiative-out/toc-initiative-out.module';

@NgModule({
  declarations: [ShareRequestModalComponent],
  exports: [ShareRequestModalComponent],
  imports: [CommonModule, DialogModule, TocInitiativeOutModule]
})
export class ShareRequestModalModule {}
