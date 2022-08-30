import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsListRoutingModule } from './results-list-routing.module';
import { ResultsListComponent } from './results-list.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { RouterModule } from '@angular/router';
import { UtilsComponentsModule } from '../../../../shared/components/utils-components/utils-components.module';
@NgModule({
  declarations: [
    ResultsListComponent
  ],
  imports: [
    CommonModule,
    ResultsListRoutingModule,
    TableModule,
    ButtonModule,
    MenuModule,
    RouterModule,
    UtilsComponentsModule
  ]
})
export class ResultsListModule { }
