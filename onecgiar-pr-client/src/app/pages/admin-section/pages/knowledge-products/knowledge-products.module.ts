import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeProductsRoutingModule } from './knowledge-products-routing.module';
import { KnowledgeProductsComponent } from './knowledge-products.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';

@NgModule({
  declarations: [KnowledgeProductsComponent],
  exports: [KnowledgeProductsComponent],
  imports: [CommonModule, KnowledgeProductsRoutingModule, ButtonModule, InputNumberModule, CustomFieldsModule]
})
export class KnowledgeProductsModule {}
