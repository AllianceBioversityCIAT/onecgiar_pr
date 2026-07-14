import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';
import { PrTableComponent, PrSortIconComponent, PrSortableColumnDirective, PrTableHeaderDirective, PrTableBodyDirective } from 'src/app/shared/components/pr-table';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { PdfIconModule } from '../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [InnovationPackageCustomTableComponent],
  exports: [InnovationPackageCustomTableComponent],
  imports: [
    CommonModule,
    CustomFieldsModule,
    PrTableComponent,
    PrSortIconComponent,
    PrSortableColumnDirective,
    PrTableHeaderDirective,
    PrTableBodyDirective,
    RouterModule,
    MenuModule,
    PdfIconModule
  ]
})
export class InnovationPackageCustomTableModule {}
