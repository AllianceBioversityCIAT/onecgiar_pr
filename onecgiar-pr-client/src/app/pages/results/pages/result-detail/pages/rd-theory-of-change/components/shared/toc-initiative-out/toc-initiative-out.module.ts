import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TocInitiativeOutComponent } from './toc-initiative-out.component';
import { CustomFieldsModule } from '../../../../../../../../../custom-fields/custom-fields.module';
import { OutcomeLevelFilterPipe } from '../../../outcome-level-filter.pipe';
import { TargetIndicatorComponent } from './target-indicator/target-indicator.component';
import { ImpactAreaTargetsComponent } from './impact-area-targets/impact-area-targets.component';
import { SdgTargetsComponent } from './sdg-targets/sdg-targets.component';

@NgModule({
  declarations: [TocInitiativeOutComponent, OutcomeLevelFilterPipe, TargetIndicatorComponent, ImpactAreaTargetsComponent, SdgTargetsComponent],
  exports: [TocInitiativeOutComponent, ImpactAreaTargetsComponent, SdgTargetsComponent],
  imports: [CommonModule, CustomFieldsModule]
})
export class TocInitiativeOutModule {}
