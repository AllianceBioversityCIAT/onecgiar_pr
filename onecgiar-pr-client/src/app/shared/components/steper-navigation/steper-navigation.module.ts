import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SteperNavigationComponent } from './steper-navigation.component';
import { RouterModule } from '@angular/router';
import { IpsrGreenCheckModule } from '../../../pages/ipsr/components/ipsr-green-check/ipsr-green-check.module';

@NgModule({
  declarations: [SteperNavigationComponent],
  exports: [SteperNavigationComponent],
  imports: [CommonModule, RouterModule, IpsrGreenCheckModule]
})
export class SteperNavigationModule {}
