import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralRoutingModule } from './bilateral-routing.module';
import { BilateralComponent } from './bilateral.component';

@NgModule({
  declarations: [BilateralComponent],
  imports: [CommonModule, BilateralRoutingModule]
})
export class BilateralModule {}
