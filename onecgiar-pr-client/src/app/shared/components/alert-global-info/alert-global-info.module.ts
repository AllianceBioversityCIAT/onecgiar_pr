import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertGlobalInfoComponent } from './alert-global-info.component';

@NgModule({
  declarations: [AlertGlobalInfoComponent],
  exports: [AlertGlobalInfoComponent],
  imports: [CommonModule]
})
export class AlertGlobalInfoModule {}
