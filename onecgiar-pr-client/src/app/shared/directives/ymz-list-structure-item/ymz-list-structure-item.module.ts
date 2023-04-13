import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YmzListStructureItemDirective } from './ymz-list-structure-item.directive';

@NgModule({
  declarations: [YmzListStructureItemDirective],
  exports: [YmzListStructureItemDirective],
  imports: [CommonModule]
})
export class YmzListStructureItemModule {}
