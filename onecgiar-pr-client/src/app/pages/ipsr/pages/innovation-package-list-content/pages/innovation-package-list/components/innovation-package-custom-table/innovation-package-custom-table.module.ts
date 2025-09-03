import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { PdfIconModule } from '../../../../../../../../shared/icon-components/pdf-icon/pdf-icon.module';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

@NgModule({
  declarations: [InnovationPackageCustomTableComponent],
  exports: [InnovationPackageCustomTableComponent],
  imports: [CommonModule, CustomFieldsModule, TableModule, RouterModule, MenuModule, PdfIconModule, PopoverModule, TooltipModule]
})
export class InnovationPackageCustomTableModule {}
