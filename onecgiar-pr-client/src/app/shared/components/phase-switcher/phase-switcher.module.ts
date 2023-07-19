import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseSwitcherComponent } from './phase-switcher.component';

@NgModule({
  declarations: [PhaseSwitcherComponent],
  exports: [PhaseSwitcherComponent],
  imports: [CommonModule]
})
export class PhaseSwitcherModule {}
