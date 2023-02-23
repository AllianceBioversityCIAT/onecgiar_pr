import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleTableWithClipboardComponent } from './simple-table-with-clipboard.component';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TorKrsPrimaryImpactAreaSelectorModule } from './components/tor-krs-primary-impact-area-selector/tor-krs-primary-impact-area-selector.module';

@NgModule({
  declarations: [SimpleTableWithClipboardComponent],
  exports: [SimpleTableWithClipboardComponent],
  imports: [CommonModule, TooltipModule, ToastModule, TorKrsPrimaryImpactAreaSelectorModule]
})
export class SimpleTableWithClipboardModule {}
