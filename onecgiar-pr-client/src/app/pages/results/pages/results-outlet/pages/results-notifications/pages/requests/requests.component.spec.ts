import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestsComponent } from './requests.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultsNotificationsService } from '../../results-notifications.service';
import { Router, RouterOutlet } from '@angular/router';

describe('RequestsComponent', () => {
  let component: RequestsComponent;
  let fixture: ComponentFixture<RequestsComponent>;
  let resultsNotificationsServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    resultsNotificationsServiceMock = {
      get_section_information: jest.fn(),
      get_sent_notifications: jest.fn(),
      resetFilters: jest.fn()
    };

    routerMock = {
      url: '',
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [RequestsComponent],
      imports: [HttpClientTestingModule, RouterOutlet],
      providers: [
        RequestsComponent,
        { provide: ResultsNotificationsService, useValue: resultsNotificationsServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RequestsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call get_sent_notifications if URL does not include "sent"', () => {
    routerMock.url = '/some-url';
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.get_sent_notifications).toHaveBeenCalled();
  });

  it('should not call get_sent_notifications if URL includes "sent"', () => {
    routerMock.url = '/sent';
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.get_sent_notifications).not.toHaveBeenCalled();
  });

  it('should call get_section_information if URL does not include "received"', () => {
    routerMock.url = '/some-url';
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.get_section_information).toHaveBeenCalled();
  });

  it('should not call get_section_information if URL includes "received"', () => {
    routerMock.url = '/received';
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.get_section_information).not.toHaveBeenCalled();
  });

  it('should call resetFilters', () => {
    routerMock.url = '/some-url';
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });
});
