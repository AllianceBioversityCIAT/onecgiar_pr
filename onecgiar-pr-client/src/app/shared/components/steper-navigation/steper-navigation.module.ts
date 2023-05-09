import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SteperNavigationComponent } from './steper-navigation.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [SteperNavigationComponent],
  exports: [SteperNavigationComponent],
  imports: [CommonModule, RouterModule]
})
export class SteperNavigationModule {}
