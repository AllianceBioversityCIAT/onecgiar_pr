import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportResultFormComponent } from './report-result-form.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { Router } from '@angular/router';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { TerminologyService } from '../../../../../../internationalization/terminology.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { ResultBody } from '../../../../../../shared/interfaces/result.interface';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { ResultLevelCardsComponent } from '../result-level-cards/result-level-cards.component';
import { signal } from '@angular/core';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { KpCgspaceBrowseComponent } from '../../../../../result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component';

describe('ReportResultFormComponent', () => {
  let component: ReportResultFormComponent;
  let fixture: ComponentFixture<ReportResultFormComponent>;
  let mockApiService: any;
  let mockResultLevelService: any;
  let mockPhasesService: any;
  let mockTerminologyService: any;
  let router: Router;

  const mockInitiatives = [
    { id: 1, initiative_id: 1, full_name: 'Initiative 1', typeCode: 'SP', name: 'Science Program' },
    { id: 2, initiative_id: 2, full_name: 'Initiative 2', typeCode: 'ACC', name: 'Accelerator' }
  ];

  const mockEntityTypes = [
    { code: 'SP', name: 'Science Program', isLabel: true },
    { code: 'ACC', name: 'Accelerator', isLabel: true }
  ];

  const mockPhases = {
    reporting: [{ id: 1, name: 'Phase 1' }],
    ipsr: [{ id: 2, name: 'Phase 2' }]
  };

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        getCurrentPhases: jest.fn(() => of({})),
        reportingPhaseVersion: signal(0),
        reportingCurrentPhase: { portfolioAcronym: 'P25', phaseYear: 2026 },
        previousReportingPhase: { phaseYear: 2025 },
        myInitiativesListReportingByPortfolio: mockInitiatives,
        myInitiativesList: [],
        validateBody: jest.fn(),
        someMandatoryFieldIncompleteResultDetail: jest.fn(),
        fieldFeedbackList: jest.fn(() => [])
      },
      rolesSE: {
        validateReadOnly: jest.fn(() => Promise.resolve()),
        isAdmin: true
      },
      alertsFe: {
        show: jest.fn()
      },
      resultsSE: {
        GET_AllInitiatives: jest.fn(() => of({ response: mockInitiatives })),
        GET_cgiarEntityTypes: jest.fn(() => of({ response: mockEntityTypes })),
        GET_depthSearch: jest.fn(() => of([])),
        GET_checkTitleUniqueness: jest.fn(() => of({ response: { isUnique: true, existing: null } })),
        POST_resultCreateHeader: jest.fn(() => of({ response: { result_code: 'R001', version_id: 1 } })),
        POST_createWithHandle: jest.fn(() => of({ response: { result_code: 'R001', version_id: 1 } })),
        GET_mqapValidation: jest.fn(() => of({ response: { title: 'Test Title' } })),
        // P2-3421 — catalogue behind the link-to-a-QA'd-innovation dropdown.
        GET_qaInnovationDevelopmentResults: jest.fn(() =>
          of({
            response: [
              { id: 501, result_code: 5501, title: 'Drought-tolerant bean variety', status_id: 2, phase_year: 2025, acronym: 'P25' }
            ]
          })
        )
      },
      updateUserData: jest.fn(callback => callback())
    };

    mockResultLevelService = {
      resultBody: new ResultBody(),
      currentResultTypeList: [
        { id: 1, name: 'Innovation development' },
        { id: 6, name: 'Knowledge product' }
      ],
      resultLevelList: [{ id: 1, selected: false, name: 'Output' }],
      resultLevelListSig: signal([{ id: 1, selected: false, name: 'Output' }]),
      cleanData: jest.fn(),
      resetSelection: jest.fn(),
      consumePendingResultType: jest.fn(() => null),
      preselectResultType: jest.fn(),
      outputOutcomeLevelsSig: signal([])
    };

    mockPhasesService = {
      phases: mockPhases,
      currentlyActivePhaseOnReporting: {
        cgspace_year: 2024
      }
    };

    mockTerminologyService = {
      t: jest.fn((key: string, param?: string) => {
        if (key === 'term.entity.singular') return param || 'Entity';
        return key;
      })
    };

    await TestBed.configureTestingModule({
      declarations: [ReportResultFormComponent, ResultLevelCardsComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, CustomFieldsModule, TermPipe, KpCgspaceBrowseComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultLevelService, useValue: mockResultLevelService },
        { provide: PhasesService, useValue: mockPhasesService },
        { provide: TerminologyService, useValue: mockTerminologyService },
        { provide: ResultsApiService, useValue: { GET_cgspaceSearch: jest.fn(() => of({ response: { items: [], total: 0 } })) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportResultFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize component and load initiatives for admin', done => {
      jest.spyOn(component, 'GET_AllInitiatives');
      fixture.detectChanges();
      setTimeout(() => {
        expect(component.GET_AllInitiatives).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should set available initiatives for non-admin users', () => {
      mockApiService.rolesSE.isAdmin = false;
      fixture.detectChanges();
      expect(component.availableInitiativesSig()).toEqual(mockInitiatives);
    });

    it('should initialize resultBody and clean data', () => {
      fixture.detectChanges();
      expect(mockResultLevelService.resultBody).toBeInstanceOf(ResultBody);
      expect(mockResultLevelService.cleanData).toHaveBeenCalled();
    });
  });

  describe('onSelectInit', () => {
    it('should set currentResultType when initiative is found', () => {
      component.cgiarEntityTypes = mockEntityTypes;
      component.allInitiatives = mockInitiatives;
      mockResultLevelService.resultBody.initiative_id = 1;
      mockInitiatives[0].typeCode = 'SP';

      component.onSelectInit();

      expect(component.currentResultType).toBe('Science Program');
    });

    it('should not set currentResultType when initiative is not found', () => {
      component.cgiarEntityTypes = mockEntityTypes;
      component.allInitiatives = [];
      mockResultLevelService.resultBody.initiative_id = 999;

      component.onSelectInit();

      expect(component.currentResultType).toBe('');
    });
  });

  describe('getAllPhases', () => {
    it('should combine reporting and ipsr phases', () => {
      component.getAllPhases();
      expect(component.allPhases).toEqual([...mockPhases.reporting, ...mockPhases.ipsr]);
    });
  });

  describe('GET_cgiarEntityTypes', () => {
    it('should fetch entity types and mark them as labels', done => {
      component.GET_cgiarEntityTypes(response => {
        expect(response).toEqual(mockEntityTypes);
        expect(response.every((item: any) => item.isLabel === true)).toBe(true);
        done();
      });
    });

    it('should handle error gracefully', done => {
      mockApiService.resultsSE.GET_cgiarEntityTypes = jest.fn(() => throwError(() => new Error('Error')));
      component.GET_cgiarEntityTypes(response => {
        expect(response).toBeUndefined();
        done();
      });
    });
  });

  describe('GET_AllInitiatives', () => {
    it('should not fetch initiatives if user is not admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      jest.spyOn(mockApiService.resultsSE, 'GET_AllInitiatives');
      component.GET_AllInitiatives();
      expect(mockApiService.resultsSE.GET_AllInitiatives).not.toHaveBeenCalled();
    });

    it('should fetch and organize initiatives for admin', done => {
      mockApiService.rolesSE.isAdmin = true;
      component.GET_AllInitiatives(() => {
        expect(component.allInitiatives.length).toBeGreaterThanOrEqual(0);
        expect(component.availableInitiativesSig().length).toBeGreaterThanOrEqual(0);
        done();
      });
    });
  });

  describe('isKnowledgeProduct getter', () => {
    it('should return true when result_type_id is 6', () => {
      mockResultLevelService.resultBody.result_type_id = 6;
      expect(component.isKnowledgeProduct).toBe(true);
    });

    it('should return false when result_type_id is not 6', () => {
      mockResultLevelService.resultBody.result_type_id = 1;
      expect(component.isKnowledgeProduct).toBe(false);
    });
  });

  describe('resultTypeNamePlaceholder getter', () => {
    it('should return type name with "title..." suffix when type exists', () => {
      mockResultLevelService.currentResultTypeList = [{ id: 1, name: 'Innovation' }];
      mockResultLevelService.resultBody.result_type_id = 1;
      expect(component.resultTypeNamePlaceholder).toBe('Innovation title...');
    });

    it('should return "Title..." when type does not exist', () => {
      mockResultLevelService.resultBody.result_type_id = null;
      expect(component.resultTypeNamePlaceholder).toBe('Title...');
    });
  });

  describe('resultTypeName getter', () => {
    it('should return type name when found', () => {
      mockResultLevelService.currentResultTypeList = [{ id: 1, name: 'Innovation' }];
      mockResultLevelService.resultBody.result_type_id = 1;
      expect(component.resultTypeName).toBe('Innovation');
    });

    it('should return undefined when type not found', () => {
      mockResultLevelService.resultBody.result_type_id = 999;
      mockResultLevelService.currentResultTypeList = [{ id: 1, name: 'Innovation' }];
      expect(component.resultTypeName).toBeUndefined();
    });
  });

  describe('resultLevelName getter', () => {
    it('should return result_level_name from resultBody', () => {
      mockResultLevelService.resultBody.result_level_name = 'Output';
      expect(component.resultLevelName).toBe('Output');
    });

    it('should return empty string when result_level_name is not set', () => {
      mockResultLevelService.resultBody.result_level_name = undefined;
      expect(component.resultLevelName).toBe('');
    });
  });

  describe('clean', () => {
    it('should clear result_name for knowledge products', () => {
      mockResultLevelService.resultBody.result_type_id = 6;
      mockResultLevelService.resultBody.result_name = 'Test Name';
      component.clean();
      expect(mockResultLevelService.resultBody.result_name).toBe('');
    });

    it('should call onTitleChange for non-knowledge products', () => {
      mockResultLevelService.resultBody.result_type_id = 1;
      mockResultLevelService.resultBody.result_name = 'Test Name';
      jest.spyOn(component, 'onTitleChange');
      component.clean();
      expect(component.onTitleChange).toHaveBeenCalledWith('Test Name');
    });
  });

  describe('CGSpace browse (emerging KP)', () => {
    const cgspaceItem = {
      uuid: '12345678-1234-1234-1234-123456789012',
      handle: '10568/1',
      handleUrl: 'https://hdl.handle.net/10568/1',
      itemUrl: 'https://cgspace.cgiar.org/items/12345678-1234-1234-1234-123456789012',
      title: 'From browse',
      type: 'Report',
      year: 2026,
      authors: [],
      affiliations: [],
      countries: [],
      doi: null,
      uri: ''
    };

    it('template offers Browse CGSpace and Manual entry for Knowledge products', () => {
      const fs = require('fs');
      const path = require('path');
      const template = fs.readFileSync(path.join(__dirname, 'report-result-form.component.html'), 'utf8');

      expect(template).toContain('Browse CGSpace');
      expect(template).toContain('Manual entry');
      expect(template).toContain('app-kp-cgspace-browse');
      expect(template).toContain('emerging-kp-entry');
      expect(template).toContain('kp-manual-row');
      expect(template).toContain('kp-manual-sync');
    });

    it('fills handler and title from a CGSpace selection', () => {
      component.onCgspaceItemSelected(cgspaceItem as any);

      expect(mockResultLevelService.resultBody.handler).toBe(cgspaceItem.itemUrl);
      expect(mockResultLevelService.resultBody.result_name).toBe('Test Title');
      expect(component.validating).toBe(false);
    });

    it('clears the selected item so the user can pick another', () => {
      mockResultLevelService.resultBody.handler = cgspaceItem.itemUrl;
      mockResultLevelService.resultBody.result_name = 'From browse';

      component.clearSelectedKpItem();

      expect(mockResultLevelService.resultBody.handler).toBe('');
      expect(mockResultLevelService.resultBody.result_name).toBe('');
    });
  });

  describe('depthSearch', () => {
    it('should search for results and update depthSearchList', () => {
      const mockResults = [
        { id: 1, title: 'Test Result', version_id: 1 },
        { id: 2, title: 'Another Result', version_id: 2 }
      ];
      mockApiService.resultsSE.GET_depthSearch = jest.fn(() => of(mockResults));
      mockApiService.resultsSE.GET_checkTitleUniqueness = jest.fn(() =>
        of({ response: { isUnique: true, existing: null } })
      );
      component.allPhases = mockPhases.reporting;

      component.depthSearch('Test');

      expect(component.depthSearchList.length).toBe(2);
      expect(component.depthSearchList[0].phase).toBeDefined();
    });

    it('should set exactTitleFound from MySQL uniqueness check when title conflicts', () => {
      mockApiService.resultsSE.GET_depthSearch = jest.fn(() => of([]));
      mockApiService.resultsSE.GET_checkTitleUniqueness = jest.fn(() =>
        of({
          response: {
            isUnique: false,
            existing: { id: 11115, result_code: 1, title: 'Test Result', version_id: 1 }
          }
        })
      );
      component.allPhases = mockPhases.reporting;

      component.depthSearch('Test Result');

      expect(component.exactTitleFound()).toBe(true);
      expect(component.blockingExactTitleFound()).toBe(true);
      expect(component.titleCheckFailed()).toBe(false);
    });

    it('should block save and not show green when uniqueness check fails', () => {
      mockApiService.resultsSE.GET_depthSearch = jest.fn(() => of([]));
      mockApiService.resultsSE.GET_checkTitleUniqueness = jest.fn(() => throwError(() => new Error('Error')));
      component.depthSearch('Test');
      expect(component.depthSearchList).toEqual([]);
      expect(component.exactTitleFound()).toBe(false);
      expect(component.titleCheckFailed()).toBe(true);
      expect(component.blockingExactTitleFound()).toBe(true);
    });

    it('should keep similar results when the similarity search succeeds but uniqueness fails', () => {
      mockApiService.resultsSE.GET_depthSearch = jest.fn(() =>
        of([{ id: 1, title: 'Similar', version_id: 1 }])
      );
      mockApiService.resultsSE.GET_checkTitleUniqueness = jest.fn(() => throwError(() => new Error('Error')));
      component.allPhases = mockPhases.reporting;
      component.depthSearch('Similar');
      expect(component.depthSearchList.length).toBe(1);
      expect(component.titleCheckFailed()).toBe(true);
      expect(component.blockingExactTitleFound()).toBe(true);
    });
  });

  describe('getLegacyType', () => {
    it('should return "Innovation" for Innovation development type', () => {
      expect(component.getLegacyType('Innovation development', '')).toBe('Innovation');
    });

    it('should return "Policy" for Policy change type', () => {
      expect(component.getLegacyType('Policy change', '')).toBe('Policy');
    });

    it('should return "OICR" for Capacity change type', () => {
      expect(component.getLegacyType('Capacity change', '')).toBe('OICR');
    });

    it('should return "OICR" for Impact level', () => {
      expect(component.getLegacyType('', 'Impact')).toBe('OICR');
    });

    it('should return empty string for unknown type', () => {
      expect(component.getLegacyType('Unknown', '')).toBe('');
    });
  });

  describe('onSaveSection', () => {
    it('should show error when initiative_id is not selected', () => {
      mockResultLevelService.resultBody.initiative_id = null;
      component.onSaveSection();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultError',
          status: 'error'
        })
      );
    });

    it('should create result header for non-knowledge products', () => {
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_type_id = 1;
      component.onSaveSection();
      expect(mockApiService.resultsSE.POST_resultCreateHeader).toHaveBeenCalled();
    });

    it('should create result with handle for knowledge products', () => {
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_type_id = 6;
      component.mqapJson = { metadata: 'test' };
      component.onSaveSection();
      expect(mockApiService.resultsSE.POST_createWithHandle).toHaveBeenCalled();
    });

    it('should emit resultCreated and navigate on success', () => {
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_type_id = 1;
      jest.spyOn(component.resultCreated, 'emit');
      component.onSaveSection();
      expect(component.resultCreated.emit).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalled();
    });

    it('should show error alert on API error', () => {
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_type_id = 1;
      mockApiService.resultsSE.POST_resultCreateHeader = jest.fn(() => throwError(() => ({ error: { message: 'Error message' } })));
      component.onSaveSection();
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultError',
          status: 'error'
        })
      );
    });
  });

  describe('ngDoCheck', () => {
    it('should call someMandatoryFieldIncompleteResultDetail in a coalesced rAF', () => {
      // Scan is now throttled + coalesced into a requestAnimationFrame run outside Angular's zone (P2-2971).
      const rafSpy = jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: any) => {
        cb(0);
        return 0;
      });
      (component as any).lastScanAt = 0;
      (component as any).scanScheduled = false;

      component.ngDoCheck();

      expect(mockApiService.dataControlSE.someMandatoryFieldIncompleteResultDetail).toHaveBeenCalledWith('.report_container');
      rafSpy.mockRestore();
    });
  });

  describe('GET_mqapValidation', () => {
    it('should show error when handler is empty', () => {
      mockResultLevelService.resultBody.handler = '';
      component.GET_mqapValidation();
      expect(component.mqapUrlError.status).toBe(true);
      expect(component.mqapUrlError.message).toBe('Please enter a valid handle.');
      expect(component.validating).toBe(false);
    });

    it('should show error when handler format is invalid', () => {
      mockResultLevelService.resultBody.handler = 'invalid-handle';
      component.GET_mqapValidation();
      expect(component.mqapUrlError.status).toBe(true);
      expect(component.validating).toBe(false);
    });

    it('should validate correct CGSpace handle format', () => {
      mockResultLevelService.resultBody.handler = 'https://cgspace.cgiar.org/items/12345678-1234-1234-1234-123456789012';
      component.GET_mqapValidation();
      expect(component.mqapUrlError.status).toBe(false);
      expect(mockApiService.resultsSE.GET_mqapValidation).toHaveBeenCalled();
    });

    it('should update result_name and show success on validation success', () => {
      mockResultLevelService.resultBody.handler = 'https://cgspace.cgiar.org/items/12345678-1234-1234-1234-123456789012';
      component.GET_mqapValidation();
      expect(mockResultLevelService.resultBody.result_name).toBe('Test Title');
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultSuccess',
          status: 'success'
        })
      );
      expect(component.validating).toBe(false);
    });

    it('should handle validation error', () => {
      mockResultLevelService.resultBody.handler = 'https://cgspace.cgiar.org/items/12345678-1234-1234-1234-123456789012';
      mockApiService.resultsSE.GET_mqapValidation = jest.fn(() => throwError(() => ({ error: { message: 'Error' } })));
      component.GET_mqapValidation();
      expect(mockResultLevelService.resultBody.result_name).toBe('');
      expect(component.validating).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'reportResultError',
          status: 'error'
        })
      );
    });
  });

  describe('selectedInitiativeId setter', () => {
    it('should set _selectedInitiativeId and call tryApplySelectedInitiative', () => {
      jest.spyOn(component as any, 'tryApplySelectedInitiative');
      component.selectedInitiativeId = 1;
      expect((component as any)._selectedInitiativeId).toBe(1);
      expect((component as any).tryApplySelectedInitiative).toHaveBeenCalled();
    });

    it('should handle null value', () => {
      component.selectedInitiativeId = null;
      expect((component as any)._selectedInitiativeId).toBe(null);
    });
  });

  describe('tryApplySelectedInitiative', () => {
    it('should apply initiative when match is found', () => {
      component.availableInitiativesSig.set(mockInitiatives);
      (component as any)._selectedInitiativeId = 1;
      jest.spyOn(component, 'onSelectInit');
      (component as any).tryApplySelectedInitiative();
      expect(mockResultLevelService.resultBody.initiative_id).toBe(1);
      expect(component.onSelectInit).toHaveBeenCalled();
    });

    it('should not apply when _selectedInitiativeId is null', () => {
      const originalInitiativeId = mockResultLevelService.resultBody.initiative_id;
      (component as any)._selectedInitiativeId = null;
      (component as any).tryApplySelectedInitiative();
      expect(mockResultLevelService.resultBody.initiative_id).toBe(originalInitiativeId);
    });

    it('should not apply when list is empty', () => {
      const originalInitiativeId = mockResultLevelService.resultBody.initiative_id;
      component.availableInitiativesSig.set([]);
      (component as any)._selectedInitiativeId = 1;
      (component as any).tryApplySelectedInitiative();
      expect(mockResultLevelService.resultBody.initiative_id).toBe(originalInitiativeId);
    });

    it('should not apply when no match found in list', () => {
      component.availableInitiativesSig.set([{ id: 99, initiative_id: 99 }]);
      (component as any)._selectedInitiativeId = 1;
      jest.spyOn(component, 'onSelectInit');
      (component as any).tryApplySelectedInitiative();
      expect(component.onSelectInit).not.toHaveBeenCalled();
    });
  });

  describe('ngOnInit non-admin with single initiative auto-select', () => {
    it('should auto-select initiative when non-admin has exactly one initiative and no pre-selected', () => {
      mockApiService.rolesSE.isAdmin = false;
      const singleInit = [{ id: 42, initiative_id: 42, full_name: 'Single Init' }];
      mockApiService.dataControlSE.myInitiativesListReportingByPortfolio = singleInit;
      (component as any)._selectedInitiativeId = null;
      mockResultLevelService.resultBody = new ResultBody();

      fixture.detectChanges();

      // After updateUserData callback:
      // _selectedInitiativeId should be set to 42 (auto-selected from single initiative)
      expect((component as any)._selectedInitiativeId).toBe(42);
    });

    it('should set initiative_id from _selectedInitiativeId when it is not null after updateUserData', () => {
      mockApiService.rolesSE.isAdmin = false;
      const inits = [{ id: 10, initiative_id: 10 }, { id: 20, initiative_id: 20 }];
      mockApiService.dataControlSE.myInitiativesListReportingByPortfolio = inits;
      (component as any)._selectedInitiativeId = 10;
      mockResultLevelService.resultBody = new ResultBody();

      fixture.detectChanges();

      expect(mockResultLevelService.resultBody.initiative_id).toBe(10);
    });

    it('should set initiative_id from single initiative when _selectedInitiativeId is null and only one initiative', () => {
      mockApiService.rolesSE.isAdmin = true;
      const singleInit = [{ id: 55, initiative_id: 55 }];
      mockApiService.dataControlSE.myInitiativesListReportingByPortfolio = singleInit;
      (component as any)._selectedInitiativeId = null;
      mockResultLevelService.resultBody = new ResultBody();

      // Force updateUserData callback to NOT set _selectedInitiativeId
      mockApiService.updateUserData = jest.fn(cb => {
        // isAdmin is true, so the non-admin block is skipped
        // _selectedInitiativeId remains null
        cb();
      });

      fixture.detectChanges();

      // Falls into the else if (length == 1) branch
      expect(mockResultLevelService.resultBody.initiative_id).toBe(55);
    });
  });

  describe('onTitleChange edge cases', () => {
    it('should clear depthSearchList and stop loading for empty title', () => {
      component.depthSearchList = [{ id: 1 }] as any;
      component.onTitleChange('');
      expect(component.depthSearchList).toEqual([]);
      expect(component.loadingDepthSearch()).toBe(false);
    });

    it('should clear depthSearchList for whitespace-only title', () => {
      component.onTitleChange('   ');
      expect(component.depthSearchList).toEqual([]);
      expect(component.loadingDepthSearch()).toBe(false);
    });

    it('should clear depthSearchList for null title', () => {
      component.onTitleChange(null as any);
      expect(component.depthSearchList).toEqual([]);
      expect(component.loadingDepthSearch()).toBe(false);
    });

    it('should debounce title search requests', () => {
      jest.useFakeTimers();
      fixture.detectChanges();
      mockApiService.resultsSE.GET_depthSearch.mockClear();
      mockApiService.resultsSE.GET_checkTitleUniqueness.mockClear();

      component.onTitleChange('test title');
      expect(component.loadingDepthSearch()).toBe(true);
      expect(mockApiService.resultsSE.GET_depthSearch).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);
      expect(mockApiService.resultsSE.GET_depthSearch).toHaveBeenCalledWith('test title', '');
      expect(mockApiService.resultsSE.GET_checkTitleUniqueness).toHaveBeenCalledWith('test title');
      jest.useRealTimers();
    });

    it('should only apply latest request when previous request resolves later', () => {
      jest.useFakeTimers();
      fixture.detectChanges();
      component.allPhases = mockPhases.reporting;
      const firstSimilar$ = new Subject<any[]>();
      const secondSimilar$ = new Subject<any[]>();
      const uniqueness$ = of({ response: { isUnique: true, existing: null } });

      mockApiService.resultsSE.GET_depthSearch = jest
        .fn()
        .mockReturnValueOnce(firstSimilar$.asObservable())
        .mockReturnValueOnce(secondSimilar$.asObservable());
      mockApiService.resultsSE.GET_checkTitleUniqueness = jest.fn(() => uniqueness$);

      component.onTitleChange('first title');
      jest.advanceTimersByTime(500);
      component.onTitleChange('second title');
      jest.advanceTimersByTime(500);

      secondSimilar$.next([{ id: 2, title: 'second title', version_id: 1 }]);
      secondSimilar$.complete();

      expect(component.exactTitleFound()).toBe(false);
      expect(component.depthSearchList[0]?.title).toBe('second title');

      firstSimilar$.next([{ id: 1, title: 'first title', version_id: 1 }]);
      firstSimilar$.complete();

      expect(component.depthSearchList[0]?.title).toBe('second title');
      expect(component.blockingExactTitleFound()).toBe(false);
      jest.useRealTimers();
    });

    it('should block when MySQL reports title is not unique', () => {
      jest.useFakeTimers();
      fixture.detectChanges();
      component.allPhases = mockPhases.reporting;

      mockApiService.resultsSE.GET_depthSearch = jest.fn(() => of([]));
      mockApiService.resultsSE.GET_checkTitleUniqueness = jest.fn(() =>
        of({
          response: {
            isUnique: false,
            existing: { id: 1, result_code: 1, title: 'Exact title', version_id: 1 }
          }
        })
      );

      component.onTitleChange('Exact title');
      jest.advanceTimersByTime(500);

      expect(component.exactTitleFound()).toBe(true);
      expect(component.blockingExactTitleFound()).toBe(true);
      expect(component.titleCheckFailed()).toBe(false);
      expect(component.loadingDepthSearch()).toBe(false);
      jest.useRealTimers();
    });

    it('should resolve gate before a slow similarity search finishes', () => {
      jest.useFakeTimers();
      fixture.detectChanges();
      component.allPhases = mockPhases.reporting;
      const similar$ = new Subject<any[]>();

      mockApiService.resultsSE.GET_checkTitleUniqueness = jest.fn(() =>
        of({ response: { isUnique: true, existing: null } })
      );
      mockApiService.resultsSE.GET_depthSearch = jest.fn(() => similar$.asObservable());

      component.onTitleChange('slow similarity title');
      jest.advanceTimersByTime(500);

      expect(component.loadingDepthSearch()).toBe(false);
      expect(component.blockingExactTitleFound()).toBe(false);
      expect(component.titleCheckFailed()).toBe(false);
      expect(component.depthSearchList).toEqual([]);

      similar$.next([{ id: 1, title: 'slow similarity title', version_id: 1 }]);
      similar$.complete();

      expect(component.depthSearchList.length).toBe(1);
      expect(component.loadingDepthSearch()).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('applyPendingResultTypeSelection', () => {
    it('should apply pending selection when level list is available', (done) => {
      mockResultLevelService.consumePendingResultType = jest.fn(() => ({ id: 1, name: 'Innovation' }));
      mockResultLevelService.resultLevelListSig = signal([{ id: 1, name: 'Output' }]);

      (component as any).applyPendingResultTypeSelection();

      setTimeout(() => {
        expect(mockResultLevelService.preselectResultType).toHaveBeenCalledWith(1, 'Innovation');
        done();
      }, 100);
    });

    it('should retry when level list is empty', (done) => {
      jest.useFakeTimers();
      mockResultLevelService.consumePendingResultType = jest.fn(() => ({ id: 2, name: 'Policy' }));
      mockResultLevelService.resultLevelListSig = signal([]);

      (component as any).applyPendingResultTypeSelection();

      // Initial setTimeout(checkAndApply, 0)
      jest.advanceTimersByTime(0);
      // Now checkAndApply runs, finds empty list, sets setTimeout(checkAndApply, 50)
      jest.advanceTimersByTime(50);

      // Still empty, should retry
      // Now provide data
      mockResultLevelService.resultLevelListSig = signal([{ id: 1 }]);
      jest.advanceTimersByTime(50);

      expect(mockResultLevelService.preselectResultType).toHaveBeenCalledWith(2, 'Policy');
      jest.useRealTimers();
      done();
    });

    it('should do nothing when no pending selection', () => {
      mockResultLevelService.consumePendingResultType = jest.fn(() => null);
      mockResultLevelService.preselectResultType.mockClear();
      (component as any).applyPendingResultTypeSelection();
      expect(mockResultLevelService.preselectResultType).not.toHaveBeenCalled();
    });
  });

  describe('onSelectInit for non-admin', () => {
    it('should use myInitiativesListReportingByPortfolio when not admin', () => {
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.myInitiativesListReportingByPortfolio = [
        { id: 5, typeCode: 'SP' }
      ];
      component.cgiarEntityTypes = mockEntityTypes;
      mockResultLevelService.resultBody.initiative_id = 5;

      component.onSelectInit();

      expect(component.currentResultType).toBe('Science Program');
    });
  });

  describe('GET_AllInitiatives edge cases', () => {
    it('should handle null entityTypesResponse in groupList iteration', (done) => {
      mockApiService.rolesSE.isAdmin = true;
      mockApiService.resultsSE.GET_cgiarEntityTypes = jest.fn(() => of({ response: null }));
      mockApiService.resultsSE.GET_AllInitiatives = jest.fn(() => of({ response: [] }));

      component.GET_AllInitiatives(() => {
        // groupList is null, forEach should be skipped
        expect(component.allInitiatives).toEqual([]);
        done();
      });
    });

    it('should handle error in GET_AllInitiatives', () => {
      mockApiService.rolesSE.isAdmin = true;
      mockApiService.resultsSE.GET_AllInitiatives = jest.fn(() => throwError(() => new Error('Error')));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      component.GET_AllInitiatives();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAllPhases edge cases', () => {
    it('should handle null phases gracefully', () => {
      mockPhasesService.phases = null;
      component.getAllPhases();
      expect(component.allPhases).toEqual([]);
    });

    it('should handle missing reporting or ipsr phases', () => {
      mockPhasesService.phases = { reporting: null, ipsr: null };
      component.getAllPhases();
      expect(component.allPhases).toEqual([]);
    });
  });

  describe('getLegacyType Other outcome', () => {
    it('should return "OICR" for Other outcome type', () => {
      expect(component.getLegacyType('Other outcome', '')).toBe('OICR');
    });
  });

  describe('selectedInitiativeId setter with undefined', () => {
    it('should convert undefined to null', () => {
      component.selectedInitiativeId = undefined;
      expect((component as any)._selectedInitiativeId).toBe(null);
    });
  });

  /**
   * P2-3053-style fix: the knowledge-product guidance used to hardcode 2025/2026/2024. It now derives every year
   * from the active reporting phase. `reportingCurrentPhase` is a plain object, so the computed depends on the
   * `reportingPhaseVersion` signal to re-render once `getCurrentPhases()` lands.
   */
  describe('kpAlertDescription — reporting-phase years', () => {
    it('uses the active phase year, the next year and the previous phase year', () => {
      const text = component.kpAlertDescription();

      expect(text).toContain('only knowledge products from <strong>2026</strong> will be accepted');
      expect(text).toContain('published online in <strong>2026</strong> but issued in <strong>2027</strong>');
      expect(text).toContain('accepted for the <strong>2026</strong> reporting phase');
      expect(text).toContain('published online in <strong>2025</strong> but issued in <strong>2026</strong> will not be accepted');
      expect(text).not.toContain('2024');
    });

    it('re-renders when the phases resolve after the first paint (never leaves the stale year)', () => {
      expect(component.kpAlertDescription()).toContain('<strong>2026</strong>');

      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2027;
      mockApiService.dataControlSE.previousReportingPhase.phaseYear = 2026;
      mockApiService.dataControlSE.reportingPhaseVersion.set(1);

      expect(component.kpAlertDescription()).toContain('only knowledge products from <strong>2027</strong> will be accepted');
    });

    it('never paints "null" while the phases have not loaded yet', () => {
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = null;
      mockApiService.dataControlSE.previousReportingPhase.phaseYear = null;
      mockApiService.dataControlSE.reportingPhaseVersion.set(2);

      const text = component.kpAlertDescription();

      expect(text).not.toContain('null');
      expect(text).not.toContain('NaN');
      expect(text).toContain(`<strong>${new Date().getFullYear()}</strong>`);
    });
  });
  /**
   * P2-3421 — link to a QA'd Innovation Development result, EMERGENT (non-ToC) pathway only.
   * The same component also renders the standalone legacy creator, so every test here pins one of
   * the three gates: the surface opt-in, the indicator category, and the 2026 PHASE year.
   */
  describe('P2-3421: link to a QA\'d Innovation Development result', () => {
    const INNOVATION_USE = 2;

    function armEmergentInnovationUse() {
      component.showInnovationLinkQuestion = true;
      mockResultLevelService.resultBody.result_type_id = INNOVATION_USE;
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2026;
    }

    it('defaults the answer to NO, as the story requires', () => {
      expect(component.hasInnovationLink).toBe(false);
      expect(component.linkedResultId).toBeNull();
    });

    it('shows the question on the emergent pathway for Innovation use in 2026', () => {
      armEmergentInnovationUse();

      expect(component.showsInnovationLink).toBe(true);
    });

    it('🛑 never shows it on the standalone legacy creator, which renders this very component', () => {
      armEmergentInnovationUse();
      component.showInnovationLinkQuestion = false;

      expect(component.showsInnovationLink).toBe(false);
    });

    it('🛑 never shows it for a 2025 phase — earlier phases must look exactly as they do today', () => {
      armEmergentInnovationUse();
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2025;

      expect(component.showsInnovationLink).toBe(false);
    });

    it('never shows it for any other indicator category', () => {
      armEmergentInnovationUse();
      mockResultLevelService.resultBody.result_type_id = 7;

      expect(component.showsInnovationLink).toBe(false);
    });

    it('loads the shared catalogue on init only when the surface opted in', () => {
      component.showInnovationLinkQuestion = true;
      component.ngOnInit();

      expect(mockApiService.resultsSE.GET_qaInnovationDevelopmentResults).toHaveBeenCalled();
    });

    it('blocks "Save and continue" while the answer is YES with no innovation chosen', () => {
      armEmergentInnovationUse();
      component.hasInnovationLink = true;
      component.linkedResultId = null;

      expect(component.innovationLinkIncomplete).toBe(true);
    });

    it('unblocks it once an innovation is chosen', () => {
      armEmergentInnovationUse();
      component.hasInnovationLink = true;
      component.linkedResultId = 501;

      expect(component.innovationLinkIncomplete).toBe(false);
    });

    it('never blocks on the default NO', () => {
      armEmergentInnovationUse();

      expect(component.innovationLinkIncomplete).toBe(false);
    });

    it('drops the selection when the user switches back to NO', () => {
      armEmergentInnovationUse();
      component.hasInnovationLink = true;
      component.linkedResultId = 501;

      component.hasInnovationLink = false;
      component.onInnovationLinkChange();

      expect(component.linkedResultId).toBeNull();
    });

    it('resets the answer when the indicator category changes', () => {
      armEmergentInnovationUse();
      component.hasInnovationLink = true;
      component.linkedResultId = 501;

      component.clean();

      expect(component.hasInnovationLink).toBe(false);
      expect(component.linkedResultId).toBeNull();
    });

    it('sends the answer INSIDE the create body, not as a chained PATCH', () => {
      armEmergentInnovationUse();
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_name = 'An innovation use result';
      component.hasInnovationLink = true;
      component.linkedResultId = 501;

      component.onSaveSection();

      const body = mockApiService.resultsSE.POST_resultCreateHeader.mock.calls.at(-1)[0];
      expect(body.has_innovation_link).toBe(true);
      expect(body.linked_results).toEqual([501]);
    });

    it('sends has_innovation_link=false and no links when the user leaves the default NO', () => {
      armEmergentInnovationUse();
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_name = 'An innovation use result';

      component.onSaveSection();

      const body = mockApiService.resultsSE.POST_resultCreateHeader.mock.calls.at(-1)[0];
      expect(body.has_innovation_link).toBe(false);
      expect(body.linked_results).toEqual([]);
    });

    it('🛑 leaves the create body untouched when the question was never shown (2025 phase)', () => {
      armEmergentInnovationUse();
      mockApiService.dataControlSE.reportingCurrentPhase.phaseYear = 2025;
      mockResultLevelService.resultBody.initiative_id = 1;
      mockResultLevelService.resultBody.result_name = 'A 2025 result';

      component.onSaveSection();

      const body = mockApiService.resultsSE.POST_resultCreateHeader.mock.calls.at(-1)[0];
      expect(body).not.toHaveProperty('has_innovation_link');
      expect(body).not.toHaveProperty('linked_results');
    });
  });
});
