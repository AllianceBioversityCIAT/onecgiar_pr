import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrInputComponent } from './pr-input/pr-input.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@NgModule({
  declarations: [PrInputComponent],
  exports: [PrInputComponent],
  imports: [CommonModule, FormsModule, InputTextModule]
})
export class CustomFieldsModule {}
