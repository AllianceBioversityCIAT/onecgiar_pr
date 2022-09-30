import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { routingApp } from './shared/routing/routing-data';

const routes: Routes = routingApp;

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
