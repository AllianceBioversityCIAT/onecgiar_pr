import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AowHloCreateModalComponent } from './aow-hlo-create-modal.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { ResultsListFilterService } from '../../../../../../../../../results/pages/results-outlet/pages/results-list/services/results-list-filter.service';
import { CentersService } from '../../../../../../../../../../shared/services/global/centers.service';

describe('AowHloCreateModalComponent', () => {
  let component: AowHloCreateModalComponent;
  let fixture: ComponentFixture<AowHloCreateModalComponent>;
  let mockApiService: any;
  let mockEntityAowService: any;
  let mockRouter: any;
  let mockResultsListFilterSE: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_mqapValidation: jest.fn().mockReturnValue(of({ response: { title: 'Test Title' } })),
        POST_createResult: jest.fn().mockReturnValue(of({ response: { result: { result_code: '123', version_id: 1 } } }))
      },
      alertsFe: {
        show: jest.fn()
      },
      rolesSE: {
        readOnly: false
      },
      dataControlSE: {
        currentResult: { status: null }
      }
    };

    mockEntityAowService = {
      currentResultToReport: jest.fn().mockReturnValue({
        toc_result_id: 'toc1',
        result_level_id: 1,
        indicators: [{ type_name: 'Other', result_type_id: 1, result_level_id: 2, related_node_id: 'node1', number_target: 10, target_date: '2025' }]
      }),
      entityDetails: jest.fn().mockReturnValue({ id: 100, name: 'Test Entity' }),
      entityId: jest.fn().mockReturnValue('INIT-01'),
      getW3BilateralProjects: jest.fn(),
      getExistingResultsContributors: jest.fn(),
      selectedW3BilateralProjects: signal([]),
      selectedEntities: signal([]),
      onCloseReportResultModal: jest.fn(),
      w3BilateralProjects: jest.fn().mockReturnValue([]),
      existingResultsContributors: jest.fn().mockReturnValue([]),
      showReportResultModal: jest.fn().mockReturnValue(false),
      currentAowSelected: jest.fn().mockReturnValue(null),
      canReportResults: jest.fn().mockReturnValue(true)
    };

    mockRouter = {
      serializeUrl: jest.fn().mockReturnValue('/result/result-detail/123/general-information?phase=1'),
      createUrlTree: jest.fn().mockReturnValue({}),
      navigate: jest.fn()
    };

    mockResultsListFilterSE = {
      filters: {
        resultLevel: [
          { id: 2, options: [{ id: 5, name: 'Type5' }, { id: 6, name: 'Knowledge Product' }] }
        ]
      }
    };

    await TestBed.configureTestingModule({
      imports: [AowHloCreateModalComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: EntityAowService, useValue: mockEntityAowService },
        { provide: Router, useValue: mockRouter },
        { provide: ResultsListFilterService, useValue: mockResultsListFilterSE },
        { provide: CentersService, useValue: { centersList: [] } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AowHloCreateModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call getW3BilateralProjects and getExistingResultsContributors', () => {
      fixture.detectChanges();

      expect(mockEntityAowService.getW3BilateralProjects).toHaveBeenCalled();
      expect(mockEntityAowService.getExistingResultsContributors).toHaveBeenCalledWith('toc1', 'node1');
    });

    it('should filter out current entity from initiatives list', () => {
      mockApiService.resultsSE.GET_AllInitiatives.mockReturnValue(of({
        response: [
          { initiative_id: 100, name: 'Current' },
          { initiative_id: 200, name: 'Other' }
        ]
      }));

      fixture.detectChanges();

      expect(component.allInitiatives().length).toBe(1);
      expect(component.allInitiatives()[0].initiative_id).toBe(200);
    });

    it('should set resultTypes when no result_type_id in indicators', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        toc_result_id: 'toc1',
        result_level_id: 1,
        indicators: [{ type_name: 'Other', result_type_id: null, result_level_id: 2, related_node_id: 'node1' }]
      });

      fixture.detectChanges();

      expect(component.resultTypes()).toEqual([
        { id: 5, name: 'Type5' },
        { id: 6, name: 'Knowledge Product' }
      ]);
    });

    it('should not set resultTypes when result_type_id exists in indicators', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        toc_result_id: 'toc1',
        result_level_id: 1,
        indicators: [{ type_name: 'Other', result_type_id: 5, result_level_id: 2, related_node_id: 'node1' }]
      });

      fixture.detectChanges();

      expect(component.resultTypes()).toEqual([]);
    });

    it('should use result_level_id from currentResultToReport when indicators has no result_level_id', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        toc_result_id: 'toc1',
        result_level_id: 2,
        indicators: [{ type_name: 'Other', result_type_id: null, related_node_id: 'node1' }]
      });

      fixture.detectChanges();

      expect(component.resultTypes()).toEqual([
        { id: 5, name: 'Type5' },
        { id: 6, name: 'Knowledge Product' }
      ]);
    });
  });

  describe('currentResultIsKnowledgeProduct', () => {
    it('should return true when indicators type_name is Number of knowledge products', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        indicators: [{ type_name: 'Number of knowledge products' }]
      });
      fixture.detectChanges();

      expect(component.currentResultIsKnowledgeProduct()).toBe(true);
    });

    it('should return true when result_type_id is 6', () => {
      component.createResultBody.set({
        ...component.createResultBody(),
        result_type_id: 6
      });

      expect(component.currentResultIsKnowledgeProduct()).toBe(true);
    });

    it('should return false for non-knowledge product', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        indicators: [{ type_name: 'Other' }]
      });
      fixture.detectChanges();

      expect(component.currentResultIsKnowledgeProduct()).toBe(false);
    });
  });

  describe('getTitleInputLabel', () => {
    it('should return title with source when knowledge product with metadata', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        indicators: [{ type_name: 'Number of knowledge products' }]
      });
      fixture.detectChanges();
      component.mqapJson.set({ metadata: [{ source: 'CGSpace' }] });

      expect(component.getTitleInputLabel()).toBe('Title retrived from CGSpace');
    });

    it('should return "Title retrieved from the repository" when knowledge product without metadata', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        indicators: [{ type_name: 'Number of knowledge products' }]
      });
      fixture.detectChanges();
      component.mqapJson.set(null);

      expect(component.getTitleInputLabel()).toBe('Title retrieved from the repository');
    });

    it('should return "Title retrieved from the repository" when knowledge product with empty metadata', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        indicators: [{ type_name: 'Number of knowledge products' }]
      });
      fixture.detectChanges();
      component.mqapJson.set({ metadata: [] });

      expect(component.getTitleInputLabel()).toBe('Title retrieved from the repository');
    });

    it('should return "Title of Result" for non-knowledge product', () => {
      fixture.detectChanges();

      expect(component.getTitleInputLabel()).toBe('Title of Result');
    });
  });

  describe('onResultTypeChange', () => {
    it('should update result_type_id in createResultBody', () => {
      fixture.detectChanges();

      component.onResultTypeChange(6);

      expect(component.createResultBody().result_type_id).toBe(6);
    });
  });

  describe('removeBilateralProject', () => {
    it('should remove a project from selectedW3BilateralProjects', () => {
      fixture.detectChanges();
      mockEntityAowService.selectedW3BilateralProjects.set([{ project_id: 1 }, { project_id: 2 }]);

      component.removeBilateralProject({ project_id: 1 });

      expect(mockEntityAowService.selectedW3BilateralProjects()).toEqual([{ project_id: 2 }]);
    });
  });

  describe('removeEntityOption', () => {
    it('should remove an entity from selectedEntities', () => {
      fixture.detectChanges();
      mockEntityAowService.selectedEntities.set([{ id: 1 }, { id: 2 }]);

      component.removeEntityOption({ id: 1 });

      expect(mockEntityAowService.selectedEntities()).toEqual([{ id: 2 }]);
    });
  });

  describe('deleteContributingCenter', () => {
    it('should splice the contributing center at the given index', () => {
      fixture.detectChanges();
      component.createResultBody.set({
        ...component.createResultBody(),
        contributing_center: [{ code: 'A' }, { code: 'B' }, { code: 'C' }]
      });

      component.deleteContributingCenter(1);

      expect(component.createResultBody().contributing_center).toEqual([{ code: 'A' }, { code: 'C' }]);
    });
  });

  describe('GET_mqapValidation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should set error when handler is empty', () => {
      component.createResultBody.set({ ...component.createResultBody(), handler: '' });

      component.GET_mqapValidation();

      expect(component.mqapUrlError().status).toBe(true);
      expect(component.mqapUrlError().message).toBe('Please enter a valid handle.');
      expect(component.validatingHandler()).toBe(false);
    });

    it('should set error when handler URL is invalid', () => {
      component.createResultBody.set({ ...component.createResultBody(), handler: 'https://invalid.com/test' });

      component.GET_mqapValidation();

      expect(component.mqapUrlError().status).toBe(true);
      expect(component.mqapUrlError().message).toContain('CGSpace');
      expect(component.validatingHandler()).toBe(false);
    });

    it('should call API and set result_name on valid URL success', () => {
      component.createResultBody.set({
        ...component.createResultBody(),
        handler: 'https://cgspace.cgiar.org/handle/10568/139504'
      });

      component.GET_mqapValidation();

      expect(component.mqapUrlError().status).toBe(false);
      expect(component.createResultBody().result_name).toBe('Test Title');
      expect(component.validatingHandler()).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('should handle API error on valid URL', () => {
      mockApiService.resultsSE.GET_mqapValidation.mockReturnValue(throwError(() => ({ error: { message: 'API Error' } })));
      component.createResultBody.set({
        ...component.createResultBody(),
        handler: 'https://cgspace.cgiar.org/handle/10568/139504'
      });

      component.GET_mqapValidation();

      expect(component.validatingHandler()).toBe(false);
      expect(component.createResultBody().result_name).toBe('');
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    });

    it('should validate hdl.handle.net URL', () => {
      component.createResultBody.set({
        ...component.createResultBody(),
        handler: 'https://hdl.handle.net/10568/12345'
      });

      component.GET_mqapValidation();

      expect(component.mqapUrlError().status).toBe(false);
    });

    it('should validate WorldFish repository URL', () => {
      component.createResultBody.set({
        ...component.createResultBody(),
        handler: 'https://digitalarchive.worldfishcenter.org/items/a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      });

      component.GET_mqapValidation();

      expect(component.mqapUrlError().status).toBe(false);
    });

    it('should validate hdl.handle.net with 20.500.12348 prefix', () => {
      component.createResultBody.set({
        ...component.createResultBody(),
        handler: 'https://hdl.handle.net/20.500.12348/12345'
      });

      component.GET_mqapValidation();

      expect(component.mqapUrlError().status).toBe(false);
    });
  });

  describe('navigateToResult', () => {
    it('should open result in new tab', () => {
      fixture.detectChanges();
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      component.navigateToResult({ result_code: '456', version_id: 2 });

      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
        ['/result/result-detail/456/general-information'],
        { queryParams: { phase: 2 } }
      );
      expect(openSpy).toHaveBeenCalledWith(expect.any(String), '_blank');
      openSpy.mockRestore();
    });
  });

  describe('createResult', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should create result and navigate on success', () => {
      component.createResult();

      expect(component.creatingResult()).toBe(false);
      expect(mockEntityAowService.onCloseReportResultModal).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/result/result-detail/123/general-information'],
        { queryParams: { phase: 1 } }
      );
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    });

    it('should handle error on create result', () => {
      mockApiService.resultsSE.POST_createResult.mockReturnValue(throwError(() => ({ error: { message: 'Create Error' } })));

      component.createResult();

      expect(component.creatingResult()).toBe(false);
      expect(mockApiService.alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    });

    it('should use result_type_id from indicators when available', () => {
      component.createResult();

      const callArgs = mockApiService.resultsSE.POST_createResult.mock.calls[0][0];
      expect(callArgs.result.result_type_id).toBe(1);
    });

    it('should fall back to createResultBody result_type_id when indicators has none', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        toc_result_id: 'toc1',
        result_level_id: 1,
        indicators: [{ result_type_id: null, result_level_id: 2 }]
      });
      component.createResultBody.set({
        ...component.createResultBody(),
        result_type_id: 7
      });

      component.createResult();

      const callArgs = mockApiService.resultsSE.POST_createResult.mock.calls[0][0];
      expect(callArgs.result.result_type_id).toBe(7);
    });

    it('should use result_level_id from result when indicators has none', () => {
      mockEntityAowService.currentResultToReport.mockReturnValue({
        toc_result_id: 'toc1',
        result_level_id: 99,
        indicators: [{}]
      });

      component.createResult();

      const callArgs = mockApiService.resultsSE.POST_createResult.mock.calls[0][0];
      expect(callArgs.result.result_level_id).toBe(99);
    });

    it('should include mqapJson as knowledge_product', () => {
      component.mqapJson.set({ title: 'KP Title' });

      component.createResult();

      const callArgs = mockApiService.resultsSE.POST_createResult.mock.calls[0][0];
      expect(callArgs.knowledge_product).toEqual({ title: 'KP Title' });
    });
  });
});
