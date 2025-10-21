import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressBarModule } from 'primeng/progressbar';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { signal } from '@angular/core';
import { AowHloCreateModalComponent } from './aow-hlo-create-modal.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { of, throwError } from 'rxjs';
import { ButtonModule } from 'primeng/button';

describe('AowHloCreateModalComponent', () => {
  let component: AowHloCreateModalComponent;
  let fixture: ComponentFixture<AowHloCreateModalComponent>;
  let entityAowServiceMock: any;
  let apiServiceMock: any;

  beforeEach(async () => {
    entityAowServiceMock = {
      getW3BilateralProjects: jest.fn(),
      getExistingResultsContributors: jest.fn(),
      selectedW3BilateralProjects: signal<any[]>([]),
      selectedEntities: signal<any[]>([]),
      entityAows: signal<any[]>([]),
      sideBarItems: signal<any[]>([]),
      currentResultToReport: signal<any>({
        indicators: [{ result_type_id: 1, result_level_id: 1 }]
      }),
      entityDetails: signal<any>({ id: 1 }),
      onCloseReportResultModal: jest.fn(),
      currentResultIsKnowledgeProduct: signal<boolean>(false),
      mqapJson: signal<any>(null)
    };

    apiServiceMock = {
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_mqapValidation: () => of({ response: { title: 'Title' } }),
        POST_createResult: jest.fn().mockReturnValue(of({ response: { success: true } }))
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    await TestBed.configureTestingModule({
      imports: [AowHloCreateModalComponent, ProgressBarModule, RouterTestingModule, HttpClientTestingModule, ButtonModule],
      providers: [
        { provide: EntityAowService, useValue: entityAowServiceMock },
        { provide: ApiService, useValue: apiServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AowHloCreateModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getTitleInputLabel', () => {
    it('should return the title input label', () => {
      entityAowServiceMock.currentResultIsKnowledgeProduct.set(true);
      component.mqapJson.set({ metadata: [{ source: 'CGSpace' }] });
      expect(component.getTitleInputLabel()).toBe('Title retrived from CGSpace');
    });

    it('should return the title input label', () => {
      entityAowServiceMock.currentResultIsKnowledgeProduct.set(true);
      component.mqapJson.set({ metadata: [{ source: 'MELSpace' }] });
      expect(component.getTitleInputLabel()).toBe('Title retrived from MELSpace');
    });

    it('should return the title input label', () => {
      entityAowServiceMock.currentResultIsKnowledgeProduct.set(false);
      expect(component.getTitleInputLabel()).toBe('Title');
    });
  });

  describe('ngOnInit', () => {
    it('should call getAllDetailsData', () => {
      const getAllDetailsDataSpy = jest.spyOn(entityAowServiceMock, 'getW3BilateralProjects');
      const getExistingResultsContributorsSpy = jest.spyOn(entityAowServiceMock, 'getExistingResultsContributors');
      const getAllInitiativesSpy = jest.spyOn(apiServiceMock.resultsSE, 'GET_AllInitiatives');
      component.ngOnInit();
      expect(getAllDetailsDataSpy).toHaveBeenCalled();
      expect(getExistingResultsContributorsSpy).toHaveBeenCalled();
      expect(getAllInitiativesSpy).toHaveBeenCalled();
    });
  });

  describe('removeBilateralProject', () => {
    it('should remove a bilateral project', () => {
      const project = { project_id: 1, project_name: 'Project 1' };
      entityAowServiceMock.selectedW3BilateralProjects.set([project]);
      component.removeBilateralProject(project);
      expect(entityAowServiceMock.selectedW3BilateralProjects()).toEqual([]);
    });
  });

  describe('removeEntityOption', () => {
    it('should remove an entity option', () => {
      const entity = { id: 1, official_code: 'Entity 1', name: 'Entity 1' };
      entityAowServiceMock.selectedEntities.set([entity]);
      component.removeEntityOption(entity);
      expect(entityAowServiceMock.selectedEntities()).toEqual([]);
    });
  });

  describe('GET_mqapValidation()', () => {
    it('should call GET_mqapValidation', () => {
      component.createResultBody().handler = 'https://cgspace.cgiar.org/handle/10568/139504';
      jest.spyOn(apiServiceMock.resultsSE, 'GET_mqapValidation');
      const showSpy = jest.spyOn(apiServiceMock.alertsFe, 'show');

      component.GET_mqapValidation();

      expect(component.validatingHandler()).toBe(false);
      expect(component.createResultBody().result_name).toBe('Title');
      expect(showSpy).toHaveBeenCalledWith({
        id: 'reportResultSuccess',
        title: 'Metadata successfully retrieved',
        description: 'Title: Title',
        status: 'success'
      });
    });
    it('should show error message if GET_mqapValidation call fails', () => {
      component.createResultBody().handler = 'https://cgspace.cgiar.org/handle/10568/139504';
      jest.spyOn(apiServiceMock.resultsSE, 'GET_mqapValidation').mockReturnValue(throwError({ error: { message: 'Test error message' } }));
      const showSpy = jest.spyOn(apiServiceMock.alertsFe, 'show');

      component.GET_mqapValidation();

      expect(component.validatingHandler()).toBe(false);
      expect(component.createResultBody().result_name).toBe('');
      expect(showSpy).toHaveBeenCalledWith({
        id: 'reportResultError',
        title: 'Error!',
        description: 'Test error message',
        status: 'error'
      });
    });
    it('should set mqapUrlError information if handler is not a valid URL', () => {
      component.createResultBody().handler = 'invalidURL';

      component.GET_mqapValidation();

      expect(component.validatingHandler()).toBe(false);
      expect(component.mqapUrlError().status).toBeTruthy();
      expect(component.mqapUrlError().message).toBe(
        'Please ensure that the handle is from the <a href="https://cgspace.cgiar.org/home" target="_blank" rel="noopener noreferrer">CGSpace repository</a> and not other CGIAR repositories.'
      );
    });

    it('should return mqapUrlError information if handler is empty', () => {
      component.createResultBody().handler = '';

      component.GET_mqapValidation();

      expect(component.validatingHandler()).toBe(false);
      expect(component.mqapUrlError().status).toBeTruthy();
      expect(component.mqapUrlError().message).toBe('Please enter a valid handle.');
    });
  });

  describe('createResult', () => {
    it('should create a result', () => {
      component.createResult();
      expect(apiServiceMock.resultsSE.POST_createResult).toHaveBeenCalled();
      expect(entityAowServiceMock.onCloseReportResultModal).toHaveBeenCalled();
      expect(component.creatingResult()).toBe(false);
    });

    it('should handle error on POST_createResult call', () => {
      jest.spyOn(apiServiceMock.resultsSE, 'POST_createResult').mockReturnValue(throwError({ error: { message: 'Test error message' } }));
      component.createResult();
      expect(apiServiceMock.resultsSE.POST_createResult).toHaveBeenCalled();
      expect(entityAowServiceMock.onCloseReportResultModal).not.toHaveBeenCalled();
      expect(component.creatingResult()).toBe(false);
    });

    it('should handle success on POST_createResult call', () => {
      jest.spyOn(apiServiceMock.resultsSE, 'POST_createResult').mockReturnValue(of({ response: { success: true } }));

      component.createResult();
      expect(apiServiceMock.resultsSE.POST_createResult).toHaveBeenCalled();
      expect(entityAowServiceMock.onCloseReportResultModal).toHaveBeenCalled();
      expect(component.creatingResult()).toBe(false);
    });
  });
});
