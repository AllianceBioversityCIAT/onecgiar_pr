import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ResultCreatorRoutingModule } from './result-creator-routing.module';
import { ResultCreatorComponent } from './result-creator.component';
import { UtilsComponentsModule } from '../../../../shared/components/utils-components/utils-components.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { FormsModule } from '@angular/forms';
import { ResultLevelButtonsComponent } from './components/result-level-buttons/result-level-buttons.component';

@NgModule({
  declarations: [ResultCreatorComponent, ResultLevelButtonsComponent],
  imports: [CommonModule, ResultCreatorRoutingModule, UtilsComponentsModule, CustomFieldsModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ResultCreatorModule {}
