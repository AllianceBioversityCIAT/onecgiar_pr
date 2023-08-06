import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhaseSwitcherComponent } from './phase-switcher.component';
import { RouterLink } from '@angular/router';

@NgModule({
  declarations: [PhaseSwitcherComponent],
  exports: [PhaseSwitcherComponent],
  imports: [CommonModule, RouterLink]
})
export class PhaseSwitcherModule {}
