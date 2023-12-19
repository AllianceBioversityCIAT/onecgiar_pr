import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorTocDiagramsRoutingModule } from './tor-toc-diagrams-routing.module';
import { TorTocDiagramsComponent } from './tor-toc-diagrams.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [TorTocDiagramsComponent],
  imports: [CommonModule, TorTocDiagramsRoutingModule, CustomFieldsModule]
})
export class TorTocDiagramsModule {}
