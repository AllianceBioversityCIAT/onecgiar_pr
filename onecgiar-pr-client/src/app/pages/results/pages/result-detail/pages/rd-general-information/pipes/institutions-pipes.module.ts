import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CountInstitutionsTypesPipe } from './count-institutions-types.pipe';

@NgModule({
  declarations: [CountInstitutionsTypesPipe],
  exports: [CountInstitutionsTypesPipe],
  imports: [CommonModule]
})
export class InstitutionsPipesModule {}
