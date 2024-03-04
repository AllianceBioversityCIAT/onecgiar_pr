import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { ActionAreaCounterComponent } from './components/action-area-counter/action-area-counter.component';

@NgModule({
  declarations: [HomeComponent, ActionAreaCounterComponent],
  imports: [CommonModule, HomeRoutingModule]
})
export class HomeModule {}
