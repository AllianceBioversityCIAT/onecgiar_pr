import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentRequestsComponent } from './sent-requests.component';
import { SentRequestsRoutingModule } from './sent-requests-routing.module';

@NgModule({
  declarations: [SentRequestsComponent],
  imports: [CommonModule, SentRequestsRoutingModule]
})
export class SentRequestsModule {}
