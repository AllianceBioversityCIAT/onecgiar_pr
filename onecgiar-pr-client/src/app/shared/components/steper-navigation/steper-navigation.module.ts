import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SteperNavigationComponent } from './steper-navigation.component';

@NgModule({
  declarations: [SteperNavigationComponent],
  exports: [SteperNavigationComponent],
  imports: [CommonModule]
})
export class SteperNavigationModule {}
