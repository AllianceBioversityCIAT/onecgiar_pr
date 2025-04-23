import { NgModule } from '@angular/core';
import { WhatsNewComponent } from './whats-new.component';
import { WhatsNewRouting } from '../../shared/routing/routing-data';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [{ path: '', component: WhatsNewComponent, children: WhatsNewRouting }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WhatsNewRoutingModule {}
