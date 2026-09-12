import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsListComponent } from './results-list.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsListService } from './services/results-list.service';
import { ResultsListFilterService } from './services/results-list-filter.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { ResultsNotificationsService } from '../results-notifications/results-notifications.service';
import { BilateralResultsService } from '../../../../../result-framework-reporting/pages/bilateral-review/services/bilateral-results.service';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';

/**
 * `RCS-T-5` (`docs/specs/changes/results-center-sp-layout`) — viewport lock wiring on Results Center:
 * host `pr-viewport-page` class and `#workArea` scroll host. Presence checks only; scroll geometry
 * is verified manually at ≥900px.
 */
describe('ResultsListComponent — viewport lock (RCS-T-5)', () => {
  const VIEWPORT_FRAGMENT = `
    <div class="rc-page">
      <header class="rc-hero flex-none" data-testid="rc-hero">hero</header>
      <div class="rc-toolbar-row flex-none">
        <app-results-list-filters class="rc-toolbar-row__filters" data-testid="rc-filters"></app-results-list-filters>
        <div class="rc-toolbar-row__actions" data-testid="rc-toolbar-actions"></div>
      </div>
      <div #workArea class="rc-work-area custom_scroll" data-testid="rc-work-area">
        <div data-testid="rc-table-body">table</div>
      </div>
    </div>`;

  let fixture: ComponentFixture<ResultsListComponent>;
  let component: ResultsListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [ResultsListComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            rolesSE: { isAdmin: false, platformIsClosed: false },
            dataControlSE: {
              resultsListSignal: signal([]),
              resultsListNoDataMessage: signal(null),
              getCurrentPhases: jest.fn(),
              myInitiativesList: [],
              myInitiativesListReportingByPortfolio: []
            },
            resultsSE: {
              GET_reportingList: () => of({ response: [] }),
              GET_TypeByResultLevel: () => of({}),
              GET_versioning: () => of({ response: [] })
            },
            updateUserData: jest.fn(),
            updateResultsList: jest.fn(),
            buildResultsListSearchParams: jest.fn(() => undefined)
          }
        },
        { provide: ResultsListService, useValue: { showDeletingResultSpinner: false, showLoadingResultSpinner: false } },
        {
          provide: ResultsListFilterService,
          useValue: {
            text_to_search: signal(''),
            selectedPhases: signal([]),
            selectedSubmittersAdmin: signal([]),
            selectedIndicatorCategories: signal([]),
            selectedStatus: signal([]),
            selectedClarisaPortfolios: signal([]),
            selectedFundingSource: signal([]),
            selectedLeadCenters: signal([]),
            filterCreatedByMe: signal(false),
            filterSubmittedByMe: signal(false),
            phasesOptions: signal([{ id: 1 }])
          }
        },
        { provide: ShareRequestModalService, useValue: { inNotifications: false } },
        { provide: ResultLevelService, useValue: {} },
        { provide: RetrieveModalService, useValue: {} },
        { provide: ExportTablesService, useValue: {} },
        { provide: PhasesService, useValue: {} },
        { provide: ResultsNotificationsService, useValue: {} },
        { provide: BilateralResultsService, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .overrideComponent(ResultsListComponent, { set: { template: VIEWPORT_FRAGMENT } })
      .compileComponents();

    fixture = TestBed.createComponent(ResultsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('host classList includes pr-viewport-page', () => {
    expect(fixture.nativeElement.classList.contains('pr-viewport-page')).toBe(true);
  });

  it('resolves #workArea via workAreaEl()', () => {
    const workAreaEl = fixture.nativeElement.querySelector('[data-testid="rc-work-area"]');
    expect(workAreaEl).not.toBeNull();
    expect(component.workAreaEl()).toBe(workAreaEl);
  });

  it('keeps hero and filters outside #workArea', () => {
    const workArea = fixture.nativeElement.querySelector('[data-testid="rc-work-area"]');
    expect(workArea.querySelector('[data-testid="rc-hero"]')).toBeNull();
    expect(workArea.querySelector('[data-testid="rc-filters"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="rc-hero"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="rc-filters"]')).not.toBeNull();
  });
});
