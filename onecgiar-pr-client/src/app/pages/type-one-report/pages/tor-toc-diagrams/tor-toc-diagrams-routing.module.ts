import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorTocDiagramsComponent } from './tor-toc-diagrams.component';

const routes: Routes = [{ path: '', component: TorTocDiagramsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorTocDiagramsRoutingModule {}
