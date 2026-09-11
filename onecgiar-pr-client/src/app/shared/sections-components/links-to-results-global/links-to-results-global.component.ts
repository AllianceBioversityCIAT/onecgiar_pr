import { Component, OnInit, Input, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from '../../services/api/api.service';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';
import { LinksToResultsBody } from '../../../pages/results/pages/result-detail/pages/rd-links-to-results/models/linksToResultsBody';
import { RolesService } from '../../services/global/roles.service';
import { GreenChecksService } from '../../services/global/green-checks.service';
import { SectionDirtyTrackerService } from '../../services/unsaved-changes/section-dirty-tracker.service';

/**
 * `UCA-T-10` — this component is `rd-links-to-results`'s actual body/save owner (the routed
 * `RdLinksToResultsComponent` is a thin host — see `rd-links-to-results.component.html`), and is
 * ALSO reused, unmodified in behaviour, by `ipsr-link-to-results` (`@Input() isIpsr`).
 *
 * The dirty tracker (`hasUnsavedChanges()`/`saveSection()` below) lives here because this is the
 * component that owns `linksToResultsBody`, per `UCA-DD-1` — that part IS unavoidably shared with
 * IPSR, since the state lives here.
 *
 * `[appBeforeUnloadWarning]`, however, is NOT bound anywhere in this component's own template
 * (rework, attempt 2 — Issue 3): an earlier revision bound it on this component's template root,
 * which silently made `ipsr-link-to-results` — explicitly Out of Scope, `requirements.md` §3 — show
 * the native "leave site?" prompt too, an untested, unplanned scope-creep side effect. The binding
 * now lives on the Result-Detail HOST instead (`rd-links-to-results.component.html`, wrapping
 * `<app-links-to-results-global>`), which IPSR's own routed component does not render.
 *
 * `providers: [SectionDirtyTrackerService]` here (rather than on `RdLinksToResultsComponent`)
 * because this is the component that owns `linksToResultsBody`, per `UCA-DD-1`.
 */
@Component({
  selector: 'app-links-to-results-global',
  templateUrl: './links-to-results-global.component.html',
  styleUrls: ['./links-to-results-global.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class LinksToResultsGlobalComponent implements OnInit {
  @Input() isIpsr: boolean = false;
  linksToResultsBody = new LinksToResultsBody();
  text_to_search: string = '';
  counterPipe = 0;
  // P2-3322: signal-backed flag, same shape as the fix already applied to ResultsListComponent.
  // `validateOrder()` runs from the column headers' `(click)` but writes the flag 100 ms later inside a
  // `setTimeout`, once <app-pr-table> has applied `aria-sort`. The template feeds it to the
  // `filterResultNotLinked` pipe in five places (the table value, the paginator, the total and the empty
  // state), where it decides whether phases of the same result are merged into one row. As a plain field
  // the delayed write notified nothing, so under zoneless change detection sorting by any column other than
  // the result code left the rows merged. The public API stays a plain boolean, so the template, the pipe
  // and the existing specs are untouched.
  private readonly _combine = signal<boolean>(true);
  get combine(): boolean {
    return this._combine();
  }
  set combine(value: boolean) {
    this._combine.set(value);
  }
  columnOrder = [
    // { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    // { title: 'Reporting year', attr: 'reported_year' },
    { title: 'Phase', attr: 'phase_name' },
    { title: 'Indicator category', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Creation date	', attr: 'created_date' }
  ];

  filteredResults = [];

  innoDevLinks = [];
  innoUseLinks = [];

  constructor(
    public api: ApiService,
    public resultsListService: ResultsListService,
    public rolesSE: RolesService,
    public greenChecksSE: GreenChecksService,
    private readonly dirtyTracker: SectionDirtyTrackerService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Links to results');
  }

  ngOnInit(): void {
    this.api.updateResultsList();
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_resultsLinked(this.isIpsr).subscribe(({ response }) => {
      this.linksToResultsBody = response;

      const currentResultTypeId = this.api?.dataControlSE?.currentResult?.result_type_id;

      if (currentResultTypeId === 1) {
        const filterByResultTypeId = (resultTypeId: number) =>
          this.linksToResultsBody.links.filter((evidence: any) => evidence.result_type_id === resultTypeId);

        this.innoDevLinks = filterByResultTypeId(7);
        this.innoUseLinks = filterByResultTypeId(2);
        this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));

        this.linksToResultsBody.linkedInnovation.linked_innovation_dev = this.innoDevLinks.length > 0;
        this.linksToResultsBody.linkedInnovation.linked_innovation_use = this.innoUseLinks.length > 0;
      } else {
        this.filteredResults = this.linksToResultsBody.links;
      }

      // `UCA-T-10` — true end of the load flow: this single GET's `next` callback performs every
      // mutation to `linksToResultsBody` synchronously, right here (no secondary async call
      // mutates it afterward — verified by reading the full method body, unlike `UCA-T-6`'s
      // discontinued-options race). Safe to snapshot at this point.
      this.dirtyTracker.snapshot(this.linksToResultsBody);
    });
  }

  /** `UCA-T-10` — `CanComponentDeactivate.hasUnsavedChanges()`, delegated to by `RdLinksToResultsComponent`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.linksToResultsBody);
  }

  /**
   * `UCA-T-10` — `CanComponentDeactivate.saveSection()`, delegated to by `RdLinksToResultsComponent`.
   * Wraps `performSave()`'s exact `POST_resultsLinked` call (`UCA-DD-3`, no duplicated save logic)
   * to resolve `true`/`false` instead of void, for `UnsavedChangesGuard`.
   */
  saveSection(): Observable<boolean> {
    return this.performSave().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * `UCA-T-10`: returns the `POST_resultsLinked` `Observable` instead of self-subscribing, so both
   * this component's own Save action (`onSaveSection`, below) and `saveSection()` (the
   * `CanComponentDeactivate` contract, above) drive the exact same call and success branch — no
   * duplicated save logic (`UCA-DD-3`).
   */
  private performSave(): Observable<void> {
    return this.api.resultsSE.POST_resultsLinked(this.linksToResultsBody, this.isIpsr).pipe(
      tap(() => {
        // `UCA-T-10` — snapshot HERE, synchronously, the instant the POST resolves. Closes the
        // same class of race `UCA-T-6`'s rework fixed: `saveSection()`'s `map(() => true)` could
        // otherwise emit to `UnsavedChangesGuard` before the follow-up `getSectionInformation()`
        // below (its own async load-flow re-snapshot) resolves — or never resolve at all if that
        // reload fails.
        this.dirtyTracker.snapshot(this.linksToResultsBody);
        this.getSectionInformation();
      }),
      map(() => undefined)
    );
  }

  validateOrder(columnAttr) {
    setTimeout(() => {
      if (columnAttr == 'result_code') return (this.combine = true);
      const resultListTableHTML = document.getElementById('resultListTable');
      this.combine =
        !resultListTableHTML.querySelectorAll('th[aria-sort="descending"]').length &&
        !resultListTableHTML.querySelectorAll('th[aria-sort="ascending"]').length;

      return null;
    }, 100);
  }

  contributeDescription() {
    return `<ul>
      <li>To search for results that have already been reported, enter keywords into the title box below and click on the link button of the result found if it contributes to this result you are reporting.</li>
      <li>Users will be able to select other results from previous phase</li>
    </ul>`;
  }

  getFirstByDate(results) {
    const re = results.sort((a, b) => {
      return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
    });

    return re[0];
  }

  onLinkResult(result) {
    const currentResultTypeId = this.api?.dataControlSE?.currentResult?.result_type_id;
    const firstResultByDate = this.getFirstByDate(result.results);

    const { results, ...rest } = firstResultByDate;

    if (currentResultTypeId === 1) {
      switch (rest.result_type_id) {
        case 2:
          this.linksToResultsBody.linkedInnovation.linked_innovation_use = true;
          this.innoUseLinks.push(rest);
          this.linksToResultsBody.links.push(rest);
          this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));
          break;
        case 7:
          this.linksToResultsBody.linkedInnovation.linked_innovation_dev = true;
          this.innoDevLinks.push(rest);
          this.linksToResultsBody.links.push(rest);
          this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));
          break;
        default:
          this.linksToResultsBody.links.push(rest);
          this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));
          break;
      }
    } else {
      this.linksToResultsBody.links.push(rest);
      this.filteredResults = this.linksToResultsBody.links;
    }

    this.counterPipe++;
  }

  onRemove(result) {
    this.linksToResultsBody.links = this.linksToResultsBody.links.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.counterPipe++;

    const currentResultTypeId = this.api?.dataControlSE?.currentResult?.result_type_id;

    if (currentResultTypeId === 1) {
      this.filteredResults = this.linksToResultsBody.links.filter((evidence: any) => ![2, 7].includes(evidence.result_type_id));
    } else {
      this.filteredResults = this.linksToResultsBody.links;
    }
  }

  // New
  onRemoveInnoDev(result) {
    this.innoDevLinks = this.innoDevLinks.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.linksToResultsBody.linkedInnovation.linked_innovation_dev = this.innoDevLinks.length > 0;
    this.linksToResultsBody.links = this.linksToResultsBody.links.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.counterPipe++;
  }

  onRemoveInnoUse(result) {
    this.innoUseLinks = this.innoUseLinks.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.linksToResultsBody.linkedInnovation.linked_innovation_use = this.innoUseLinks.length > 0;
    this.linksToResultsBody.links = this.linksToResultsBody.links.filter((evidence: any) => evidence.result_code !== result.result_code);
    this.counterPipe++;
  }
  // New

  addLegacy_link() {
    this.linksToResultsBody.legacy_link.push({});
  }

  deleteLegacy_link(index) {
    this.linksToResultsBody.legacy_link.splice(index, 1);
  }

  onSaveSection() {
    this.performSave().subscribe();
  }

  openInNewPage(link) {
    window.open(link, '_blank');
  }

  results_portfolio_description() {
    const cgiar_innovation_dashboard_url =
      'https://results.cgiar.org/innovations?embed=true&hostOrigin=https%3A%2F%2Fwww.cgiar.org&displayNav=true&year=2020';
    const here_url = 'https://cgiar.sharepoint.com/:b:/s/ScalingReadiness/ESnzThAALolIrSwH95WSHAoBYiqsOM7DLXLSlyw4szpwWg?e=QFVg9L';
    return `If an innovation use result can be linked to a result that has been previously reported under CGIAR Research Programs (CRPs) and/or projects, and has been documented in the <a href='${cgiar_innovation_dashboard_url}' target="_blank" class='open_route'>CGIAR Innovation Dashboard</a> ,  a link to this result should be provided in the section ‘Results from previous portfolio’.
    <ul><li>Step-by-step guidance on how to browse the CGIAR Innovation Dashboard can be found  <a href='${here_url}' target="_blank" class='open_route'>here</a>.</li></ul>`;
  }

  get validateCGSpaceLinks() {
    for (const iterator of this.linksToResultsBody.legacy_link) {
      if (this.linksToResultsBody.legacy_link.find((evidence: any) => !Boolean(evidence.legacy_link))) return true;
      const evidencesFinded = this.linksToResultsBody.legacy_link.filter((evidence: any) => evidence.legacy_link == iterator.legacy_link);
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }
    return false;
  }
}
