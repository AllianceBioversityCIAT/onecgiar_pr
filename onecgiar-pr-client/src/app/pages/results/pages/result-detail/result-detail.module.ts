import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultDetailRoutingModule } from './result-detail-routing.module';
import { ResultDetailComponent } from './result-detail.component';
import { PanelMenuComponent } from './panel-menu/panel-menu.component';
import { PanelMenuPipe } from './panel-menu/pipes/panel-menu.pipe';
import { PartnersRequestModule } from './components/partners-request/partners-request.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [ResultDetailComponent, PanelMenuComponent, PanelMenuPipe],
  imports: [CommonModule, ResultDetailRoutingModule, PartnersRequestModule, CustomFieldsModule]
})
export class ResultDetailModule {}
