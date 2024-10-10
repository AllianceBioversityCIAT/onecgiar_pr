import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { FooterComponent } from './shared/components/footer/footer.component';
import { ShareRequestModalComponent } from './pages/results/pages/result-detail/components/share-request-modal/share-request-modal.component';
import { ExternalToolsComponent } from './shared/components/external-tools/external-tools.component';
import { MessageService } from 'primeng/api';
import { GoogleAnalyticsComponent } from './shared/components/external-tools/components/google-analytics/google-analytics.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, ToastModule, DialogModule],
      declarations: [AppComponent, FooterComponent, ShareRequestModalComponent, ExternalToolsComponent, GoogleAnalyticsComponent],
      providers: [MessageService]
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it(`should have as title 'onecgiar-pr-client'`, () => {
    expect(component.title).toEqual('onecgiar-pr-client');
  });

  describe('On init', () => {
    it('should have a method copyTokenToClipboard', () => {
      const copyTokenToClipboardSpy = jest.spyOn(component, 'copyTokenToClipboard');
      component.ngOnInit();
      expect(copyTokenToClipboardSpy).toHaveBeenCalled();
    });
    it('shoud have a method copyTokenToClipboard', () => {
      expect(component.copyTokenToClipboard).toBeDefined();
    });
  });
});
