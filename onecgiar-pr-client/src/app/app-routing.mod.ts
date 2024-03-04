import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { extraRoutingApp, routingApp } from './shared/routing/routing-data';

const routes: Routes = [...extraRoutingApp, ...routingApp];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
