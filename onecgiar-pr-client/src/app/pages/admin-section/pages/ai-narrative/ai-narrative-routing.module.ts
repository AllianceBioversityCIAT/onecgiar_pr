// @akili-spec changes/mass-reporting-flow
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AiNarrativeComponent } from './ai-narrative.component';

const routes: Routes = [{ path: '', component: AiNarrativeComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AiNarrativeRoutingModule {}
