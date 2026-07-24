import { NgModule, inject, provideAppInitializer } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
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
import { PrDialogComponent } from './shared/components/pr-dialog/pr-dialog.component';
import { PrToastComponent } from './shared/components/pr-toast';
// import { SocketIoModule } from 'ngx-socket-io';
// import { WebsocketService } from './sockets/websocket.service';
// import { environment } from '../environments/environment';
import { ClarityService } from './shared/services/clarity.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { UserRolesInfoModalComponent } from './shared/components/user-roles-info-modal/user-roles-info-modal.component';
import { AiAssistantPanelComponent } from './shared/components/ai-assistant/ai-assistant-panel.component';
import { ASSISTANT_ENGINE } from './shared/components/ai-assistant/engine/assistant-engine.types';
import { WebLlmEngineService } from './shared/components/ai-assistant/engine/web-llm-engine.service';
import { RouteReuseStrategy } from '@angular/router';
import { PrmsRouteReuseStrategy } from './shared/components/ai-assistant/prms-route-reuse.strategy';
import { HlmSidebarImports } from '@spartan/sidebar';
import { ReportingNavSidebarComponent } from './shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component';

function initializeClarityService(clarityService: ClarityService) {
  return () => clarityService.init();
}

@NgModule({
  declarations: [AppComponent, ExternalToolsComponent, TestEnvironmentLabelComponent, GoogleAnalyticsComponent],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    CustomFieldsModule,
    ShareRequestModalModule,
    YmzListStructureItemModule,
    ChangePhaseModalModule,
    FooterModule,
    PrDialogComponent,
    PrToastComponent,
    TawkComponent,
    UserRolesInfoModalComponent,
    AiAssistantPanelComponent,
    ...HlmSidebarImports,
    ReportingNavSidebarComponent
    // SocketIoModule.forRoot({ url: environment.webSocketUrl, options: {} })
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: GeneralInterceptorService, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
    { provide: ASSISTANT_ENGINE, useExisting: WebLlmEngineService },
    { provide: RouteReuseStrategy, useClass: PrmsRouteReuseStrategy },
    ClarityService,
    provideAnimationsAsync(),
    provideAppInitializer(() => {
      const initializerFn = initializeClarityService(inject(ClarityService));
      return initializerFn();
    })
    // WebsocketService
  ]
})
export class AppModule {}
