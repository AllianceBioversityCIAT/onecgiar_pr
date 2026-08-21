import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CapDevInfoRoutingModule } from './cap-dev-info-routing.module';
import { CapDevInfoComponent } from './cap-dev-info.component';
import { CustomFieldsModule } from '../../../../../../../custom-fields/custom-fields.module';
import { SectionBottomBarComponent } from '../../../components/section-bottom-bar/section-bottom-bar.component';

@NgModule({
  declarations: [CapDevInfoComponent],
  imports: [SectionBottomBarComponent, CommonModule, CapDevInfoRoutingModule, CustomFieldsModule]
})
export class CapDevInfoModule {}
