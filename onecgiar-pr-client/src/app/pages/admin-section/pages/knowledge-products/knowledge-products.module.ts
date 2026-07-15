import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeProductsRoutingModule } from './knowledge-products-routing.module';
import { KnowledgeProductsComponent } from './knowledge-products.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PrToastComponent } from 'src/app/shared/components/pr-toast';

@NgModule({
  declarations: [KnowledgeProductsComponent],
  exports: [KnowledgeProductsComponent],
  imports: [CommonModule, KnowledgeProductsRoutingModule, CustomFieldsModule, PrToastComponent]
})
export class KnowledgeProductsModule {}
