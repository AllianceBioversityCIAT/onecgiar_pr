import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';
import { CustomFieldsModule } from 'src/app/custom-fields/custom-fields.module';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { PdfIconModule } from '../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';

@NgModule({
  declarations: [InnovationPackageCustomTableComponent],
  exports: [InnovationPackageCustomTableComponent],
  imports: [CommonModule, CustomFieldsModule, TableModule, RouterModule, MenuModule, PdfIconModule]
})
export class InnovationPackageCustomTableModule {}
