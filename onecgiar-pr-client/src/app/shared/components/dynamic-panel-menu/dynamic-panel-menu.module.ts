import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicPanelMenuComponent } from './dynamic-panel-menu.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [DynamicPanelMenuComponent],
  exports: [DynamicPanelMenuComponent],
  imports: [CommonModule, RouterModule]
})
export class DynamicPanelMenuModule {}
