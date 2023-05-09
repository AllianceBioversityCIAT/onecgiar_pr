import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IpsrRoutingModule } from './ipsr-routing.module';
import { IpsrComponent } from './ipsr.component';
import { SectionHeaderModule } from './components/section-header/section-header.module';

@NgModule({
  declarations: [IpsrComponent],
  imports: [CommonModule, IpsrRoutingModule, SectionHeaderModule]
})
export class IpsrModule {}
