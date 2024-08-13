import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { UpdatesComponent } from './updates.component';
import { UpdatesRoutingModule } from './updates-routing.module';

@NgModule({
  declarations: [UpdatesComponent],
  imports: [CommonModule, UpdatesRoutingModule]
})
export class UpdatesModule {}
