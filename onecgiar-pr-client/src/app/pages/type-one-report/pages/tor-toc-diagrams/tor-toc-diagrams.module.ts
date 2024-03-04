import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorTocDiagramsRoutingModule } from './tor-toc-diagrams-routing.module';
import { TorTocDiagramsComponent } from './tor-toc-diagrams.component';

@NgModule({
  declarations: [TorTocDiagramsComponent],
  imports: [CommonModule, TorTocDiagramsRoutingModule]
})
export class TorTocDiagramsModule {}
