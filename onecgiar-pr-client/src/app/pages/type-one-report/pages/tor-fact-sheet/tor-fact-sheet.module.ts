import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorFactSheetRoutingModule } from './tor-fact-sheet-routing.module';
import { TorFactSheetComponent } from './tor-fact-sheet.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { SimpleTableWithClipboardModule } from '../../../../shared/components/simple-table-with-clipboard/simple-table-with-clipboard.module';

@NgModule({
  declarations: [TorFactSheetComponent],
  imports: [CommonModule, TorFactSheetRoutingModule, ClipboardModule, SimpleTableWithClipboardModule]
})
export class TorFactSheetModule {}
