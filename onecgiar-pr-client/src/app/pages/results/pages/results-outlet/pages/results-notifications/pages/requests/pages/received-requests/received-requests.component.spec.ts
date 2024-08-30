import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReceivedRequestsComponent } from './received-requests.component';
import { NotificationItemModule } from '../../../../components/notification-item/notification-item.module';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ResultsNotificationsService } from '../../../../results-notifications.service';

describe('ReceivedRequestsComponent', () => {
  let component: ReceivedRequestsComponent;
  let fixture: ComponentFixture<ReceivedRequestsComponent>;
  let apiServiceMock: any;
  let resultsNotificationsServiceMock: any;

  beforeEach(async () => {
    apiServiceMock = {
      updateUserData: jest.fn()
    };

    resultsNotificationsServiceMock = {
      get_section_information: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [ReceivedRequestsComponent],
      imports: [HttpClientTestingModule, NotificationItemModule],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReceivedRequestsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call updateUserData and get_section_information on ngOnInit', () => {
    const updateUserDataCallback = jest.fn();
    apiServiceMock.updateUserData.mockImplementation((callback: Function) => {
      updateUserDataCallback();
      callback();
    });

    component.ngOnInit();

    expect(apiServiceMock.updateUserData).toHaveBeenCalled();
    expect(updateUserDataCallback).toHaveBeenCalled();
    expect(resultsNotificationsServiceMock.get_section_information).toHaveBeenCalled();
  });
});
