import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomSpinnerComponent } from './custom-spinner.component';

@NgModule({
  declarations: [CustomSpinnerComponent],
  exports: [CustomSpinnerComponent],
  imports: [CommonModule]
})
export class CustomSpinnerModule {}
