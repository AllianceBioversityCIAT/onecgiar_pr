import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { PdfIconModule } from '../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [InnovationPackageCustomTableComponent],
  exports: [InnovationPackageCustomTableComponent],
  imports: [CommonModule, CustomFieldsModule, TableModule, RouterModule, MenuModule, PdfIconModule]
})
export class InnovationPackageCustomTableModule {}
