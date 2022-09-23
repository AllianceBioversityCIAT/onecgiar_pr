import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultDetailRoutingModule } from './result-detail-routing.module';
import { ResultDetailComponent } from './result-detail.component';
import { PanelMenuComponent } from './panel-menu/panel-menu.component';
import { UtilsComponentsModule } from '../../../../shared/components/utils-components/utils-components.module';

@NgModule({
  declarations: [ResultDetailComponent, PanelMenuComponent],
  imports: [CommonModule, ResultDetailRoutingModule, UtilsComponentsModule]
})
export class ResultDetailModule {}
