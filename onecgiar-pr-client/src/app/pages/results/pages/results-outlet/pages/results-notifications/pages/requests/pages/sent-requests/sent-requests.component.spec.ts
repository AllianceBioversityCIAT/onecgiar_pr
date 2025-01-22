import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SentRequestsComponent } from './sent-requests.component';
import { NotificationItemModule } from '../../../../components/notification-item/notification-item.module';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ResultsNotificationsService } from '../../../../results-notifications.service';

describe('SentRequestsComponent', () => {
  let component: SentRequestsComponent;
  let fixture: ComponentFixture<SentRequestsComponent>;
  let apiServiceMock: any;
  let resultsNotificationsServiceMock: any;

  beforeEach(async () => {
    resultsNotificationsServiceMock = {
      get_sent_notifications: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [SentRequestsComponent],
      imports: [HttpClientTestingModule, NotificationItemModule],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SentRequestsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call get_sent_notifications on ngOnInit', () => {
    component.ngOnInit();

    expect(resultsNotificationsServiceMock.get_sent_notifications).toHaveBeenCalled();
  });
});
