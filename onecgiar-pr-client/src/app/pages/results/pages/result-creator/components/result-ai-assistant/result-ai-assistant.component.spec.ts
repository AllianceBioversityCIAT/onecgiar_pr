import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ResultAiAssistantComponent } from './result-ai-assistant.component';
import { CreateResultManagementService } from '../../services/create-result-management.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { AiLoadingStateService } from './components/ai-loading-state/services/ai-loading-state.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { Initiative } from '../../../../../../shared/interfaces/initiatives.interface';
import { AIAssistantResult } from '../../../../../../shared/interfaces/AIAssistantResult';

describe('ResultAiAssistantComponent', () => {
  let component: ResultAiAssistantComponent;
  let fixture: ComponentFixture<ResultAiAssistantComponent>;

  let createResultManagementServiceMock: any;
  let apiServiceMock: any;
  let loadingStateServiceMock: any;
  let customizedAlertsFeServiceMock: any;

  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
  const mockInitiatives: Initiative[] = [{ id: 1, name: 'Initiative 1' } as Initiative, { id: 2, name: 'Initiative 2' } as Initiative];

  beforeEach(async () => {
    createResultManagementServiceMock = {
      selectedInitiative: signal<Initiative | null>(null),
      selectedFile: signal<File | null>(null),
      analyzingDocument: signal<boolean>(false),
      documentAnalyzed: signal<boolean>(false),
      noResults: signal<boolean>(false),
      items: signal<AIAssistantResult[]>([]),
      pageLimit: 10,
      maxSizeMB: 5,
      showModal: jest.fn()
    };

    apiServiceMock = {
      dataControlSE: {
        reportingCurrentPhase: {
          portfolioAcronym: 'test-portfolio'
        }
      },
      authSE: {
        localStorageToken: 'test-token'
      },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: mockInitiatives })),
        POST_uploadFile: jest.fn(),
        POST_fileMining: jest.fn()
      }
    };

    loadingStateServiceMock = {
      startLoadingProgress: jest.fn(),
      stopLoadingProgress: jest.fn()
    };

    customizedAlertsFeServiceMock = {
      show: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ResultAiAssistantComponent, HttpClientTestingModule],
      providers: [
        { provide: CreateResultManagementService, useValue: createResultManagementServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AiLoadingStateService, useValue: loadingStateServiceMock },
        { provide: CustomizedAlertsFeService, useValue: customizedAlertsFeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultAiAssistantComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load initiatives on init', () => {
      fixture.detectChanges();

      expect(apiServiceMock.resultsSE.GET_AllInitiatives).toHaveBeenCalledWith('test-portfolio');
      expect(component.initiatives()).toEqual(mockInitiatives);
    });
  });

  describe('handleAnalyzeFile', () => {
    it('should show warning when no file is selected', () => {
      createResultManagementServiceMock.selectedFile = signal<File | null>(null);

      component.handleAnalyzeFile();

      expect(customizedAlertsFeServiceMock.show).toHaveBeenCalledWith({
        id: 'confirm-delete-item',
        title: 'No file selected',
        description: 'Please choose a file to analyze and try again.',
        status: 'warning'
      });
    });

    it('should start analysis when file is selected', () => {
      createResultManagementServiceMock.selectedFile = signal<File | null>(mockFile);
      apiServiceMock.resultsSE.POST_uploadFile.mockReturnValue(of({ data: { filename: 'test-file.pdf' } }));
      apiServiceMock.resultsSE.POST_fileMining.mockReturnValue(of({ content: [] }));

      component.handleAnalyzeFile();

      // The startAnalysis method is called synchronously, so we can check immediately
      expect(loadingStateServiceMock.startLoadingProgress).toHaveBeenCalled();
    });
  });

  describe('file upload process', () => {
    beforeEach(() => {
      createResultManagementServiceMock.selectedFile = signal<File | null>(mockFile);
    });

    it('should create correct upload form data', () => {
      const formData = component['createUploadFormData']();

      expect(formData.get('file')).toEqual(mockFile);
      expect(formData.get('bucketName')).toBe('ai-services-ibd');
      expect(formData.get('fileName')).toBe('test.pdf');
      expect(formData.get('weightLimit')).toBe('5242880'); // 5MB in bytes
      expect(formData.get('pageLimit')).toBe('10');
    });

    it('should create correct upload headers', () => {
      const headers = component['createUploadHeaders']();

      expect(headers.get('access-token')).toBe('test-token');
      expect(headers.get('environment-url')).toBeDefined();
    });

    it('should handle successful file upload', () => {
      const uploadResponse = { data: { filename: 'uploaded-file.pdf' } };
      apiServiceMock.resultsSE.POST_uploadFile.mockReturnValue(of(uploadResponse));
      apiServiceMock.resultsSE.POST_fileMining.mockReturnValue(of({ content: [] }));

      component.handleAnalyzeFile();

      expect(apiServiceMock.resultsSE.POST_uploadFile).toHaveBeenCalled();
    });

    it('should handle file upload error', () => {
      const error = { message: 'Upload failed' };
      apiServiceMock.resultsSE.POST_uploadFile.mockReturnValue(throwError(() => error));

      component.handleAnalyzeFile();

      expect(customizedAlertsFeServiceMock.show).toHaveBeenCalledWith({
        id: 'confirm-delete-item',
        title: 'Error uploading file for analysis',
        description: 'Error processing file content. Please try again.',
        status: 'error'
      });
    });
  });

  describe('file mining process', () => {
    it('should create correct mining form data', () => {
      const formData = component['createMiningFormData']('test-file.pdf');

      expect(formData.get('token')).toBe('test-token');
      expect(formData.get('key')).toBe('prms/text-mining/files/test-file.pdf');
      expect(formData.get('bucketName')).toBe('ai-services-ibd');
    });

    it('should create correct mining headers', () => {
      const headers = component['createMiningHeaders']();

      expect(headers.get('access-token')).toBe('test-token');
    });

    it('should handle successful file mining with results', () => {
      const miningResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              results: [
                {
                  indicator: 'Test Indicator',
                  title: 'Test Title',
                  description: 'Test Description'
                }
              ]
            })
          }
        ]
      };

      apiServiceMock.resultsSE.POST_fileMining.mockReturnValue(of(miningResponse));

      component['processFileMining']('test-file.pdf');

      expect(createResultManagementServiceMock.items().length).toBe(1);
      expect(createResultManagementServiceMock.documentAnalyzed()).toBe(true);
      expect(createResultManagementServiceMock.analyzingDocument()).toBe(false);
    });

    it('should handle file mining with no results', () => {
      const miningResponse = { content: [] };
      apiServiceMock.resultsSE.POST_fileMining.mockReturnValue(of(miningResponse));

      component['processFileMining']('test-file.pdf');

      expect(createResultManagementServiceMock.noResults()).toBe(true);
      expect(createResultManagementServiceMock.analyzingDocument()).toBe(false);
    });

    it('should handle file mining error', () => {
      const error = { message: 'Mining failed' };
      apiServiceMock.resultsSE.POST_fileMining.mockReturnValue(throwError(() => error));

      component['processFileMining']('test-file.pdf');

      expect(customizedAlertsFeServiceMock.show).toHaveBeenCalledWith({
        id: 'confirm-delete-item',
        title: 'Error processing file content',
        description: 'Error processing file content. Please try again.',
        status: 'error'
      });
    });

    it('should handle invalid response format from upload', () => {
      createResultManagementServiceMock.selectedFile = signal<File | null>(mockFile);
      const invalidResponse = { data: {} }; // Missing filename
      apiServiceMock.resultsSE.POST_uploadFile.mockReturnValue(of(invalidResponse));

      component.handleAnalyzeFile();

      expect(customizedAlertsFeServiceMock.show).toHaveBeenCalledWith({
        id: 'confirm-delete-item',
        title: 'Invalid response format from file upload',
        description: 'Error processing file content. Please try again.',
        status: 'error'
      });
    });
  });

  describe('data mapping', () => {
    it('should map AI results correctly', () => {
      const rawResults: AIAssistantResult[] = [
        {
          indicator: 'Test Indicator',
          title: 'Test Title',
          description: 'Test Description',
          keywords: ['test', 'keyword'],
          geoscope: [{ country_code: 'US', areas: ['Global'] }],
          training_type: 'Workshop',
          length_of_training: '2 days',
          start_date: '2024-01-01',
          end_date: '2024-01-02',
          degree: 'Bachelor',
          delivery_modality: 'Online',
          total_participants: 100,
          evidence_for_stage: 'Strong',
          policy_type: 'National',
          alliance_main_contact_person_first_name: 'John',
          alliance_main_contact_person_last_name: 'Doe',
          stage_in_policy_process: 'Implementation',
          male_participants: 50,
          female_participants: 50,
          non_binary_participants: '0',
          innovation_nature: 'Technical',
          innovation_type: 'Product',
          assess_readiness: 1,
          anticipated_users: 'Farmers',
          organization_type: ['NGO'],
          organization_sub_type: 'Research',
          organizations: ['Org1', 'Org2'],
          innovation_actors_detailed: [{ name: 'Actor1', type: 'Individual', gender_age: ['Male', 'Adult'] }]
        }
      ];

      const mappedResults = component['mapResultRawAiToAIAssistantResult'](rawResults);

      expect(mappedResults[0]).toEqual(rawResults[0]);
    });

    it('should handle missing optional fields with defaults', () => {
      const rawResults: AIAssistantResult[] = [
        {
          indicator: 'Test',
          title: 'Test',
          description: 'Test',
          keywords: [],
          geoscope: undefined,
          male_participants: undefined,
          female_participants: undefined,
          non_binary_participants: undefined,
          training_type: 'Test',
          length_of_training: 'Test',
          start_date: 'Test',
          end_date: 'Test',
          degree: 'Test',
          delivery_modality: 'Test',
          total_participants: 0,
          evidence_for_stage: 'Test',
          policy_type: 'Test',
          stage_in_policy_process: 'Test',
          alliance_main_contact_person_first_name: 'Test',
          alliance_main_contact_person_last_name: 'Test'
        } as AIAssistantResult
      ];

      const mappedResults = component['mapResultRawAiToAIAssistantResult'](rawResults);

      expect(mappedResults[0].geoscope).toEqual([]);
      expect(mappedResults[0].male_participants).toBe(0);
      expect(mappedResults[0].female_participants).toBe(0);
      expect(mappedResults[0].non_binary_participants).toBe('0');
    });
  });

  describe('pagination', () => {
    it('should update pagination state on page change', () => {
      expect(component.first()).toBe(0);
      expect(component.rows()).toBe(5);

      component.onPageChange({ first: 10, rows: 20 } as any);

      expect(component.first()).toBe(10);
      expect(component.rows()).toBe(20);
    });

    it('should use fallback values for undefined pagination', () => {
      component.onPageChange({ first: undefined, rows: undefined } as any);

      expect(component.first()).toBe(0);
      expect(component.rows()).toBe(5);
    });

    it('should use fallback values for null pagination', () => {
      component.onPageChange({ first: null, rows: null } as any);

      expect(component.first()).toBe(0);
      expect(component.rows()).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should reset analysis state on error', () => {
      component['handleError']('Test error');

      expect(createResultManagementServiceMock.analyzingDocument()).toBe(false);
      expect(loadingStateServiceMock.stopLoadingProgress).toHaveBeenCalled();
    });

    it('should show error alert on error', () => {
      component['handleError']('Test error');

      expect(customizedAlertsFeServiceMock.show).toHaveBeenCalledWith({
        id: 'confirm-delete-item',
        title: 'Test error',
        description: 'Error processing file content. Please try again.',
        status: 'error'
      });
    });
  });

  describe('utility methods', () => {
    it('should calculate weight limit in bytes correctly', () => {
      const weightLimit = component['calculateWeightLimitBytes']();

      expect(weightLimit).toBe(5 * 1024 * 1024); // 5MB in bytes
    });
  });
});
