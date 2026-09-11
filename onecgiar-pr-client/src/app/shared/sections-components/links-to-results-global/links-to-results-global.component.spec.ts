import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, NEVER } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LinksToResultsGlobalComponent } from './links-to-results-global.component';
import { ApiService } from '../../services/api/api.service';
import { ResultsListService } from '../../../pages/results/pages/results-outlet/pages/results-list/services/results-list.service';
import { RolesService } from '../../services/global/roles.service';
import { GreenChecksService } from '../../services/global/green-checks.service';
import { LinksToResultsBody } from '../../../pages/results/pages/result-detail/pages/rd-links-to-results/models/linksToResultsBody';
import { signal } from '@angular/core';
import { SectionDirtyTrackerService } from '../../services/unsaved-changes/section-dirty-tracker.service';

describe('LinksToResultsGlobalComponent', () => {
  let component: LinksToResultsGlobalComponent;
  let mockApiService: any;
  let mockResultsListService: any;
  let mockRolesService: any;
  let mockGreenChecksService: any;
  let dirtyTracker: SectionDirtyTrackerService;

  const mockLinksToResultsResponse = {
    links: [
      {
        result_code: 'R001',
        result_type_id: 1,
        title: 'Test Result 1',
        phase_name: 'Phase 1',
        result_type: 'Outcome',
        submitter: 'Test User',
        status_name: 'Complete',
        created_date: '2024-01-01'
      },
      {
        result_code: 'R002',
        result_type_id: 7,
        title: 'Innovation Dev Result',
        phase_name: 'Phase 1',
        result_type: 'Innovation Development',
        submitter: 'Test User 2',
        status_name: 'Complete',
        created_date: '2024-01-02'
      },
      {
        result_code: 'R003',
        result_type_id: 2,
        title: 'Innovation Use Result',
        phase_name: 'Phase 1',
        result_type: 'Innovation Use',
        submitter: 'Test User 3',
        status_name: 'Complete',
        created_date: '2024-01-03'
      }
    ],
    linkedInnovation: {
      linked_innovation_dev: false,
      linked_innovation_use: false
    },
    legacy_link: []
  };

  beforeEach(() => {
    mockApiService = {
      updateResultsList: jest.fn(),
      resultsSE: {
        GET_resultsLinked: jest.fn().mockReturnValue(of({ response: mockLinksToResultsResponse })),
        POST_resultsLinked: jest.fn().mockReturnValue(of({}))
      },
      dataControlSE: {
        currentResultSectionName: signal<string>('Links to results'),
        currentResult: {
          result_type_id: 1
        }
      },
      rolesSE: {
        readOnly: false
      }
    };

    mockResultsListService = {};
    mockRolesService = { readOnly: false };
    mockGreenChecksService = {};

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultsListService, useValue: mockResultsListService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: GreenChecksService, useValue: mockGreenChecksService }
      ]
    });

    // Create component instance directly without fixture to avoid template rendering
    dirtyTracker = new SectionDirtyTrackerService();
    component = new LinksToResultsGlobalComponent(mockApiService, mockResultsListService, mockRolesService, mockGreenChecksService, dirtyTracker);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component with default values', () => {
    expect(component.isIpsr).toBe(false);
    expect(component.text_to_search).toBe('');
    expect(component.counterPipe).toBe(0);
    expect(component.combine).toBe(true);
    expect(component.filteredResults).toEqual([]);
    expect(component.innoDevLinks).toEqual([]);
    expect(component.innoUseLinks).toEqual([]);
  });

  it('should have correct column order configuration', () => {
    expect(component.columnOrder).toEqual([
      { title: 'Title', attr: 'title', class: 'notCenter' },
      { title: 'Phase', attr: 'phase_name' },
      { title: 'Indicator category', attr: 'result_type' },
      { title: 'Submitter', attr: 'submitter' },
      { title: 'Status', attr: 'status_name' },
      { title: 'Creation date	', attr: 'created_date' }
    ]);
  });

  describe('ngOnInit', () => {
    it('should call initialization methods', () => {
      jest.spyOn(component, 'getSectionInformation');

      component.ngOnInit();

      expect(mockApiService.updateResultsList).toHaveBeenCalled();
      expect(component.getSectionInformation).toHaveBeenCalled();
    });
  });

  describe('getSectionInformation', () => {
    it('should fetch and process section information for result type 1', () => {
      component.getSectionInformation();

      expect(mockApiService.resultsSE.GET_resultsLinked).toHaveBeenCalledWith(false);
      expect(component.linksToResultsBody).toEqual(mockLinksToResultsResponse);
      expect(component.innoDevLinks.length).toBe(1);
      expect(component.innoUseLinks.length).toBe(1);
      expect(component.filteredResults.length).toBe(1); // Only results that are not type 2 or 7
    });

    it('should process section information for non-type-1 results', () => {
      mockApiService.dataControlSE.currentResult.result_type_id = 3;

      component.getSectionInformation();

      expect(component.filteredResults).toEqual(mockLinksToResultsResponse.links);
    });

    it('should handle IPSR mode', () => {
      component.isIpsr = true;

      component.getSectionInformation();

      expect(mockApiService.resultsSE.GET_resultsLinked).toHaveBeenCalledWith(true);
    });
  });

  describe('validateOrder', () => {
    let mockElement: HTMLElement;

    beforeEach(() => {
      mockElement = document.createElement('table');
      mockElement.id = 'resultListTable';
      document.body.appendChild(mockElement);
    });

    afterEach(() => {
      if (mockElement && mockElement.parentNode) {
        document.body.removeChild(mockElement);
      }
    });

    it('should set combine to true when columnAttr is "result_code"', fakeAsync(() => {
      component.validateOrder('result_code');

      tick(150);
      expect(component.combine).toBe(true);
    }));

    it('should set combine to true when there are no sorted columns', fakeAsync(() => {
      component.validateOrder('other_attr');

      tick(150);
      expect(component.combine).toBe(true);
    }));

    it('should set combine to false when there are sorted columns', fakeAsync(() => {
      const mockTh = document.createElement('th');
      mockTh.setAttribute('aria-sort', 'ascending');
      mockElement.appendChild(mockTh);

      component.validateOrder('title');

      tick(150);
      expect(component.combine).toBe(false);
    }));
  });

  describe('contributeDescription', () => {
    it('should return the correct HTML string', () => {
      const expectedHTML = `<ul>
      <li>To search for results that have already been reported, enter keywords into the title box below and click on the link button of the result found if it contributes to this result you are reporting.</li>
      <li>Users will be able to select other results from previous phase</li>
    </ul>`;

      const result = component.contributeDescription();

      expect(result).toEqual(expectedHTML);
    });
  });

  describe('getFirstByDate', () => {
    it('should return the result with the most recent date', () => {
      const results = [{ created_date: '2022-01-01' }, { created_date: '2022-01-03' }, { created_date: '2022-01-02' }];

      const result = component.getFirstByDate(results);

      expect(result).toEqual({ created_date: '2022-01-03' });
    });

    it('should handle empty array', () => {
      const results: any[] = [];

      const result = component.getFirstByDate(results);

      expect(result).toBeUndefined();
    });
  });

  describe('onLinkResult', () => {
    beforeEach(() => {
      component.linksToResultsBody = new LinksToResultsBody();
      component.innoDevLinks = [];
      component.innoUseLinks = [];
      component.filteredResults = [];
    });

    it('should link innovation use result for result type 1', () => {
      const mockResult = {
        results: [
          {
            result_code: 'R004',
            result_type_id: 2,
            title: 'Innovation Use Test',
            created_date: '2024-01-01'
          }
        ]
      };

      component.onLinkResult(mockResult);

      expect(component.linksToResultsBody.linkedInnovation.linked_innovation_use).toBe(true);
      expect(component.innoUseLinks.length).toBe(1);
      expect(component.linksToResultsBody.links.length).toBe(1);
      expect(component.counterPipe).toBe(1);
    });

    it('should link innovation dev result for result type 1', () => {
      const mockResult = {
        results: [
          {
            result_code: 'R005',
            result_type_id: 7,
            title: 'Innovation Dev Test',
            created_date: '2024-01-01'
          }
        ]
      };

      component.onLinkResult(mockResult);

      expect(component.linksToResultsBody.linkedInnovation.linked_innovation_dev).toBe(true);
      expect(component.innoDevLinks.length).toBe(1);
      expect(component.linksToResultsBody.links.length).toBe(1);
      expect(component.counterPipe).toBe(1);
    });

    it('should link other result types for result type 1', () => {
      const mockResult = {
        results: [
          {
            result_code: 'R006',
            result_type_id: 3,
            title: 'Other Result Test',
            created_date: '2024-01-01'
          }
        ]
      };

      component.onLinkResult(mockResult);

      expect(component.linksToResultsBody.links.length).toBe(1);
      expect(component.filteredResults.length).toBe(1);
      expect(component.counterPipe).toBe(1);
    });

    it('should link result for non-type-1 current result', () => {
      mockApiService.dataControlSE.currentResult.result_type_id = 3;
      const mockResult = {
        results: [
          {
            result_code: 'R007',
            result_type_id: 1,
            title: 'Regular Result Test',
            created_date: '2024-01-01'
          }
        ]
      };

      component.onLinkResult(mockResult);

      expect(component.linksToResultsBody.links.length).toBe(1);
      expect(component.filteredResults).toEqual(component.linksToResultsBody.links);
      expect(component.counterPipe).toBe(1);
    });
  });

  describe('onRemove', () => {
    beforeEach(() => {
      component.linksToResultsBody = new LinksToResultsBody();
      component.linksToResultsBody.links = [
        { result_code: 'R001', result_type: 'Outcome' },
        { result_code: 'R002', result_type: 'Other' }
      ];
    });

    it('should remove result from links for result type 1', () => {
      const resultToRemove = { result_code: 'R001' };

      component.onRemove(resultToRemove);

      expect(component.linksToResultsBody.links.length).toBe(1);
      expect(component.linksToResultsBody.links[0].result_code).toBe('R002');
      expect(component.counterPipe).toBe(1);
    });

    it('should remove result from links for non-type-1 current result', () => {
      mockApiService.dataControlSE.currentResult.result_type_id = 3;
      const resultToRemove = { result_code: 'R001' };

      component.onRemove(resultToRemove);

      expect(component.linksToResultsBody.links.length).toBe(1);
      expect(component.filteredResults).toEqual(component.linksToResultsBody.links);
      expect(component.counterPipe).toBe(1);
    });
  });

  describe('onRemoveInnoDev', () => {
    beforeEach(() => {
      component.innoDevLinks = [{ result_code: 'R001' }, { result_code: 'R002' }];
      component.linksToResultsBody = new LinksToResultsBody();
      component.linksToResultsBody.links = [{ result_code: 'R001' }, { result_code: 'R002' }];
    });

    it('should remove innovation dev result', () => {
      const resultToRemove = { result_code: 'R001' };

      component.onRemoveInnoDev(resultToRemove);

      expect(component.innoDevLinks.length).toBe(1);
      expect(component.innoDevLinks[0].result_code).toBe('R002');
      expect(component.linksToResultsBody.linkedInnovation.linked_innovation_dev).toBe(true);
      expect(component.linksToResultsBody.links.length).toBe(1);
      expect(component.counterPipe).toBe(1);
    });

    it('should set linked_innovation_dev to false when no more dev links', () => {
      component.innoDevLinks = [{ result_code: 'R001' }];
      const resultToRemove = { result_code: 'R001' };

      component.onRemoveInnoDev(resultToRemove);

      expect(component.innoDevLinks.length).toBe(0);
      expect(component.linksToResultsBody.linkedInnovation.linked_innovation_dev).toBe(false);
    });
  });

  describe('onRemoveInnoUse', () => {
    beforeEach(() => {
      component.innoUseLinks = [{ result_code: 'R001' }, { result_code: 'R002' }];
      component.linksToResultsBody = new LinksToResultsBody();
      component.linksToResultsBody.links = [{ result_code: 'R001' }, { result_code: 'R002' }];
    });

    it('should remove innovation use result', () => {
      const resultToRemove = { result_code: 'R001' };

      component.onRemoveInnoUse(resultToRemove);

      expect(component.innoUseLinks.length).toBe(1);
      expect(component.innoUseLinks[0].result_code).toBe('R002');
      expect(component.linksToResultsBody.linkedInnovation.linked_innovation_use).toBe(true);
      expect(component.linksToResultsBody.links.length).toBe(1);
      expect(component.counterPipe).toBe(1);
    });

    it('should set linked_innovation_use to false when no more use links', () => {
      component.innoUseLinks = [{ result_code: 'R001' }];
      const resultToRemove = { result_code: 'R001' };

      component.onRemoveInnoUse(resultToRemove);

      expect(component.innoUseLinks.length).toBe(0);
      expect(component.linksToResultsBody.linkedInnovation.linked_innovation_use).toBe(false);
    });
  });

  describe('addLegacy_link', () => {
    it('should add empty object to legacy_link array', () => {
      component.linksToResultsBody = new LinksToResultsBody();
      component.linksToResultsBody.legacy_link = [];

      component.addLegacy_link();

      expect(component.linksToResultsBody.legacy_link.length).toBe(1);
      expect(component.linksToResultsBody.legacy_link[0]).toEqual({});
    });
  });

  describe('deleteLegacy_link', () => {
    it('should remove legacy link at specified index', () => {
      component.linksToResultsBody = new LinksToResultsBody();
      component.linksToResultsBody.legacy_link = [{ legacy_link: 'link1' }, { legacy_link: 'link2' }, { legacy_link: 'link3' }];

      component.deleteLegacy_link(1);

      expect(component.linksToResultsBody.legacy_link.length).toBe(2);
      expect(component.linksToResultsBody.legacy_link[0].legacy_link).toBe('link1');
      expect(component.linksToResultsBody.legacy_link[1].legacy_link).toBe('link3');
    });
  });

  describe('onSaveSection', () => {
    it('should save section and refresh data', () => {
      component.linksToResultsBody = mockLinksToResultsResponse;
      jest.spyOn(component, 'getSectionInformation');

      component.onSaveSection();

      expect(mockApiService.resultsSE.POST_resultsLinked).toHaveBeenCalledWith(component.linksToResultsBody, component.isIpsr);
      expect(component.getSectionInformation).toHaveBeenCalled();
    });
  });

  /**
   * `UCA-T-10` — `CanComponentDeactivate` wiring, delegated to by `RdLinksToResultsComponent`
   * (see `rd-links-to-results.component.ts`). `SectionDirtyTrackerService` is component-scoped
   * (`providers: [SectionDirtyTrackerService]`), so each test constructs its own fresh instance
   * (`dirtyTracker`, see `beforeEach` above) — no cross-test snapshot leakage.
   *
   * Deliberately NOT reusing the file-level `mockLinksToResultsResponse` — several tests above
   * mutate it (or objects derived from it) in place across the file's run order. Local literals
   * here stay reliably distinct regardless of suite order, same precedent as `UCA-T-6`'s rework.
   *
   * Load/save timing assertions use a genuine async boundary (`delay(0)` + `fakeAsync`/`tick()`),
   * never a synchronous mock, per `UCA-T-6`'s attempt-1 FAIL lesson — even though this component's
   * `getSectionInformation()` load flow has no secondary async mutation (unlike `UCA-T-6`'s
   * discontinued-options race), so a synchronous mock would not currently mask anything; using the
   * async boundary anyway guards against a future regression reintroducing a similar race.
   */
  describe('CanComponentDeactivate (UCA-T-10)', () => {
    const freshLinksResponse = () => ({
      links: [{ result_code: 'R100', result_type_id: 3, title: 'Local fixture result' }],
      linkedInnovation: { linked_innovation_dev: false, linked_innovation_use: false },
      legacy_link: []
    });

    beforeEach(() => {
      mockApiService.dataControlSE.currentResult.result_type_id = 3;
      mockApiService.resultsSE.GET_resultsLinked = jest.fn(() => of({ response: freshLinksResponse() }).pipe(delay(0)));
    });

    it('is false right after the load flow genuinely completes', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      expect(component.hasUnsavedChanges()).toBe(false);
    }));

    it('is true after editing the bound body', fakeAsync(() => {
      component.getSectionInformation();
      tick();

      component.linksToResultsBody.legacy_link.push({ legacy_link: 'https://example.com' });

      expect(component.hasUnsavedChanges()).toBe(true);
    }));

    /**
     * Falsifying input: snapshotting only once (at load) and never again after a successful save
     * would report `true` here. The follow-up reload triggered inside `performSave()`'s `tap`
     * (`getSectionInformation()`) is forced to NEVER resolve (`NEVER`, not `throwError`) — this
     * component's `getSectionInformation()` subscribe has no `error:` handler at all (unlike
     * `UCA-T-6`'s `rd-general-information`), so an actually-erroring reload would escape as an
     * unhandled exception instead of exercising the code path this test targets; making it hang
     * proves the same point (the reload's own re-snapshot never runs) without depending on that
     * pre-existing, out-of-scope gap. This can only pass because of the DIRECT
     * `dirtyTracker.snapshot(...)` call in `performSave()`'s `tap`, not the reload's own re-snapshot.
     */
    it('is false right when saveSection() emits true, even when the follow-up reload never resolves', fakeAsync(() => {
      component.getSectionInformation();
      tick();
      component.linksToResultsBody.legacy_link.push({ legacy_link: 'https://example.com' });
      expect(component.hasUnsavedChanges()).toBe(true);

      mockApiService.resultsSE.GET_resultsLinked.mockReturnValue(NEVER);

      let sawTrue = false;
      component.saveSection().subscribe(result => {
        sawTrue = result === true;
        expect(component.hasUnsavedChanges()).toBe(false);
      });
      tick();

      expect(sawTrue).toBe(true);
    }));

    it('saveSection() resolves false (not throws) on a failing POST_resultsLinked, without reloading the section', fakeAsync(() => {
      component.getSectionInformation();
      tick();
      const reloadSpy = jest.spyOn(component, 'getSectionInformation');
      mockApiService.resultsSE.POST_resultsLinked = jest.fn(() => throwError(() => new Error('save failed')));

      let result: boolean | undefined;
      let errored = false;
      component.saveSection().subscribe({
        next: value => (result = value),
        error: () => (errored = true)
      });
      tick();

      expect(errored).toBe(false);
      expect(result).toBe(false);
      expect(reloadSpy).not.toHaveBeenCalled();
    }));
  });

  describe('openInNewPage', () => {
    it('should open link in new page', () => {
      const mockWindowOpen = jest.spyOn(window, 'open').mockImplementation();
      const testLink = 'https://example.com';

      component.openInNewPage(testLink);

      expect(mockWindowOpen).toHaveBeenCalledWith(testLink, '_blank');
      mockWindowOpen.mockRestore();
    });
  });

  describe('results_portfolio_description', () => {
    it('should return the correct HTML description', () => {
      const result = component.results_portfolio_description();

      expect(result).toContain('CGIAR Innovation Dashboard');
      expect(result).toContain('results.cgiar.org');
      expect(result).toContain('cgiar.sharepoint.com');
      expect(result).toContain('Step-by-step guidance');
    });
  });

  describe('validateCGSpaceLinks', () => {
    beforeEach(() => {
      component.linksToResultsBody = new LinksToResultsBody();
    });

    it('should return true if any legacy link is empty', () => {
      component.linksToResultsBody.legacy_link = [{ legacy_link: 'valid-link' }, { legacy_link: '' }, { legacy_link: 'another-valid-link' }];

      const result = component.validateCGSpaceLinks;

      expect(result).toBe(true);
    });

    it('should return true if there are duplicate legacy links', () => {
      component.linksToResultsBody.legacy_link = [
        { legacy_link: 'duplicate-link' },
        { legacy_link: 'unique-link' },
        { legacy_link: 'duplicate-link' }
      ];

      const result = component.validateCGSpaceLinks;

      expect(result).toBe(true);
    });

    it('should return false if all legacy links are valid and unique', () => {
      component.linksToResultsBody.legacy_link = [
        { legacy_link: 'unique-link-1' },
        { legacy_link: 'unique-link-2' },
        { legacy_link: 'unique-link-3' }
      ];

      const result = component.validateCGSpaceLinks;

      expect(result).toBe(false);
    });

    it('should return false if no legacy links exist', () => {
      component.linksToResultsBody.legacy_link = [];

      const result = component.validateCGSpaceLinks;

      expect(result).toBe(false);
    });

    it('should handle null/undefined legacy_link values', () => {
      component.linksToResultsBody.legacy_link = [{ legacy_link: 'valid-link' }, { legacy_link: null }, { legacy_link: undefined }];

      const result = component.validateCGSpaceLinks;

      expect(result).toBe(true);
    });
  });

  describe('Input properties', () => {
    it('should handle isIpsr input property', () => {
      component.isIpsr = true;

      expect(component.isIpsr).toBe(true);
    });
  });

  describe('Component state management', () => {
    it('should increment counterPipe when linking results', () => {
      component.counterPipe = 0;
      const mockResult = {
        results: [
          {
            result_code: 'R004',
            result_type_id: 1,
            title: 'Test Result',
            created_date: '2024-01-01'
          }
        ]
      };

      component.onLinkResult(mockResult);

      expect(component.counterPipe).toBe(1);
    });

    it('should manage text_to_search property', () => {
      component.text_to_search = 'test search';

      expect(component.text_to_search).toBe('test search');
    });
  });
});
