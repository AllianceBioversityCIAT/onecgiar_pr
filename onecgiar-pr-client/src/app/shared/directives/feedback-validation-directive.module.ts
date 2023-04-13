import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackValidationDirective } from './feedback-validation.directive';

@NgModule({
  declarations: [FeedbackValidationDirective],
  exports: [FeedbackValidationDirective],
  imports: [CommonModule]
})
export class FeedbackValidationDirectiveModule {}
