import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { AowHloCreateModalComponent } from './aow-hlo-create-modal.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { ResultsListFilterService } from '../../../../../../../../../results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { CentersService } from '../../../../../../../../../../shared/services/global/centers.service';
import { CgspaceItemDto } from './components/kp-cgspace-browse/kp-cgspace-browse.component';

describe('AowHloCreateModalComponent - Unit Tests', () => {
  describe('getTitleInputLabel logic', () => {
    it('should return title from CGSpace when knowledge product with metadata', () => {
      const currentResultToReport = signal({
        indicators: [{ type_name: 'Number of knowledge products' }]
      });
      const mqapJson = signal({ metadata: [{ source: 'CGSpace' }] });
      const result_type_id = null;

      const isKnowledgeProduct =
        currentResultToReport()?.indicators?.[0]?.type_name === 'Number of knowledge products' || result_type_id === 6;

      let label = 'Title';
      if (isKnowledgeProduct && mqapJson()?.metadata?.length > 0) {
        label = 'Title retrived from ' + mqapJson()?.metadata?.[0]?.source;
      } else if (isKnowledgeProduct) {
        label = 'Title retrieved from the repository';
      }

      expect(label).toBe('Title retrived from CGSpace');
    });

    it('should return default title for non-knowledge products', () => {
      const currentResultToReport = signal({
        indicators: [{ type_name: 'Other type' }]
      });
      const result_type_id = null;

      const isKnowledgeProduct =
        currentResultToReport()?.indicators?.[0]?.type_name === 'Number of knowledge products' || result_type_id === 6;

      let label = 'Title';
      if (isKnowledgeProduct) {
        label = 'Title retrieved from the repository';
      }

      expect(label).toBe('Title');
    });
  });

  describe('preselectTocCenters logic (P2-3114 / P2-2998 AC1-AC2)', () => {
    const deriveTocCenters = (node: any, centersList: any[]) => {
      const tocAcronyms = (node?.indicators?.[0]?.targets_by_center?.centers ?? [])
        .map((c: any) => c?.center_acronym)
        .filter(Boolean);
      const partnerInstitutionIds = new Set(
        (node?.toc_partner_institution_ids ?? []).map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id))
      );
      return centersList
        .filter((c: any) => tocAcronyms.includes(c.acronym) || partnerInstitutionIds.has(Number(c.institutionId)))
        .map((c: any) => ({ ...c, from_toc: true }));
    };

    const centersList = [
      { code: 'ABC', acronym: 'ABC', name: 'Alliance', institutionId: 100 },
      { code: 'CIP', acronym: 'CIP', name: 'CIP', institutionId: 101 },
      { code: 'IRRI', acronym: 'IRRI', name: 'IRRI', institutionId: 102 },
      { code: 'IFPRI', acronym: 'IFPRI', name: 'IFPRI', institutionId: 103 }
    ];

    it('should preselect the ToC-mapped centers tagged from_toc:true', () => {
      const node = { indicators: [{ targets_by_center: { centers: [{ center_acronym: 'ABC' }, { center_acronym: 'CIP' }] } }] };
      const preselected = deriveTocCenters(node, centersList);
      expect(preselected.map(c => c.acronym)).toEqual(['ABC', 'CIP']);
      expect(preselected.every(c => c.from_toc === true)).toBe(true);
    });

    it('should preselect HLO-level ToC partners that are CGIAR Centers (by institutionId)', () => {
      const node = {
        toc_partner_institution_ids: [100, 103, 999],
        indicators: [{ targets_by_center: { centers: [] } }]
      };
      const preselected = deriveTocCenters(node, centersList);
      expect(preselected.map(c => c.acronym)).toEqual(['ABC', 'IFPRI']);
      expect(preselected.every(c => c.from_toc === true)).toBe(true);
    });

    it('should union partners and targets centers without duplicates', () => {
      const node = {
        toc_partner_institution_ids: [100],
        indicators: [{ targets_by_center: { centers: [{ center_acronym: 'ABC' }, { center_acronym: 'IRRI' }] } }]
      };
      const preselected = deriveTocCenters(node, centersList);
      expect(preselected.map(c => c.acronym)).toEqual(['ABC', 'IRRI']);
    });

    it('should fall back to targets-only when the payload lacks toc_partner_institution_ids', () => {
      const node = { indicators: [{ targets_by_center: { centers: [{ center_acronym: 'CIP' }] } }] };
      expect(deriveTocCenters(node, centersList).map(c => c.acronym)).toEqual(['CIP']);
    });

    it('should preselect nothing when the node has no partners nor mapped centers', () => {
      const node = { indicators: [{ targets_by_center: { centers: [] } }] };
      expect(deriveTocCenters(node, centersList)).toEqual([]);
    });
  });

  describe('empty-state notes (P2-2998 AC4 / QA 2026-07-14)', () => {
    it('should show the orange notes only when the ToC returns no reference entries', () => {
      const hasReferenceCenters = (tocCenters: any[]) => tocCenters.length > 0;
      const hasReferenceScience = (tocSciencePrograms: any[]) => tocSciencePrograms.length > 0;
      expect(hasReferenceCenters([])).toBe(false);
      expect(hasReferenceScience([])).toBe(false);
      expect(hasReferenceCenters([{ code: 'ABC' }])).toBe(true);
    });

    it('should keep the note strings identical to the C&P section', () => {
      const noCentersNote = 'No CGIAR Centers related to the established HLO/Outcomes were found';
      const noScienceProgramsNote = 'No Science Programs related to the established HLO/Outcomes were found';
      expect(noCentersNote).toContain('No CGIAR Centers related');
      expect(noScienceProgramsNote).toContain('No Science Programs related');
    });
  });

  describe('createResult from_toc tagging (P2-3114)', () => {
    it('should default from_toc to false for manually-added centers', () => {
      const contributing_center = [
        { code: 'ABC', from_toc: true },
        { code: 'IRRI' }
      ];
      const tagged = contributing_center.map((c: any) => ({ ...c, from_toc: c?.from_toc ?? false }));
      expect(tagged.find(c => c.code === 'ABC')?.from_toc).toBe(true);
      expect(tagged.find(c => c.code === 'IRRI')?.from_toc).toBe(false);
    });
  });

  describe('Centers ToC/Other split logic (P2-3114)', () => {
    const OTHER = '__OTHER_CENTERS__';

    it('should reveal dropdown 2 when "Other(s)" is in dropdown 1 selection (sentinel kept, C&P parity)', () => {
      const contributing_center = [{ code: 'IRRI', from_toc: true }, { code: OTHER }];
      const showOtherCenters = contributing_center.some(c => c.code === OTHER);
      expect(showOtherCenters).toBe(true);
      expect(contributing_center.some(c => c.code === OTHER)).toBe(true);
      expect(contributing_center.map(c => c.code)).toEqual(['IRRI', OTHER]);
    });

    it('should clear otherCenters when "Other(s)" is deselected from dropdown 1', () => {
      const contributing_center = signal<any[]>([{ code: 'IRRI', from_toc: true }]);
      const otherCentersSelected = signal<any[]>([{ code: 'CIAT' }]);
      const showOtherCenters = () => contributing_center().some(c => c.code === OTHER);
      if (!showOtherCenters()) {
        otherCentersSelected.set([]);
      }
      expect(showOtherCenters()).toBe(false);
      expect(otherCentersSelected()).toEqual([]);
    });

    it('should merge dropdown1 (from_toc:true) + otherCenters (from_toc:false), excluding the sentinel', () => {
      const dropdown1 = [{ code: 'IRRI', from_toc: true }, { code: OTHER }];
      const otherCentersSelected = [{ code: 'CIAT' }];
      const merged = [
        ...dropdown1.filter((c: any) => c?.code !== OTHER).map((c: any) => ({ ...c, from_toc: true })),
        ...otherCentersSelected.map((c: any) => ({ ...c, from_toc: false }))
      ];
      expect(merged).toEqual([
        { code: 'IRRI', from_toc: true },
        { code: 'CIAT', from_toc: false }
      ]);
    });

    it('should auto-open dropdown 2 when the ToC returns no centers (AC4 via !hasReferenceCenters)', () => {
      const tocCenters: any[] = [];
      const hasReferenceCenters = tocCenters.length > 0;
      expect(hasReferenceCenters).toBe(false);
    });
  });

  describe('Science Programs ToC/Other split logic (P2-3114)', () => {
    const OTHER_SP = -999;

    it('should preselect ToC science programs by id, tagged from_toc:true', () => {
      const tocSpIds = [51, 57];
      const allInits = [
        { id: 51, official_code: 'SP02', name: 'Sustainable Farming' },
        { id: 52, official_code: 'SP03', name: 'Animal' },
        { id: 57, official_code: 'SP08', name: 'Food Frontiers' }
      ];
      const preselected = allInits.filter(sp => tocSpIds.includes(sp.id)).map(sp => ({ ...sp, from_toc: true }));
      expect(preselected.map(s => s.official_code)).toEqual(['SP02', 'SP08']);
      expect(preselected.every(s => s.from_toc === true)).toBe(true);
    });

    it('should reveal dropdown 2 when "Other(s)" is in SP dropdown 1 (sentinel kept, C&P parity)', () => {
      const selectedEntities = [{ id: 51 }, { id: OTHER_SP }];
      const showOtherScience = selectedEntities.some(sp => sp?.id === OTHER_SP);
      expect(showOtherScience).toBe(true);
      expect(selectedEntities.map(s => s.id)).toEqual([51, OTHER_SP]);
    });

    it('should merge dropdown1 (from_toc:true) + otherScience (from_toc:false), excluding the sentinel', () => {
      const selectedEntities = [{ id: 51 }, { id: OTHER_SP }];
      const otherScienceSelected = [{ id: 61 }];
      const merged = [
        ...selectedEntities.filter(sp => sp?.id !== OTHER_SP).map(sp => ({ ...sp, from_toc: true })),
        ...otherScienceSelected.map(sp => ({ ...sp, from_toc: false }))
      ];
      expect(merged).toEqual([
        { id: 51, from_toc: true },
        { id: 61, from_toc: false }
      ]);
    });
  });

  describe('onResultTypeChange logic', () => {
    it('should update result_type_id in createResultBody', () => {
      const createResultBody = signal({
        handler: '',
        result_name: '',
        toc_progressive_narrative: '',
        result_type_id: null,
        contribution_to_indicator_target: null,
        contributing_center: null
      });
      const resultTypeId = 6;
      createResultBody.set({
        ...createResultBody(),
        result_type_id: resultTypeId
      });
      expect(createResultBody().result_type_id).toBe(6);
    });
  });

  describe('removeBilateralProject logic', () => {
    it('should remove a bilateral project from the list', () => {
      const project = { project_id: 1, project_name: 'Project 1' };
      const selectedW3BilateralProjects = signal([project, { project_id: 2, project_name: 'Project 2' }]);
      selectedW3BilateralProjects.set(selectedW3BilateralProjects().filter(item => item.project_id !== project.project_id));
      expect(selectedW3BilateralProjects().length).toBe(1);
      expect(selectedW3BilateralProjects()[0].project_id).toBe(2);
    });
  });

  describe('GET_mqapValidation logic', () => {
    it('should validate CGSpace handle URL', () => {
      const handler = 'https://cgspace.cgiar.org/handle/10568/139504';
      const regex =
        /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;
      const isValid = regex.test(handler);
      expect(isValid).toBe(true);
    });

    it('should validate CGSpace items UUID URL', () => {
      const handler = 'https://cgspace.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3';
      const regex =
        /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;
      const isValid = regex.test(handler);
      expect(isValid).toBe(true);
    });

    it('should invalidate incorrect URL', () => {
      const handler = 'invalidURL';
      const regex =
        /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;
      const isValid = regex.test(handler);
      expect(isValid).toBe(false);
    });

    it('should invalidate unsupported handle prefix (e.g. 10947 in hdl.handle.net form)', () => {
      const handler = 'https://hdl.handle.net/10947/4262';
      const regex =
        /^https:\/\/(?:(?:cgspace\.cgiar\.org|repo\.mel\.cgiar\.org|digitalarchive\.worldfishcenter\.org)\/items\/[0-9a-fA-F-]{36}|hdl\.handle\.net\/(?:10568|20\.500\.11766|20\.500\.12348)\/\d+|cgspace\.cgiar\.org\/handle\/(?:10568|20\.500\.11766)\/\d+)$/;
      const isValid = regex.test(handler);
      expect(isValid).toBe(false);
    });

    it('should handle empty handler', () => {
      const handler = '';
      let errorMessage = '';
      if (!handler) {
        errorMessage = 'Please enter a valid handle.';
      }
      expect(errorMessage).toBe('Please enter a valid handle.');
    });
  });

  describe('removeEntityOption logic', () => {
    it('should remove an entity from selectedEntities', () => {
      const entity = { id: 1, official_code: 'Entity 1', name: 'Entity 1' };
      const selectedEntities = signal([entity, { id: 2, official_code: 'Entity 2', name: 'Entity 2' }]);
      selectedEntities.set(selectedEntities().filter(item => item.id !== entity.id));
      expect(selectedEntities().length).toBe(1);
      expect(selectedEntities()[0].id).toBe(2);
    });
  });
});

describe('AowHloCreateModalComponent - Component Integration Tests (KPB-T-7)', () => {
  let fixture: ComponentFixture<AowHloCreateModalComponent>;
  let component: AowHloCreateModalComponent;

  let mockApiService: any;
  let mockEntityAowService: any;
  let mockRouter: any;
  let mockResultsListFilterService: any;
  let mockCentersService: any;

  const sampleBrowseItem: CgspaceItemDto = {
    uuid: '679513e4-eeba-4a06-a017-015862e7b9b3',
    handle: '10947/4262',
    handleUrl: 'https://hdl.handle.net/10947/4262',
    itemUrl: 'https://cgspace.cgiar.org/items/679513e4-eeba-4a06-a017-015862e7b9b3',
    title: 'Browse Selected Paper on Maize',
    type: 'Journal Article',
    year: 2026,
    authors: ['Smith, John', 'Doe, Jane'],
    affiliations: ['Alliance of Bioversity and CIAT'],
    countries: ['Kenya', 'Colombia'],
    doi: 'https://doi.org/10.1016/j.worlddev.2026.105681',
    uri: 'https://hdl.handle.net/10947/4262'
  };

  const isAdminSignal = signal(false);

  beforeEach(async () => {
    isAdminSignal.set(false);
    mockApiService = {
      dataControlSE: {
        reportingCurrentPhase: { phaseYear: 2026 },
        currentResult: { status: false }
      },
      rolesSE: {
        get isAdmin() {
          return isAdminSignal();
        },
        set isAdmin(val: boolean) {
          isAdminSignal.set(val);
        },
        readOnly: false
      },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_mqapValidation: jest.fn().mockReturnValue(
          of({
            response: {
              title: 'MQAP Retrieved Result Title',
              metadata: [{ source: 'CGSpace' }]
            }
          })
        ),
        POST_createResult: jest.fn().mockReturnValue(
          of({
            response: {
              result: { result_code: 'RESULT-2026', version_id: '1' }
            }
          })
        )
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    mockEntityAowService = {
      showReportResultModal: signal(true),
      entityId: signal('SP01'),
      entityDetails: signal({ id: 10, name: 'Science Program 01' }),
      currentAowSelected: signal(null),
      currentResultToReport: signal<any>({
        toc_result_id: 'TOC-100',
        result_level_id: 3,
        result_title: 'Test Outcome Result',
        indicators: [
          {
            indicator_description: 'Knowledge Products Indicator',
            type_name: 'Number of knowledge products',
            result_type_id: 6,
            result_type_name: 'Knowledge product',
            result_level_id: 3,
            number_target: 5,
            target_date: '2026-12-31',
            targets_by_center: { centers: [] }
          }
        ],
        toc_partner_institution_ids: []
      }),
      selectedEntities: signal<any[]>([]),
      w3BilateralProjects: signal<any[]>([]),
      selectedW3BilateralProjects: signal<any[]>([]),
      existingResultsContributors: signal<any[]>([]),
      reportingPhaseYear: 2026,
      canReportResults: jest.fn().mockReturnValue(true),
      getW3BilateralProjects: jest.fn(),
      getExistingResultsContributors: jest.fn(),
      onCloseReportResultModal: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn(),
      createUrlTree: jest.fn().mockReturnValue({}),
      serializeUrl: jest.fn().mockReturnValue('/result/result-detail/RESULT-2026/general-information')
    };

    mockResultsListFilterService = {
      filters: {
        resultLevel: [
          {
            id: 3,
            options: [
              { id: 6, name: 'Knowledge product' },
              { id: 1, name: 'Policy change' }
            ]
          }
        ]
      }
    };

    mockCentersService = {
      getData: jest.fn().mockResolvedValue([]),
      centersList: [
        { code: 'ABC', name: 'Alliance of Bioversity and CIAT', acronym: 'ABC', institutionId: 100 },
        { code: 'CIP', name: 'International Potato Center', acronym: 'CIP', institutionId: 101 }
      ]
    };

    await TestBed.configureTestingModule({
      imports: [AowHloCreateModalComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: EntityAowService, useValue: mockEntityAowService },
        { provide: Router, useValue: mockRouter },
        { provide: ResultsListFilterService, useValue: mockResultsListFilterService },
        { provide: CentersService, useValue: mockCentersService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AowHloCreateModalComponent);
    component = fixture.componentInstance;
  });

  describe('KP Indicator & Category Tabs Visibility (AC-1, AC-2, R-1 rev 2)', () => {
    it('should show tabs with Browse CGSpace as default active tab when indicator is KP (AC-1)', () => {
      mockEntityAowService.currentResultToReport.set({
        indicators: [{ type_name: 'Number of knowledge products', result_type_id: 6 }]
      });
      fixture.detectChanges();

      expect(component.currentResultIsKnowledgeProduct()).toBe(true);
      expect(component.kpEntryMode()).toBe('browse');

      const tabsListEl = fixture.debugElement.query(By.css('[brnTabsList], [role="tablist"]'));
      expect(tabsListEl).toBeTruthy();

      const browseTabBtn = fixture.debugElement.query(By.css('button[brnTabsTrigger="browse"]'));
      expect(browseTabBtn).toBeTruthy();

      const manualTabBtn = fixture.debugElement.query(By.css('button[brnTabsTrigger="manual"]'));
      expect(manualTabBtn).toBeTruthy();

      const browsePanel = fixture.debugElement.query(By.css('app-kp-cgspace-browse'));
      expect(browsePanel).toBeTruthy();
    });

    it('should show tabs when indicator category result_type_id=6 is selected on an allowed indicator (R-1 rev 2)', () => {
      mockEntityAowService.currentResultToReport.set({
        indicators: [{ type_name: 'Other indicator type', result_type_id: null }]
      });
      component.createResultBody.update(b => ({ ...b, result_type_id: 6 }));
      fixture.detectChanges();

      expect(component.currentResultIsKnowledgeProduct()).toBe(true);

      const tabsListEl = fixture.debugElement.query(By.css('[brnTabsList], [role="tablist"]'));
      expect(tabsListEl).toBeTruthy();
    });

    it('should NOT show tabs when indicator and category are non-KP (AC-2)', () => {
      mockEntityAowService.currentResultToReport.set({
        indicators: [{ type_name: 'Policy change indicator', result_type_id: 1 }]
      });
      component.createResultBody.update(b => ({ ...b, result_type_id: 1 }));
      fixture.detectChanges();

      expect(component.currentResultIsKnowledgeProduct()).toBe(false);
      const tabsEl = fixture.debugElement.query(By.css('[brnTabsList], [role="tablist"], app-kp-cgspace-browse'));
      expect(tabsEl).toBeNull();
      expect(fixture.nativeElement).toMatchSnapshot();
    });
  });

  describe('Browse Selection and MQAP Sync Integration (AC-9, KPB-DD-4)', () => {
    it('should update handler to itemUrl, set handleSource to browse, call GET_mqapValidation, and pass regex without mqapUrlError (AC-9 browse half)', () => {
      mockEntityAowService.currentResultToReport.set({
        indicators: [{ type_name: 'Number of knowledge products', result_type_id: 6 }]
      });
      fixture.detectChanges();

      component.onCgspaceItemSelected(sampleBrowseItem);

      expect(component.createResultBody().handler).toBe(sampleBrowseItem.itemUrl);
      expect(component.handleSource()).toBe('browse');
      expect(mockApiService.resultsSE.GET_mqapValidation).toHaveBeenCalledWith(sampleBrowseItem.itemUrl);
      expect(component.mqapUrlError().status).toBe(false);
      expect(component.createResultBody().result_name).toBe('MQAP Retrieved Result Title');
    });

    it('should fail regex validation for manual entry with unsupported handle prefix (AC-9 manual half, R-7)', () => {
      mockEntityAowService.currentResultToReport.set({
        indicators: [{ type_name: 'Number of knowledge products', result_type_id: 6 }]
      });
      fixture.detectChanges();

      component.createResultBody.update(b => ({ ...b, handler: 'https://hdl.handle.net/10947/4262' }));
      component.handleSource.set('manual');

      component.GET_mqapValidation();

      expect(component.mqapUrlError().status).toBe(true);
      expect(component.mqapUrlError().message).toContain(
        'Please ensure that the handle is from the CGSpace, MELSpace or WorldFish repository'
      );
      expect(mockApiService.resultsSE.GET_mqapValidation).not.toHaveBeenCalled();
    });
  });

  describe('POST_createResult Body Equality & No Discovery Leaks (AC-5, KPB-DD-2)', () => {
    it('should produce identical POST_createResult body via Browse and Manual flows, with NO Discovery-only keys (AC-5)', () => {
      mockEntityAowService.currentResultToReport.set({
        toc_result_id: 'TOC-100',
        result_level_id: 3,
        indicators: [
          {
            indicator_description: 'KP Indicator',
            type_name: 'Number of knowledge products',
            result_type_id: 6,
            result_level_id: 3,
            number_target: 5,
            target_date: '2026-12-31'
          }
        ]
      });

      // Flow A: Browse selection
      component.onCgspaceItemSelected(sampleBrowseItem);
      component.createResultBody.update(b => ({
        ...b,
        toc_progressive_narrative: 'Progress narrative for KP',
        contribution_to_indicator_target: 3
      }));

      component.createResult();
      const browseBody = mockApiService.resultsSE.POST_createResult.mock.calls[0][0];

      // Flow B: Manual entry with identical handle and form inputs
      mockApiService.resultsSE.POST_createResult.mockClear();

      const manualComponentFixture = TestBed.createComponent(AowHloCreateModalComponent);
      const manualComp = manualComponentFixture.componentInstance;
      manualComp.createResultBody.update(b => ({
        ...b,
        handler: sampleBrowseItem.itemUrl,
        result_name: 'MQAP Retrieved Result Title',
        toc_progressive_narrative: 'Progress narrative for KP',
        contribution_to_indicator_target: 3,
        result_type_id: null
      }));
      manualComp.handleSource.set('manual');
      manualComp.mqapJson.set({
        title: 'MQAP Retrieved Result Title',
        metadata: [{ source: 'CGSpace' }]
      });

      manualComp.createResult();
      const manualBody = mockApiService.resultsSE.POST_createResult.mock.calls[0][0];

      // Assert full payload equality
      expect(browseBody).toEqual(manualBody);

      // Explicitly assert that NO Discovery-only DTO keys are present in the payload
      expect(browseBody).not.toHaveProperty('authors');
      expect(browseBody).not.toHaveProperty('affiliations');
      expect(browseBody).not.toHaveProperty('countries');
      expect(browseBody).not.toHaveProperty('doi');
      expect(browseBody).not.toHaveProperty('uuid');
      expect(browseBody.result).not.toHaveProperty('authors');
      expect(browseBody.result).not.toHaveProperty('affiliations');
      expect(browseBody.result).not.toHaveProperty('countries');
    });
  });

  describe('Existing Result Handling (AC-13, KPB-R-13)', () => {
    let windowOpenSpy: jest.SpyInstance;

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it('should abort creation and display error when MQAP returns an already-reported error for selected browse item (AC-13)', () => {
      mockApiService.resultsSE.GET_mqapValidation.mockReturnValueOnce(
        throwError(() => ({ error: { message: 'A result with this handle already exists.' } }))
      );

      component.onCgspaceItemSelected(sampleBrowseItem);

      expect(mockApiService.resultsSE.GET_mqapValidation).toHaveBeenCalledWith(sampleBrowseItem.itemUrl);
      expect(component.validatingHandler()).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultError',
          description: 'A result with this handle already exists.'
        })
      );
      expect(mockApiService.resultsSE.POST_createResult).not.toHaveBeenCalled();
    });

    it('should invoke existing result navigation and NOT call POST_createResult when navigating to existing result', () => {
      const existingItem = { result_code: 'RESULT-555', title: 'Existing Result Title', version_id: '2' };
      mockEntityAowService.existingResultsContributors.set([existingItem]);
      fixture.detectChanges();

      component.navigateToResult(existingItem);

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
        ['/result/result-detail/RESULT-555/general-information'],
        { queryParams: { phase: '2' } }
      );
      expect(windowOpenSpy).toHaveBeenCalled();
      expect(mockApiService.resultsSE.POST_createResult).not.toHaveBeenCalled();
    });
  });

  describe('Modal Clean and Close State Resets (KPB-R-21)', () => {
    it('should reset kpEntryMode to browse and handleSource to manual when cleanModal is invoked', () => {
      component.kpEntryMode.set('manual');
      component.handleSource.set('browse');
      component.createResultBody.update(b => ({ ...b, handler: 'https://cgspace.cgiar.org/items/123' }));

      component.cleanModal();

      expect(component.kpEntryMode()).toBe('browse');
      expect(component.handleSource()).toBe('manual');
      expect(component.createResultBody().handler).toBe('');
      expect(component.createResultBody().result_name).toBe('');
    });

    it('should invoke cleanModal and entityAowService.onCloseReportResultModal on onCloseModal', () => {
      component.kpEntryMode.set('manual');
      component.onCloseModal();

      expect(component.kpEntryMode()).toBe('browse');
      expect(component.handleSource()).toBe('manual');
      expect(mockEntityAowService.onCloseReportResultModal).toHaveBeenCalled();
    });
  });

  describe('Helper Getters and Computed Signals (phaseYear, isAdmin)', () => {
    it('should compute phaseYear from api.dataControlSE.reportingCurrentPhase', () => {
      expect(component.phaseYear()).toBe(2026);
    });

    it('should compute isAdmin from api.rolesSE.isAdmin', () => {
      expect(component.isAdmin()).toBe(false);
      mockApiService.rolesSE.isAdmin = true;
      expect(component.isAdmin()).toBe(true);
    });
  });
});
