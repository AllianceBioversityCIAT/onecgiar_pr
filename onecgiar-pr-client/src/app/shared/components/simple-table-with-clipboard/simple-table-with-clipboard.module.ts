import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleTableWithClipboardComponent } from './simple-table-with-clipboard.component';
import { PrToastComponent } from 'src/app/shared/components/pr-toast';
import { TorKrsPrimaryImpactAreaSelectorModule } from './components/tor-krs-primary-impact-area-selector/tor-krs-primary-impact-area-selector.module';
import { TorKrsOthersPrimaryImpactAreaModule } from './components/tor-krs-others-primary-impact-area/tor-krs-others-primary-impact-area.module';

@NgModule({
  declarations: [SimpleTableWithClipboardComponent],
  exports: [SimpleTableWithClipboardComponent],
  imports: [CommonModule, PrToastComponent, TorKrsPrimaryImpactAreaSelectorModule, TorKrsOthersPrimaryImpactAreaModule]
})
export class SimpleTableWithClipboardModule {}
