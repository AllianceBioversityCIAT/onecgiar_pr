import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KnowledgeProductInfoComponent } from './knowledge-product-info.component';

const routes: Routes = [{ path: '', component: KnowledgeProductInfoComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KnowledgeProductInfoRoutingModule {}
