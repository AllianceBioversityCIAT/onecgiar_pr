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

  it('should call resetFilters if initiativeIdFilter is not null', () => {
    routerMock.url = '/some-url';
    resultsNotificationsServiceMock.initiativeIdFilter = 1;
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });

  it('should call resetFilters if searchFilter is not null', () => {
    routerMock.url = '/some-url';
    resultsNotificationsServiceMock.searchFilter = 'search';
    component.clearFiltersAndUpdateResults();
    expect(resultsNotificationsServiceMock.resetFilters).toHaveBeenCalled();
  });
});
