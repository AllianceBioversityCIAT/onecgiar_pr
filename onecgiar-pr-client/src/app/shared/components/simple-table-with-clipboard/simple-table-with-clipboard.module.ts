import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleTableWithClipboardComponent } from './simple-table-with-clipboard.component';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { TorKrsPrimaryImpactAreaSelectorModule } from './components/tor-krs-primary-impact-area-selector/tor-krs-primary-impact-area-selector.module';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TorKrsOthersPrimaryImpactAreaModule } from './components/tor-krs-others-primary-impact-area/tor-krs-others-primary-impact-area.module';

@NgModule({
  declarations: [SimpleTableWithClipboardComponent],
  exports: [SimpleTableWithClipboardComponent],
  imports: [CommonModule, TooltipModule, ToastModule, TorKrsPrimaryImpactAreaSelectorModule, ProgressBarModule, SkeletonModule, TorKrsOthersPrimaryImpactAreaModule]
})
export class SimpleTableWithClipboardModule {}
