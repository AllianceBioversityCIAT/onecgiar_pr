import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorKeyResultStoryRoutingModule } from './tor-key-result-story-routing.module';
import { TorKeyResultStoryComponent } from './tor-key-result-story.component';
import { SimpleTableWithClipboardModule } from '../../../../shared/components/simple-table-with-clipboard/simple-table-with-clipboard.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TorKeyResultStoryComponent],
  imports: [CommonModule, TorKeyResultStoryRoutingModule, SimpleTableWithClipboardModule, CustomFieldsModule]
})
export class TorKeyResultStoryModule {}
