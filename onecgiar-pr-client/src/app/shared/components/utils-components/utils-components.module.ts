import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrButtonComponent } from './pr-button/pr-button.component';

const componentsList = [PrButtonComponent];

@NgModule({
  declarations: [PrButtonComponent],
  exports: [PrButtonComponent],
  imports: [CommonModule]
})
export class UtilsComponentsModule {}
