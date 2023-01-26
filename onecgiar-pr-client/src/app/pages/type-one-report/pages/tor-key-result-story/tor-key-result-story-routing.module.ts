import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorKeyResultStoryComponent } from './tor-key-result-story.component';

const routes: Routes = [{ path: '', component: TorKeyResultStoryComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorKeyResultStoryRoutingModule {}
