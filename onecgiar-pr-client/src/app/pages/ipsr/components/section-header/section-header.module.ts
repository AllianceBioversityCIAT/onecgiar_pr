import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionHeaderComponent } from './section-header.component';

@NgModule({
  declarations: [SectionHeaderComponent],
  exports: [SectionHeaderComponent],
  imports: [CommonModule]
})
export class SectionHeaderModule {}
