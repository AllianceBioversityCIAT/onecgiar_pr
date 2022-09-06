import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdEvidencesRoutingModule } from './rd-evidences-routing.module';
import { RdEvidencesComponent } from './rd-evidences.component';

@NgModule({
  declarations: [RdEvidencesComponent],
  imports: [CommonModule, RdEvidencesRoutingModule]
})
export class RdEvidencesModule {}
