import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ReceivedRequestsComponent } from './received-requests.component';
import { FilterNotificationByInitiativePipe } from '../../../../pipes/filter-notification-by-initiative.pipe';
import { FilterNotificationBySearchPipe } from '../../../../pipes/filter-notification-by-search.pipe';
import { FilterNotificationByCenterPipe } from '../../../../pipes/filter-notification-by-center.pipe';
import { FilterNotificationByBilateralProjectPipe } from '../../../../pipes/filter-notification-by-bilateral-project.pipe';
import { GroupNotificationsByRecencyPipe } from '../../../../pipes/group-notifications-by-recency.pipe';
import { SkeletonNotificationItemComponent } from '../../../../components/notification-item/skeleton-notification-item/skeleton-notification-item.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ResultsNotificationsService } from '../../../../results-notifications.service';
import { HlmBadgeImports } from '@spartan/badge';

// Hermetic stand-in for the real `app-notification-item` (mirrors NOTIF-T-4's precedent): this spec
// verifies the recency-grouping template restructure, not notification-item's own accept/decline/ToC
// wiring (covered by notification-item.component.spec.ts). The real component pulls in a large DI
// graph (ApiService.resultsSE, dataControlSE, rolesSE, ...) that is out of scope here.
@Component({
  selector: 'app-notification-item',
  standalone: true,
  template: '<div class="notification-item-stub"></div>'
})
class NotificationItemStubComponent {
  @Input() notification: unknown;
  @Input() isSent = false;
  @Output() requestEvent = new EventEmitter<void>();
}

describe('ReceivedRequestsComponent', () => {
  let component: ReceivedRequestsComponent;
  let fixture: ComponentFixture<ReceivedRequestsComponent>;
  const apiServiceMock: any = {};
  let resultsNotificationsServiceMock: any;

  const buildNotification = (overrides: Record<string, unknown>) => ({
    share_result_request_id: 1,
    result_id: '1',
    request_status_id: 1,
    requested_date: new Date().toISOString(),
    ...overrides
  });

  beforeEach(async () => {
    resultsNotificationsServiceMock = {
      get_section_information: jest.fn(),
      loadingReceived: false,
      initiativeIdFilter: null,
      searchFilter: null,
      centerIdsFilter: null,
      bilateralProjectIdsFilter: null,
      receivedData: {
        receivedContributionsPending: [],
        receivedContributionsDone: []
      }
    };

    await TestBed.configureTestingModule({
      declarations: [
        ReceivedRequestsComponent,
        FilterNotificationByInitiativePipe,
        FilterNotificationBySearchPipe,
        FilterNotificationByCenterPipe,
        FilterNotificationByBilateralProjectPipe,
        GroupNotificationsByRecencyPipe
      ],
      imports: [HttpClientTestingModule, SkeletonNotificationItemComponent, NotificationItemStubComponent, ...HlmBadgeImports],
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

  it('should call get_section_information on ngOnInit', () => {
    component.ngOnInit();

    expect(resultsNotificationsServiceMock.get_section_information).toHaveBeenCalled();
  });

  it('groups a today row and a three-week-old row under Today/Earlier headers with counts, and drops Pending/Done text', () => {
    const now = new Date();
    const todayIso = now.toISOString();
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();

    resultsNotificationsServiceMock.receivedData = {
      receivedContributionsPending: [buildNotification({ share_result_request_id: 1, request_status_id: 1, requested_date: todayIso })],
      receivedContributionsDone: [buildNotification({ share_result_request_id: 2, request_status_id: 2, requested_date: threeWeeksAgo })]
    };

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Today');
    expect(text).toContain('Earlier');
    expect(text).not.toContain('This week');
    expect(text).not.toMatch(/\bPending\b/);
    expect(text).not.toMatch(/\bDone\b/);

    const headers = fixture.nativeElement.querySelectorAll('h1.received_container_header_title');
    expect(headers.length).toBe(2);

    const todayHeaderText = headers[0].textContent.replace(/\s+/g, ' ').trim();
    const earlierHeaderText = headers[1].textContent.replace(/\s+/g, ' ').trim();
    expect(todayHeaderText).toBe('Today 1');
    expect(earlierHeaderText).toBe('Earlier 1');

    expect(fixture.nativeElement.querySelectorAll('app-notification-item').length).toBe(2);
  });

  it('filters by centerIdsFilter using the NOTIF-T-6-wired filterNotificationByCenter pipe, identically to a Center chip narrowing the list', () => {
    resultsNotificationsServiceMock.receivedData = {
      receivedContributionsPending: [
        buildNotification({
          share_result_request_id: 1,
          obj_result: { source_name: 'W3/Bilaterals', result_center_array: [{ clarisa_center_object: { clarisa_institution: { id: 10 } } }] }
        }),
        buildNotification({ share_result_request_id: 2, obj_result: { source_name: 'W1/W2' } })
      ],
      receivedContributionsDone: []
    };
    resultsNotificationsServiceMock.centerIdsFilter = [10];

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-notification-item').length).toBe(1);
  });

  it('filters by bilateralProjectIdsFilter using the NOTIF-T-6-wired filterNotificationByBilateralProject pipe', () => {
    // NOTIF-T-16: filtered on the true bilateral PROJECT identifier (`clarisa_projects.short_name`,
    // joined via `results_by_projects` → `obj_result_by_project[].obj_clarisa_project`), not the
    // RESULT's own `result_code`.
    resultsNotificationsServiceMock.receivedData = {
      receivedContributionsPending: [
        buildNotification({
          share_result_request_id: 1,
          obj_result: { source_name: 'W3/Bilaterals', obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-1' } }] }
        }),
        buildNotification({
          share_result_request_id: 2,
          obj_result: { source_name: 'W3/Bilaterals', obj_result_by_project: [{ obj_clarisa_project: { shortName: 'BIL-2' } }] }
        })
      ],
      receivedContributionsDone: []
    };
    resultsNotificationsServiceMock.bilateralProjectIdsFilter = ['BIL-1'];

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-notification-item').length).toBe(1);
  });

  it('renders the skeleton while loading', () => {
    resultsNotificationsServiceMock.loadingReceived = true;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-skeleton-notification-item').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).not.toContain('You have no');
  });

  it('renders the empty state when there is nothing to show', () => {
    resultsNotificationsServiceMock.loadingReceived = false;
    resultsNotificationsServiceMock.receivedData = {
      receivedContributionsPending: [],
      receivedContributionsDone: []
    };

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('You have no notifications related with the search.');
  });
});
