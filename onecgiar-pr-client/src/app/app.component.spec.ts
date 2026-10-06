import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ShareRequestModalComponent } from './pages/results/pages/result-detail/components/share-request-modal/share-request-modal.component';
import { ExternalToolsComponent } from './shared/components/external-tools/external-tools.component';
import { GoogleAnalyticsComponent } from './shared/components/external-tools/components/google-analytics/google-analytics.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [AppComponent, ShareRequestModalComponent, ExternalToolsComponent, GoogleAnalyticsComponent],
      providers: []
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

  describe('Session bootstrap (BELL-T-2)', () => {
    it('loads the bell on boot and no longer calls the last-viewed pop-up feed (BELL-R-12)', () => {
      const notificationsSE = (component as any).resultsNotificationsSE;
      const refreshBell = jest.spyOn(notificationsSE, 'refreshBell').mockImplementation(() => {});
      const popUp = jest.spyOn(notificationsSE, 'get_updates_pop_up_notifications').mockImplementation(() => {});
      jest.spyOn(component.AuthService, 'localStorageUser', 'get').mockReturnValue({ id: 1 } as any);
      jest.spyOn(component.api, 'updateUserData').mockImplementation((cb: any) => cb());
      jest.spyOn(component.api.dataControlSE, 'getCurrentPhases').mockReturnValue({ subscribe: () => {} } as any);

      (component as any).bootstrapUserSession();

      expect(refreshBell).toHaveBeenCalledTimes(1);
      expect(popUp).not.toHaveBeenCalled();
    });
  });
});
