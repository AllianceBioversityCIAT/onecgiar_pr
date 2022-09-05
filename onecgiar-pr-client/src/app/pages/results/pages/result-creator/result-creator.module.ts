import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultCreatorRoutingModule } from './result-creator-routing.module';
import { ResultCreatorComponent } from './result-creator.component';
import { UtilsComponentsModule } from '../../../../shared/components/utils-components/utils-components.module';


@NgModule({
  declarations: [
    ResultCreatorComponent
    
  ],
  imports: [
    CommonModule,
    ResultCreatorRoutingModule,
    UtilsComponentsModule
  ]
})
export class ResultCreatorModule { }
