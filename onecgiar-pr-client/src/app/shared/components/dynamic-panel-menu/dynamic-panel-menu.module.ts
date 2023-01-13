import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicPanelMenuComponent } from './dynamic-panel-menu.component';

@NgModule({
  declarations: [DynamicPanelMenuComponent],
  exports: [DynamicPanelMenuComponent],
  imports: [CommonModule]
})
export class DynamicPanelMenuModule {}
