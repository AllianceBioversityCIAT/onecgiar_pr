import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TheoryOfChangeRoutingModule } from './theory-of-change-routing.module';
import { TheoryOfChangeComponent } from './theory-of-change.component';

@NgModule({
  declarations: [TheoryOfChangeComponent],
  imports: [CommonModule, TheoryOfChangeRoutingModule]
})
export class TheoryOfChangeModule {}
