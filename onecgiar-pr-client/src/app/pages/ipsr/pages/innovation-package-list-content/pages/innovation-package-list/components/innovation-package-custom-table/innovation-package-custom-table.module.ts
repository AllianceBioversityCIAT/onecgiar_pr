import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InnovationPackageCustomTableComponent } from './innovation-package-custom-table.component';
import { TableModule } from 'primeng/table';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';

@NgModule({
  declarations: [InnovationPackageCustomTableComponent],
  exports: [InnovationPackageCustomTableComponent],
  imports: [CommonModule, TableModule, RouterModule, MenuModule]
})
export class InnovationPackageCustomTableModule {}
