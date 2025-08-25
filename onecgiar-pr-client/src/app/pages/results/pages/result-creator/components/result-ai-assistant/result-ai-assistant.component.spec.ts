import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ResultAiAssistantComponent } from './result-ai-assistant.component';
import { CreateResultManagementService } from '../../services/create-result-management.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { AiLoadingStateService } from './components/ai-loading-state/services/ai-loading-state.service';
import { Initiative } from '../../../../../../shared/interfaces/initiatives.interface';

describe('ResultAiAssistantComponent', () => {
  let component: ResultAiAssistantComponent;
  let fixture: ComponentFixture<ResultAiAssistantComponent>;

  let createResultManagementServiceMock: any;
  let apiServiceMock: any;
  let loadingStateServiceMock: any;

  beforeEach(async () => {
    jest.useFakeTimers();

    createResultManagementServiceMock = {
      selectedFile: signal<File | null>(null),
      selectedInitiative: signal<Initiative | null>(null),
      // Signals used by the component under test
      analyzingDocument: signal<boolean>(false),
      documentAnalyzed: signal<boolean>(false),
      noResults: signal<boolean>(false),
      items: signal<any[]>([]),
      // Other methods referenced elsewhere in the feature
      closeModal: jest.fn(),
      goBackToUploadNewFile: jest.fn(),
      showModal: jest.fn()
    } as any;

    apiServiceMock = {
      dataControlSE: {
        reportingCurrentPhase: {
          portfolioAcronym: 'test',
          phaseName: 'test',
          phaseYear: 'test',
          phaseId: 'test'
        }
      },
      resultsSE: {
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] }))
      }
    } as any;

    loadingStateServiceMock = {
      startLoadingProgress: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      // Import the standalone component so its own imports are honored
      imports: [ResultAiAssistantComponent, HttpClientTestingModule],
      providers: [
        { provide: CreateResultManagementService, useValue: createResultManagementServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AiLoadingStateService, useValue: loadingStateServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultAiAssistantComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initiatives on init', () => {
    fixture.detectChanges();
    expect(apiServiceMock.resultsSE.GET_AllInitiatives).toHaveBeenCalledWith('test');
    expect(component.initiatives().length).toBe(0);
  });

  it('should start analysis and update states after timeout', () => {
    component.handleAnalyzeFile();

    expect(createResultManagementServiceMock.analyzingDocument()).toBe(true);
    expect(loadingStateServiceMock.startLoadingProgress).toHaveBeenCalled();

    jest.advanceTimersByTime(5000);

    expect(createResultManagementServiceMock.documentAnalyzed()).toBe(true);
    expect(createResultManagementServiceMock.noResults()).toBe(false);
    expect(createResultManagementServiceMock.items().length).toBe(1);
  });

  it('should update pagination state on page change, using ?? fallback', () => {
    // defaults
    expect(component.first()).toBe(0);
    expect(component.rows()).toBe(5);

    // Should set to provided values
    component.onPageChange({ first: 10, rows: 20 } as any);
    expect(component.first()).toBe(10);
    expect(component.rows()).toBe(20);

    // Should fallback to 0 and 5 if undefined (?? operator)
    component.onPageChange({ first: undefined, rows: undefined } as any);
    expect(component.first()).toBe(0);
    expect(component.rows()).toBe(5);

    // Should fallback to 0 and 5 if null (?? operator)
    component.onPageChange({ first: null, rows: null } as any);
    expect(component.first()).toBe(0);
    expect(component.rows()).toBe(5);
  });
});
