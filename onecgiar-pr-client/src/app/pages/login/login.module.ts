import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginRoutingModule } from './login-routing.module';
import { LoginComponent } from './login.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CustomFieldsModule } from '../../custom-fields/custom-fields.module';

@NgModule({
  declarations: [LoginComponent],
  imports: [CommonModule, LoginRoutingModule, FormsModule, InputTextModule, AutoCompleteModule, CustomFieldsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginModule {}
