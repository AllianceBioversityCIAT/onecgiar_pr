import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExternalToolsComponent } from './external-tools.component';
import { Subject } from 'rxjs';
import { Router, NavigationStart } from '@angular/router';
import { PusherService } from '../../services/pusher.service';
import { ApiService } from '../../services/api/api.service';

class MockRouter {
  public events = new Subject<any>();
  public currentNavigation = jest.fn(() => null as any);
}

class MockPusherService {
  membersList: any[] = [1];
  continueEditing = true;
  firstUser = true;
  secondUser: any = { id: 1 };
  start = jest.fn();
}

class MockApiService {
  dataControlSE = { inNotifications: false } as any;
}

describe('ExternalToolsComponent', () => {
  let component: ExternalToolsComponent;
  let fixture: ComponentFixture<ExternalToolsComponent>;

  let router: MockRouter;
  let pusher: MockPusherService;
  let api: MockApiService;

  beforeEach(async () => {
    router = new MockRouter();
    pusher = new MockPusherService();
    api = new MockApiService();

    await TestBed.configureTestingModule({
      declarations: [ExternalToolsComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: PusherService, useValue: pusher },
        { provide: ApiService, useValue: api }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExternalToolsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('passes the result id to pusher only on a result-detail url', () => {
    const detail = '/result/result-detail/8753/general-information?phase=36';
    (router.events as Subject<any>).next(new NavigationStart(1, detail));
    expect(pusher.start).toHaveBeenCalledWith(detail, '8753');
  });

  it('should handle NavigationStart: set flags, scroll, start pusher and call gtag', () => {
    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined as any);
    const gtagMock = jest.fn();
    ;(global as any).gtag = gtagMock;

    const url = '/app/results-notifications/abc/123';
    (router.events as Subject<any>).next(new NavigationStart(1, url));

    expect(api.dataControlSE.inNotifications).toBe(true); // contains results-notifications
    expect(scrollSpy).toHaveBeenCalledWith(0, 0);
    // Not a result-detail URL → no result id. The old `url.split('/')[3]` handed Pusher the
    // 3rd segment of ANY url ('abc' here), which 404'd the auth endpoint on every page.
    expect(pusher.start).toHaveBeenCalledWith(url, null);
    expect(pusher.membersList).toEqual([]);
    expect(pusher.continueEditing).toBe(false);
    expect(pusher.firstUser).toBe(false);
    expect(pusher.secondUser).toBeNull();
    expect(gtagMock).toHaveBeenCalled();
  });

  it('PRE-T-6: a navigation that opts out with keepScroll does not reset the scroll, a plain one does', () => {
    const scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined as any);
    scrollSpy.mockClear();
    (global as any).gtag = jest.fn();

    router.currentNavigation.mockReturnValue({ extras: { info: { keepScroll: true } } });
    (router.events as Subject<any>).next(new NavigationStart(1, '/portfolio-overview?status=editing'));
    expect(scrollSpy).not.toHaveBeenCalled();
    // everything else on the NavigationStart still runs
    expect(pusher.start).toHaveBeenCalled();

    router.currentNavigation.mockReturnValue({ extras: { info: { somethingElse: true } } });
    (router.events as Subject<any>).next(new NavigationStart(2, '/portfolio-overview'));
    router.currentNavigation.mockReturnValue(null);
    (router.events as Subject<any>).next(new NavigationStart(3, '/home'));
    expect(scrollSpy).toHaveBeenCalledTimes(2);
    expect(scrollSpy).toHaveBeenCalledWith(0, 0);
  });

  it('should catch error when gtag throws', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined as any);
    (global as any).gtag = () => { throw new Error('gtag fail'); };
    const url = '/home/dashboard/x/xyz';
    (router.events as Subject<any>).next(new NavigationStart(1, url));
    expect(errorSpy).toHaveBeenCalled();
  });
});
