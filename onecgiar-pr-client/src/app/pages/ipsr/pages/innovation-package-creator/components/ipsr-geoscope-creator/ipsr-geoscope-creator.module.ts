import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IpsrGeoscopeCreatorComponent } from './ipsr-geoscope-creator.component';
import { SubGeoscopeComponent } from './components/sub-geoscope/sub-geoscope.component';

@NgModule({
  declarations: [IpsrGeoscopeCreatorComponent, SubGeoscopeComponent],
  exports: [IpsrGeoscopeCreatorComponent],
  imports: [CommonModule]
})
export class IpsrGeoscopeCreatorModule {}
