import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavigationBarComponent } from './shared/components/navigation-bar/navigation-bar.component';
import { HeaderPanelComponent } from './shared/components/header-panel/header-panel.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ExternalToolsComponent } from './shared/components/external-tools/external-tools.component';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { GeneralInterceptorService } from './shared/interceptors/general-interceptor.service';
import { TestEnvironmentLabelComponent } from './shared/components/test-environment-label/test-environment-label.component';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { TawkComponent } from './shared/components/tawk/tawk.component';
import { GoogleAnalyticsComponent } from './shared/components/external-tools/components/google-analytics/google-analytics.component';
import { ShareRequestModalModule } from './pages/results/pages/result-detail/components/share-request-modal/share-request-modal.module';
import { YmzListStructureItemModule } from './shared/directives/ymz-list-structure-item/ymz-list-structure-item.module';
import { ChangePhaseModalModule } from './shared/components/change-phase-modal/change-phase-modal.module';
import { FooterModule } from './shared/components/footer/footer.module';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { SatPopoverModule } from '@ncstate/sat-popover';
import { FormatTimeAgoModule } from './shared/pipes/format-time-ago/format-time-ago.module';
@NgModule({ declarations: [
        AppComponent,
        NavigationBarComponent,
        HeaderPanelComponent,
        ExternalToolsComponent,
        TestEnvironmentLabelComponent,
        TawkComponent,
        GoogleAnalyticsComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        CustomFieldsModule,
        ShareRequestModalModule,
        YmzListStructureItemModule,
        ChangePhaseModalModule,
        FooterModule,
        DialogModule,
        BadgeModule,
        SatPopoverModule,
        FormatTimeAgoModule], providers: [{ provide: HTTP_INTERCEPTORS, useClass: GeneralInterceptorService, multi: true }, provideHttpClient(withInterceptorsFromDi())] })
export class AppModule {}
