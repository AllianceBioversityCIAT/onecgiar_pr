import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IpsrDetailTopMenuComponent } from './ipsr-detail-top-menu.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [IpsrDetailTopMenuComponent],
  exports: [IpsrDetailTopMenuComponent],
  imports: [CommonModule, RouterModule]
})
export class IpsrDetailTopMenuModule {}
