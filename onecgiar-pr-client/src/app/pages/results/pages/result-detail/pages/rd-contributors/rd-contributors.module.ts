import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RdContributorsRoutingModule } from './rd-contributors-routing.module';
import { RdContributorsComponent } from './rd-contributors.component';


@NgModule({
  declarations: [
    RdContributorsComponent
  ],
  imports: [
    CommonModule,
    RdContributorsRoutingModule
  ]
})
export class RdContributorsModule { }
