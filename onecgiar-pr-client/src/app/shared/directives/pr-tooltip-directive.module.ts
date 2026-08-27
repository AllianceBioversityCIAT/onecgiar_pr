import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrTooltipDirective } from './pr-tooltip.directive';

@NgModule({
  declarations: [PrTooltipDirective],
  exports: [PrTooltipDirective],
  imports: [CommonModule]
})
export class PrTooltipDirectiveModule {}
