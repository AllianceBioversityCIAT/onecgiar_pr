import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrCheckboxValueAccessorDirective } from './pr-checkbox-value-accessor.directive';

@NgModule({
  declarations: [PrCheckboxValueAccessorDirective],
  exports: [PrCheckboxValueAccessorDirective],
  imports: [CommonModule]
})
export class PrCheckboxValueAccessorModule {}
