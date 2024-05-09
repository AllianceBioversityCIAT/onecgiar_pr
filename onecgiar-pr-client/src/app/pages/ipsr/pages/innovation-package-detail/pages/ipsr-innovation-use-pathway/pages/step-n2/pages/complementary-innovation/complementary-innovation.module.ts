import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ComplementaryInnovationRoutingModule } from './complementary-innovation-routing.module';
import { ComplementaryInnovationComponent } from './complementary-innovation.component';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { FilterByTextModule } from '../../../../../../../../../../shared/pipes/filter-by-text.module';
import { FormsModule } from '@angular/forms';
import { TableInnovationComponent } from './components/table-innovation/table-innovation.component';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { NewComplementaryInnovationComponent } from './components/new-complementary-innovation/new-complementary-innovation.component';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';


@NgModule({
  declarations: [
    ComplementaryInnovationComponent,
    TableInnovationComponent,
    NewComplementaryInnovationComponent
  ],
  imports: [
    CommonModule,
    ComplementaryInnovationRoutingModule,
    TableModule,
    RouterModule,
    FilterByTextModule,
    FormsModule,
    CustomFieldsModule,
    DialogModule,
    CheckboxModule
  ],
  exports:[
    ComplementaryInnovationComponent
  ]
})
export class ComplementaryInnovationModule { }
