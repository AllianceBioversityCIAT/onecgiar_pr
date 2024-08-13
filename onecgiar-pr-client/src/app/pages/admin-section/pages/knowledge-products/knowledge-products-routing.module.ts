import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KnowledgeProductsComponent } from './knowledge-products.component';

const routes: Routes = [{ path: '', component: KnowledgeProductsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KnowledgeProductsRoutingModule {}
