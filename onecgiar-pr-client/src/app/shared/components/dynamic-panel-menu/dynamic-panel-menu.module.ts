import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicPanelMenuComponent } from './dynamic-panel-menu.component';
import { RouterModule } from '@angular/router';
import { PrTooltipDirectiveModule } from '../../directives/pr-tooltip-directive.module';

@NgModule({
  declarations: [DynamicPanelMenuComponent],
  exports: [DynamicPanelMenuComponent],
  imports: [CommonModule, RouterModule, PrTooltipDirectiveModule]
})
export class DynamicPanelMenuModule {}
