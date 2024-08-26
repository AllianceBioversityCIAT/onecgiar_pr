import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormatTimeAgoPipe } from './format-time-ago.pipe';

@NgModule({
  declarations: [FormatTimeAgoPipe],
  exports: [FormatTimeAgoPipe],
  imports: [CommonModule]
})
export class FormatTimeAgoModule {}
