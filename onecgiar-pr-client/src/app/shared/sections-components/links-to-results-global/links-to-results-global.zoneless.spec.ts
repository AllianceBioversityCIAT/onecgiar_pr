import { CommonModule } from '@angular/common';
import { Component, ContentChildren, Input, NO_ERRORS_SCHEMA, QueryList, TemplateRef, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { LinksToResultsGlobalComponent } from './links-to-results-global.component';
import { FilterResultNotLinkedPipe } from '../../../pages/results/pages/result-detail/pages/rd-links-to-results/pipe/filter-result-not-linked.pipe';
import { ApiService } from '../../services/api/api.service';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';
import { RolesService } from '../../services/global/roles.service';
import { GreenChecksService } from '../../services/global/green-checks.service';

/**
 * P2-3322 — zoneless change detection regression guard. Same shape as the ResultsListComponent case.
 *
 * `validateOrder()` runs from the table header but writes `combine` 100 ms later, once <app-pr-table> has
 * applied `aria-sort`. `combine` feeds the `filterResultNotLinked` pipe in five places, and it decides
 * whether phases sharing a `result_code` collapse into one row. As a plain field the delayed write notified
 * nothing, so under zoneless change detection sorting by any column other than the result code left the rows
 * merged. The flag is a component field, so it was made signal-backed.
 *
 * This test clicks the real header cell and asserts on the RENDERED rows, not on the flag.
 */

/**
 * Stub for <app-pr-table>: renders the real `prTableHeader` template (so the `th`s and their
 * `(click)="validateOrder(...)"` bindings are real DOM) plus one `.stub-row` per entry of `[value]`, which
 * is what the pipe produced. It also carries an `aria-sort` cell so `validateOrder()` sees a sorted table.
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
  @Input() paginator: any;
  @Input() rows: number;
  @Input() sortField: string;
  @Input() sortOrder: number;
  @Input() selectionMode: string;
  @Input() rowsPerPageOptions: number[];
  @ContentChildren(TemplateRef) templates: QueryList<TemplateRef<any>>;

  get headerTpl(): TemplateRef<any> {
    return this.templates?.get(0);
  }
}

describe('LinksToResultsGlobalComponent (zoneless change detection) — combine', () => {
  let component: LinksToResultsGlobalComponent;
  let fixture: ComponentFixture<LinksToResultsGlobalComponent>;

  const rowEls = () => fixture.nativeElement.querySelectorAll('.stub-row');
  const totalEl = () => fixture.nativeElement.querySelector('.total');
  const headerCell = (attr: string) => fixture.nativeElement.querySelector(`th[id="${attr}"]`) as HTMLElement;

  const wait = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  // Two phases of the same result: 1 row when combined, 2 rows when separated.
  const resultsList = [
    { id: 1, result_code: 101, title: 'Phase 2024', submitter: 'INIT-01', version_id: 1 },
    { id: 2, result_code: 101, title: 'Phase 2025', submitter: 'INIT-01', version_id: 2 }
  ];

  beforeEach(async () => {
    const apiMock = {
      updateResultsList: jest.fn(),
      resultsSE: {
        currentResultId: 99,
        GET_resultsLinked: () => of({ response: { links: [], legacy_link: [], linkedInnovation: {} } })
      },
      dataControlSE: {
        currentResultSectionName: signal(''),
        currentResult: { result_type_id: 5 },
        resultsList
      },
      rolesSE: { readOnly: true }
    };

    await TestBed.configureTestingModule({
      declarations: [LinksToResultsGlobalComponent, FilterResultNotLinkedPipe],
      imports: [CommonModule, PrTableStubComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: apiMock },
        { provide: ResultsListService, useValue: {} },
        { provide: RolesService, useValue: { readOnly: true } },
        { provide: GreenChecksService, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LinksToResultsGlobalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('starts with the two phases merged into a single row', () => {
    expect(component.combine).toBe(true);
    expect(rowEls().length).toBe(1);
    expect(totalEl().textContent).toContain('1');
  });

  it('splits the merged rows after sorting by a column other than the result code', async () => {
    // Real flow: `(click)="validateOrder(column.attr)"` on the header cell.
    headerCell('title').click();
    await fixture.whenStable();

    await wait(300);

    expect(component.combine).toBe(false);
    // The regression: the flag flipped inside the timer but nothing repainted, so the table kept
    // showing the single merged row.
    expect(rowEls().length).toBe(2);
    expect(totalEl().textContent).toContain('2');
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
