import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultsOutletRoutingModule } from './results-outlet-routing.module';
import { ResultsOutletComponent } from './results-outlet.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@NgModule({
  declarations: [ResultsOutletComponent],
  imports: [CommonModule, ResultsOutletRoutingModule, CustomFieldsModule, PageHeaderComponent, PageHeaderComponent]
})
export class ResultsOutletModule {}
