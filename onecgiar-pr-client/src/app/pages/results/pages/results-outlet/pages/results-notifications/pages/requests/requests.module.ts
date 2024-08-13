import { NgModule } from '@angular/core';
import { RequestsComponent } from './requests.component';
import { CommonModule } from '@angular/common';
import { RequestsRoutingModule } from './requests-routing.module';

@NgModule({
  declarations: [RequestsComponent],
  imports: [CommonModule, RequestsRoutingModule]
})
export class RequestsModule {}
