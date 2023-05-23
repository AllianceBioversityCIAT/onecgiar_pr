import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageAlertComponent } from './page-alert.component';

@NgModule({
  declarations: [PageAlertComponent],
  exports: [PageAlertComponent],
  imports: [CommonModule]
})
export class PageAlertModule {}
