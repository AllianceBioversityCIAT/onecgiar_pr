import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdEvidencesComponent } from './rd-evidences.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InnovationControlListService } from '../../../../../../shared/services/global/innovation-control-list.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { firstValueFrom, of } from 'rxjs';
import { NoDataTextComponent } from '../../../../../../custom-fields/no-data-text/no-data-text.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';

jest.useFakeTimers();

describe('RdEvidencesComponent', () => {
  let component: RdEvidencesComponent;
  let fixture: ComponentFixture<RdEvidencesComponent>;
  let mockApiService: any;
  let mockInnovationControlListService: any;
  let mockSaveButtonService: any;
  const mockGET_evidencesResponse = {
    evidences: [],
    innovation_readiness_level_id: 1
  };
  const mockGET_loadFileInUploadSessionResponse = 'sampleUploadUrl';
  const mockPUT_loadFileInUploadSessionResponse = {
    webUrl: 'webUrl',
    id: 'id',
    name: 'name',
    parentReference: {
      path: 'root:path'
    }
  };

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_evidences: () => of({ response: mockGET_evidencesResponse }),
        POST_createUploadSession: async () => firstValueFrom(await Promise.resolve(of(mockGET_loadFileInUploadSessionResponse))),
        GET_loadFileInUploadSession: () => of({ nextExpectedRanges: ['sampleRange'] }),
        PUT_loadFileInUploadSession: () => of(mockPUT_loadFileInUploadSessionResponse),
        POST_evidences: () => of({ response: [] })
      },
      dataControlSE: {
        isKnowledgeProduct: true,
        currentResult: {
          result_type_id: 5
        }
      }
    };

    mockInnovationControlListService = {
      readinessLevelsList: [
        {
          id: 1,
          name: 'Level 1'
        }
      ]
    };

    mockSaveButtonService = {
      showSaveSpinner: jest.fn(),
      hideSaveSpinner: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [RdEvidencesComponent, NoDataTextComponent, AlertStatusComponent, SaveButtonComponent, DetailSectionTitleComponent],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: InnovationControlListService,
          useValue: mockInnovationControlListService
        },
        {
          provide: SaveButtonService,
          useValue: mockSaveButtonService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RdEvidencesComponent);
    component = fixture.componentInstance;
  });

  describe('alertStatus', () => {
    it('should return appropriate text when isKnowledgeProduct is true', () => {
      const result = component.alertStatus();
      expect(result).toBe(
        'As this knowledge product is stored in the repository, this section only requires an indication of whether the knowledge product is associated with any of the Impact Area tags provided below.'
      );
    });

    it('should return main text when isKnowledgeProduct is false', () => {
      mockApiService.dataControlSE.isKnowledgeProduct = false;
      const result = component.alertStatus();
      expect(result).toContain('Submit a maximum of 6 pieces of evidence.');
    });
  });

  describe('ngOnInit()', () => {
    it('should call getSectionInformation() and validateCheckBoxes() on initialization', () => {
      const spy = jest.spyOn(component, 'getSectionInformation');
      const spyValidateCheckBoxes = jest.spyOn(component, 'validateCheckBoxes');

      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
      expect(spyValidateCheckBoxes).toHaveBeenCalled();
    });
  });

  describe('getSectionInformation', () => {
    it('should set evidencesBody and related properties on successful GET_evidences response', () => {
      jest.spyOn(mockApiService.resultsSE, 'GET_evidences');

      component.getSectionInformation();

      expect(component.evidencesBody).toEqual(mockGET_evidencesResponse);
      expect(component.readinessLevel).toBe(0);
      expect(component.isOptional).toBeTruthy();
    });
  });

  describe('getAndCalculateFilePercentage', () => {
    it('should calculate file percentage and update evidenceIterator', () => {
      const response = {
        nextExpectedRanges: ['0-1024']
      };
      const evidenceIterator = {
        percentage: 0
      };
      component.getAndCalculateFilePercentage(response, evidenceIterator);

      expect(evidenceIterator.percentage).toBe('0');
    });

    it('should not update percentage if totalBytes is zero', () => {
      const response = {
        nextExpectedRanges: ['0-0']
      };
      const evidenceIterator = {
        percentage: 50
      };

      component.getAndCalculateFilePercentage(response, evidenceIterator);

      expect(evidenceIterator.percentage).toBe(50);
    });

    it('should calculate file percentage and update evidenceIterator', () => {
      const response = {
        nextExpectedRanges: ['0-']
      };
      const evidenceIterator = {
        percentage: 0
      };

      component.getAndCalculateFilePercentage(response, evidenceIterator);

      expect(evidenceIterator.percentage).toBe(0);
    });

    it('should handle null or undefined nextRange', () => {
      const response = { nextExpectedRanges: [null] };
      const evidenceIterator = { percentage: 50 };
      component.getAndCalculateFilePercentage(response, evidenceIterator);
      expect(evidenceIterator.percentage).toBe(50);
    });
  });

  describe('endLoadFile', () => {
    it('should clear the interval and set the percentage to 100', () => {
      const spy = jest.spyOn(global, 'clearInterval');
      const intervalId = setInterval(() => {}, 100);
      const evidenceIterator = { percentage: 50 };

      component.endLoadFile(intervalId, evidenceIterator);

      expect(spy).toHaveBeenCalledWith(intervalId);
      expect(evidenceIterator.percentage).toBe(100);
    });
  });

  describe('loadAllFiles', () => {
    it('should load files and update evidence properties', async () => {
      const mockEvidences = [{ file: new File([], 'file1.pdf') }, { file: new File([], 'file2.pdf') }, { file: undefined }];
      component.evidencesBody.evidences = mockEvidences;
      const spyEndLoadFile = jest.spyOn(component, 'endLoadFile');
      const spyPOST_createUploadSession = jest.spyOn(mockApiService.resultsSE, 'POST_createUploadSession');
      const spyPUT_loadFileInUploadSession = jest.spyOn(mockApiService.resultsSE, 'PUT_loadFileInUploadSession');

      await component.loadAllFiles();

      jest.advanceTimersByTime(2000);
      jest.runOnlyPendingTimers();

      expect(spyPOST_createUploadSession).toHaveBeenCalled();
      expect(spyPUT_loadFileInUploadSession).toHaveBeenCalled();
      expect(spyEndLoadFile).toHaveBeenCalled();
    });

    it('should handle errors in loadAllFiles', async () => {
      const mockEvidences = [{ file: new File([], 'file1.pdf') }, { file: new File([], 'file2.pdf') }, { file: undefined }];
      component.evidencesBody.evidences = mockEvidences;
      jest.spyOn(mockApiService.resultsSE, 'POST_createUploadSession').mockRejectedValue('Error from POST_createUploadSession');
      const consoleSpy = jest.spyOn(console, 'error');

      await component.loadAllFiles();

      expect(consoleSpy).toHaveBeenCalledWith('Error from POST_createUploadSession');
    });
  });

  describe('onSaveSection', () => {
    it('should show and hide save spinner, load files, and call POST_evidences', async () => {
      const spy = jest.spyOn(component, 'loadAllFiles');
      const spyShowSaveSpinner = jest.spyOn(mockSaveButtonService, 'showSaveSpinner');
      const spyHideSaveSpinner = jest.spyOn(mockSaveButtonService, 'hideSaveSpinner');
      const spyPOST_evidences = jest.spyOn(mockApiService.resultsSE, 'POST_evidences');

      await component.onSaveSection();

      expect(spyShowSaveSpinner).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
      expect(spyHideSaveSpinner).toHaveBeenCalled();
      expect(spyPOST_evidences).toHaveBeenCalled();
    });
  });

  describe('addEvidence', () => {
    it('should add a new evidence to the evidencesBody array', () => {
      component.addEvidence();

      expect(component.evidencesBody.evidences).toHaveLength(1);
      const newEvidence = component.evidencesBody.evidences[0];
      expect(newEvidence).toEqual({ is_sharepoint: false });
    });
  });

  describe('deleteEvidence', () => {
    it('should delete evidence from the evidencesBody', () => {
      const mockEvidences = [{ is_sharepoint: false }, { is_sharepoint: true }, { is_sharepoint: false }];
      const evidencesBody = {
        result_id: 1,
        evidences: mockEvidences,
        gender_tag_level: '',
        climate_change_tag_level: '',
        nutrition_tag_level: '',
        environmental_biodiversity_tag_level: '',
        poverty_tag_level: ''
      };
      component.evidencesBody = evidencesBody;

      component.deleteEvidence(1);

      expect(component.evidencesBody.evidences).toEqual([{ is_sharepoint: false }, { is_sharepoint: false }]);
    });
  });

  describe('validateCheckBoxes', () => {
    it('should update isOptional based on tag levels and evidence relations', () => {
      component.evidencesBody = {
        result_id: 1,
        gender_tag_level: '3',
        climate_change_tag_level: '2',
        nutrition_tag_level: '1',
        environmental_biodiversity_tag_level: '2',
        poverty_tag_level: '3',
        evidences: [
          {
            gender_related: true,
            youth_related: false,
            nutrition_related: true,
            environmental_biodiversity_related: false,
            poverty_related: false
          }
        ]
      };

      const result = component.validateCheckBoxes();

      expect(component.isOptional).toBe(false);
      expect(result).toContain('<ul>');
    });
  });

  describe('validateButtonDisabled', () => {
    it('should return true if conditions for links are met', () => {
      component.evidencesBody = {
        result_id: 1,
        gender_tag_level: '3',
        climate_change_tag_level: '2',
        nutrition_tag_level: '1',
        environmental_biodiversity_tag_level: '2',
        poverty_tag_level: '3',
        evidences: [
          { link: 'link', is_sharepoint: false, file: null },
          { link: 'link', is_sharepoint: false, file: null },
          { link: null, is_sharepoint: true, file: null }
        ]
      };

      const result = component.validateButtonDisabled;

      expect(result).toBeTruthy();
    });

    it('should return true if conditions for links are not met', () => {
      component.evidencesBody = {
        result_id: 1,
        gender_tag_level: '3',
        climate_change_tag_level: '2',
        nutrition_tag_level: '1',
        environmental_biodiversity_tag_level: '2',
        poverty_tag_level: '3',
        evidences: [
          { link: null, is_sharepoint: false, file: null },
          { link: null, is_sharepoint: false, file: null },
          { link: null, is_sharepoint: false, file: null }
        ]
      };

      const result = component.validateButtonDisabled;

      expect(result).toBeTruthy();
    });

    it('should return true if is_sharepoint is true and both file and link are falsy', () => {
      component.evidencesBody = {
        result_id: 1,
        gender_tag_level: '3',
        climate_change_tag_level: '2',
        nutrition_tag_level: '1',
        environmental_biodiversity_tag_level: '2',
        poverty_tag_level: '3',
        evidences: [
          { link: null, is_sharepoint: true, file: null },
          { link: null, is_sharepoint: true, file: null },
          { link: null, is_sharepoint: true, file: null }
        ]
      };

      const result = component.validateButtonDisabled;

      expect(result).toBeTruthy();
    });

    it('should return false if no evidence meets the conditions', () => {
      component.evidencesBody = {
        result_id: 1,
        gender_tag_level: '3',
        climate_change_tag_level: '2',
        nutrition_tag_level: '1',
        environmental_biodiversity_tag_level: '2',
        poverty_tag_level: '3',
        evidences: []
      };

      const result = component.validateButtonDisabled;

      expect(result).toBeFalsy();
    });
  });

  describe('validateHasInnoReadinessLevelEvidence', () => {
    it('should return true if isOptionalReadinessLevel is true', () => {
      component.isOptionalReadinessLevel = true;
      const result = component.validateHasInnoReadinessLevelEvidence();
      expect(result).toBe(true);
    });

    it('should return true if any evidence has innovation_readiness_related set to true', () => {
      component.isOptionalReadinessLevel = false;
      component.evidencesBody.evidences = [{ innovation_readiness_related: false }, { innovation_readiness_related: true }];
      const result = component.validateHasInnoReadinessLevelEvidence();
      expect(result).toBe(true);
    });

    it('should return false if no evidence has innovation_readiness_related set to true', () => {
      component.isOptionalReadinessLevel = false;
      component.evidencesBody.evidences = [{ innovation_readiness_related: false }, { innovation_readiness_related: false }];
      const result = component.validateHasInnoReadinessLevelEvidence();
      expect(result).toBe(false);
    });

    it('should return false if evidences array is empty', () => {
      component.isOptionalReadinessLevel = false;
      component.evidencesBody.evidences = [];
      const result = component.validateHasInnoReadinessLevelEvidence();
      expect(result).toBe(false);
    });
  });
});
