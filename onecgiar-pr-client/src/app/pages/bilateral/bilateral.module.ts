import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralRoutingModule } from './bilateral-routing.module';
import { BilateralComponent } from './bilateral.component';
// `ARM-T-2`: single mount for the whole bilateral shell (design.md `ARM-DD-1`) — imported here
// (standalone component) instead of in the creator or the projects panel, which used to mount it.
import { BilateralManualCreateDrawerHostComponent } from './components/bilateral-manual-create-drawer-host/bilateral-manual-create-drawer-host.component';

@NgModule({
  declarations: [BilateralComponent],
  imports: [CommonModule, BilateralRoutingModule, BilateralManualCreateDrawerHostComponent]
})
export class BilateralModule {}
