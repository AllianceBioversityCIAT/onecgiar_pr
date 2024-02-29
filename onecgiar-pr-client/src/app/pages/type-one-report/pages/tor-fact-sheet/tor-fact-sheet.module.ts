import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorFactSheetRoutingModule } from './tor-fact-sheet-routing.module';
import { TorFactSheetComponent } from './tor-fact-sheet.component';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { SimpleTableWithClipboardModule } from '../../../../shared/components/simple-table-with-clipboard/simple-table-with-clipboard.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TorFactSheetComponent],
  imports: [CommonModule, TorFactSheetRoutingModule, ClipboardModule, SimpleTableWithClipboardModule, CustomFieldsModule]
})
export class TorFactSheetModule {}
