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
import { signal } from '@angular/core';

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
        },
        currentResultSectionName: signal<string>('Evidences')
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
      expect(result).toContain('Submit a maximum of 6 pieces of evidence per result.');
      expect(result).not.toContain('Please list evidence from most to least important.');
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
    it('should open the creation modal with a clean draft (not push directly)', () => {
      component.addEvidence();

      expect(component.showCreateModal).toBe(true);
      expect(component.draftEvidence).toEqual({ is_sharepoint: false });
      expect(component.evidencesBody.evidences).toHaveLength(0);
    });
  });

  describe('editEvidence', () => {
    it('should open the modal in edit mode with a clone of the selected evidence', () => {
      const original = { is_sharepoint: false, link: 'original-link' };
      component.evidencesBody.evidences = [original];

      component.editEvidence(0);

      expect(component.showCreateModal).toBe(true);
      expect(component.editingIndex).toBe(0);
      expect(component.isEditingEvidence).toBe(true);
      expect(component.draftEvidence).toEqual(original);
      // It must be a clone, not the same reference (so Cancel can discard changes).
      expect(component.draftEvidence).not.toBe(original);
    });
  });

  describe('confirmCreateEvidence', () => {
    it('should prepend the draft to the top of the list, close the modal and persist via onSaveSection', () => {
      const saveSpy = jest.spyOn(component, 'onSaveSection').mockResolvedValue(undefined);
      component.evidencesBody.evidences = [{ is_sharepoint: true, link: 'existing' }];
      component.draftEvidence = { is_sharepoint: false, link: 'new-link' };
      component.showCreateModal = true;

      component.confirmCreateEvidence();

      expect(component.evidencesBody.evidences[0]).toEqual({ is_sharepoint: false, link: 'new-link' });
      expect(component.evidencesBody.evidences).toHaveLength(2);
      expect(component.showCreateModal).toBe(false);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should replace the edited evidence in place when editing and persist via onSaveSection', () => {
      const saveSpy = jest.spyOn(component, 'onSaveSection').mockResolvedValue(undefined);
      component.evidencesBody.evidences = [
        { is_sharepoint: false, link: 'first' },
        { is_sharepoint: false, link: 'second' }
      ];
      component.editEvidence(1);
      component.draftEvidence = { is_sharepoint: false, link: 'second-edited' };

      component.confirmCreateEvidence();

      expect(component.evidencesBody.evidences).toHaveLength(2);
      expect(component.evidencesBody.evidences[1]).toEqual({ is_sharepoint: false, link: 'second-edited' });
      expect(component.editingIndex).toBeNull();
      expect(component.isEditingEvidence).toBe(false);
      expect(component.showCreateModal).toBe(false);
      expect(saveSpy).toHaveBeenCalled();
    });
  });

  describe('cancelCreateEvidence', () => {
    it('should close the modal and discard the draft', () => {
      component.draftEvidence = { is_sharepoint: false, link: 'discard-me' };
      component.showCreateModal = true;

      component.cancelCreateEvidence();

      expect(component.showCreateModal).toBe(false);
      expect(component.draftEvidence).toEqual({ is_sharepoint: false });
      expect(component.evidencesBody.evidences).toHaveLength(0);
    });
  });

  describe('upload skeleton state', () => {
    const fileEvidence = () => ({ is_sharepoint: true, file: new File([''], 'doc.pdf') } as any);

    it('isEvidenceUploading is true for a file without link while saving', () => {
      component.isSaving = true;
      expect(component.isEvidenceUploading(fileEvidence())).toBe(true);
    });

    it('isEvidenceUploading is false once the link is resolved', () => {
      component.isSaving = true;
      expect(component.isEvidenceUploading({ ...fileEvidence(), link: 'https://x' })).toBe(false);
    });

    it('isEvidenceUploading is false when not saving', () => {
      component.isSaving = false;
      expect(component.isEvidenceUploading(fileEvidence())).toBe(false);
    });

    it('evidenceUploadingName prefers file name, then sp_file_name, then a fallback', () => {
      expect(component.evidenceUploadingName({ file: { name: 'doc.pdf' } } as any)).toBe('doc.pdf');
      expect(component.evidenceUploadingName({ sp_file_name: 'server.pdf' } as any)).toBe('server.pdf');
      expect(component.evidenceUploadingName({} as any)).toBe('Uploading file…');
    });

    it('getSectionInformation clears isSaving after reload', () => {
      component.isSaving = true;
      component.getSectionInformation();
      expect(component.isSaving).toBe(false);
    });
  });

  describe('sortEvidences', () => {
    it('should order evidences newest-first by date then id', () => {
      component.evidencesBody.evidences = [
        { id: 1, creation_date: '2026-01-01T10:00:00Z' },
        { id: 2, creation_date: '2026-03-01T10:00:00Z' },
        { id: 3, last_updated_date: '2026-06-01T10:00:00Z', creation_date: '2026-02-01T10:00:00Z' }
      ];

      component.sortEvidences();

      expect(component.evidencesBody.evidences.map(e => e.id)).toEqual([3, 2, 1]);
    });
  });

  describe('accordion header helpers', () => {
    it('isFileEvidence / evidenceTypeLabel reflect is_sharepoint', () => {
      expect(component.isFileEvidence({ is_sharepoint: true })).toBe(true);
      expect(component.evidenceTypeLabel({ is_sharepoint: true })).toBe('File Evidence');
      expect(component.evidenceTypeLabel({ is_sharepoint: false })).toBe('Link Evidence');
    });

    it('getSelectedImpactTags returns labels of marked fields', () => {
      const tags = component.getSelectedImpactTags({ gender_related: true, youth_related: true });
      expect(tags).toEqual(['Gender', 'Climate change']);
    });

    it('evidenceDisplayName prefers file name then link', () => {
      expect(component.evidenceDisplayName({ sp_file_name: 'doc.pdf', link: 'x' })).toBe('doc.pdf');
      expect(component.evidenceDisplayName({ link: 'https://x' })).toBe('https://x');
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
      expect(result).toContain('A principal contribution score (2) has been recorded for Poverty reduction, livelihoods and jobs tag. Please provide evidence to support this claim.');
      expect(result).not.toContain(' if ');
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
