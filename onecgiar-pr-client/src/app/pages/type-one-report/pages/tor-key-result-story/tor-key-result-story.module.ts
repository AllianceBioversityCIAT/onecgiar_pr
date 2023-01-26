import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TorKeyResultStoryRoutingModule } from './tor-key-result-story-routing.module';
import { TorKeyResultStoryComponent } from './tor-key-result-story.component';


@NgModule({
  declarations: [
    TorKeyResultStoryComponent
  ],
  imports: [
    CommonModule,
    TorKeyResultStoryRoutingModule
  ]
})
export class TorKeyResultStoryModule { }
