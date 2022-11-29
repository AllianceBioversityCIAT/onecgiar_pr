import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavigationBarComponent } from './shared/components/navigation-bar/navigation-bar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { HeaderPanelComponent } from './shared/components/header-panel/header-panel.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExternalToolsComponent } from './shared/components/external-tools/external-tools.component';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { GeneralInterceptorService } from './shared/interceptors/general-interceptor.service';
import { TestEnvironmentLabelComponent } from './shared/components/test-environment-label/test-environment-label.component';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { TawkComponent } from './shared/components/tawk/tawk.component';

@NgModule({
  declarations: [AppComponent, NavigationBarComponent, FooterComponent, HeaderPanelComponent, ExternalToolsComponent, TestEnvironmentLabelComponent, TawkComponent],
  imports: [BrowserModule, AppRoutingModule, BrowserAnimationsModule, HttpClientModule, CustomFieldsModule],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: GeneralInterceptorService, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule {}
