import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeProductInfoRoutingModule } from './knowledge-product-info-routing.module';
import { KnowledgeProductInfoComponent } from './knowledge-product-info.component';


@NgModule({
  declarations: [
    KnowledgeProductInfoComponent
  ],
  imports: [
    CommonModule,
    KnowledgeProductInfoRoutingModule
  ]
})
export class KnowledgeProductInfoModule { }
