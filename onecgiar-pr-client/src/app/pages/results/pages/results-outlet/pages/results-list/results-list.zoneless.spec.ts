import { CommonModule } from '@angular/common';
import { Component, ContentChildren, Input, NO_ERRORS_SCHEMA, QueryList, TemplateRef, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ResultsListComponent } from './results-list.component';
import { ResultsListFilterPipe } from './pipes/results-list-filter.pipe';
import { ResultsListFilterService } from './services/results-list-filter.service';
import { ResultsListService } from './services/results-list.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { ResultsNotificationsService } from '../results-notifications/results-notifications.service';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * `validateOrder()` runs from the column headers but writes `combine` 100 ms later, once the table
 * has applied `aria-sort`. `combine` feeds the `resultsListFilter` pipe in `@let filteredResults`,
 * which decides whether phases sharing a `result_code` collapse into one row. Before the fix
 * `combine` was a plain field, so the delayed write notified nothing and the rows stayed merged.
 * This test clicks the real header and asserts on the RENDERED rows, not on the flag.
 */

/**
 * Stub for <app-pr-table>. It renders the real `prTableHeader` template (so the header `th`s and
 * their `(click)="validateOrder(...)"` bindings are real DOM) plus one `.stub-row` per entry of
 * `[value]`, which is the `filteredResults` expression the pipe produces. It also carries an
 * `aria-sort` cell so `validateOrder()` sees a sorted table and flips `combine` to false.
 */
@Component({
  selector: 'app-pr-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <table>
      <ng-container *ngTemplateOutlet="headerTpl"></ng-container>
      <tr>
        <th id="sorted-col" aria-sort="ascending"></th>
      </tr>
      <tr class="stub-row" *ngFor="let row of value">
        <td>{{ row?.result_code }}</td>
      </tr>
    </table>
  `,
  schemas: [NO_ERRORS_SCHEMA]
})
class PrTableStubComponent {
  @Input() value: any[] = [];
  @ContentChildren(TemplateRef) templates: QueryList<TemplateRef<any>>;
  reset = jest.fn();

  get headerTpl(): TemplateRef<any> {
    return this.templates?.get(0);
  }
}

describe('ResultsListComponent (zoneless change detection)', () => {
  let component: ResultsListComponent;
  let fixture: ComponentFixture<ResultsListComponent>;

  const rowEls = () => fixture.nativeElement.querySelectorAll('.stub-row');
  const headerCell = (attr: string) => fixture.nativeElement.querySelector(`th[id="${attr}"]`) as HTMLElement;

  const wait = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  // Two phases of the same result: 1 row when combined, 2 rows when separated.
  const resultsList = [
    { result_code: 101, title: 'Phase 2024', submitter: 'INIT-01' },
    { result_code: 101, title: 'Phase 2025', submitter: 'INIT-01' }
  ];

  beforeEach(async () => {
    const apiMock = {
      shouldShowUpdate: jest.fn(),
      updateResultsList: jest.fn(),
      buildResultsListSearchParams: jest.fn(() => undefined),
      updateUserData: jest.fn(),
      resultsSE: {
        GET_reportingList: () => of({ response: [] }),
        GET_versioning: () => of({ response: [] }),
        GET_AllInitiatives: () => of({ response: [] }),
        GET_ClarisaPortfolios: () => of([]),
        GET_AllCLARISACenters: () => of({ response: [] }),
        GET_allResultStatuses: () => of({ response: [] }),
        ipsrDataControlSE: { inIpsr: false }
      },
      dataControlSE: {
        getCurrentPhases: jest.fn(() => of({})),
        reportingCurrentPhase: { phaseYear: 2025 },
        currentResult: {},
        currentResultSignal: signal({}),
        resultsListSignal: signal(resultsList),
        resultsListNoDataMessage: signal(''),
        myInitiativesList: [],
        myInitiativesListReportingByPortfolio: [],
        showShareRequest: false,
        chagePhaseModal: false
      },
      alertsFe: { show: jest.fn() },
      rolesSE: { isAdmin: false, platformIsClosed: false }
    };

    await TestBed.configureTestingModule({
      declarations: [ResultsListComponent, ResultsListFilterPipe],
      imports: [CommonModule, HttpClientTestingModule, PrTableStubComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: ShareRequestModalService, useValue: { inNotifications: true } },
        { provide: ResultLevelService, useValue: { removeResultTypes: jest.fn(), currentResultLevelIdSignal: signal(null) } },
        { provide: RetrieveModalService, useValue: { title: '' } },
        { provide: ExportTablesService, useValue: { exportExcel: jest.fn() } },
        { provide: ResultsListService, useValue: { showDeletingResultSpinner: false, showLoadingResultSpinner: false } },
        { provide: ResultsListFilterService, useValue: new ResultsListFilterService() },
        { provide: PhasesService, useValue: {} },
        { provide: ResultsNotificationsService, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('splits the merged rows after sorting by a column other than the result code', async () => {
    // Default state: `combine === true`, the two phases collapse into a single row.
    expect(component.combine).toBe(true);
    expect(rowEls().length).toBe(1);

    // Real flow: `(click)="validateOrder(column.attr)"` on the header cell.
    headerCell('title').click();
    await fixture.whenStable();

    await wait(300);

    expect(component.combine).toBe(false);
    // Fails without the fix: the flag flipped inside the timer but nothing repainted, so the list
    // kept showing the single merged row.
    expect(rowEls().length).toBe(2);
  }, 15000);

  it('merges the rows back when sorting returns to the result code column', async () => {
    headerCell('title').click();
    await wait(300);
    expect(rowEls().length).toBe(2);

    headerCell('result_code').click();
    await wait(300);

    expect(component.combine).toBe(true);
    expect(rowEls().length).toBe(1);
  }, 15000);
});
