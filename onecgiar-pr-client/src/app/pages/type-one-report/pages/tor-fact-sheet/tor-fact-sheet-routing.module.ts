import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TorFactSheetComponent } from './tor-fact-sheet.component';

const routes: Routes = [{ path: '', component: TorFactSheetComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TorFactSheetRoutingModule {}
