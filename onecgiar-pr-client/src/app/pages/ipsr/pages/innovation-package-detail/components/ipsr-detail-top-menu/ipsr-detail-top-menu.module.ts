import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IpsrDetailTopMenuComponent } from './ipsr-detail-top-menu.component';
import { RouterModule } from '@angular/router';
import { IpsrGreenCheckModule } from '../../../../components/ipsr-green-check/ipsr-green-check.module';

@NgModule({
  declarations: [IpsrDetailTopMenuComponent],
  exports: [IpsrDetailTopMenuComponent],
  imports: [CommonModule, RouterModule, IpsrGreenCheckModule]
})
export class IpsrDetailTopMenuModule {}
