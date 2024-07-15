import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { KnowledgeProductsRoutingModule } from './knowledge-products-routing.module';
import { KnowledgeProductsComponent } from './knowledge-products.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@NgModule({
  declarations: [KnowledgeProductsComponent],
  exports: [KnowledgeProductsComponent],
  imports: [CommonModule, KnowledgeProductsRoutingModule, ButtonModule, InputNumberModule, CustomFieldsModule, ToastModule],
  providers: [MessageService]
})
export class KnowledgeProductsModule {}
