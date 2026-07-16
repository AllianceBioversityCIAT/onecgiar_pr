import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BilateralAutoSaveService } from './bilateral-auto-save.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

describe('BilateralAutoSaveService', () => {
  let service: BilateralAutoSaveService;
  let mockBilateralApi: jest.Mocked<Pick<
    BilateralApiService,
    'PATCH_generalInfo' | 'PATCH_plannedResult' | 'PATCH_tocMapping' | 'PATCH_contributors' | 'GET_tocState'
  >>;

  beforeEach(() => {
    mockBilateralApi = {
      PATCH_generalInfo: jest.fn().mockReturnValue(of({})),
      PATCH_plannedResult: jest.fn().mockReturnValue(of({})),
      PATCH_tocMapping: jest.fn().mockReturnValue(of({})),
      PATCH_contributors: jest.fn().mockReturnValue(of({})),
      GET_tocState: jest.fn().mockReturnValue(of({ response: {} })),
    };

    TestBed.configureTestingModule({
      providers: [
        BilateralAutoSaveService,
        { provide: BilateralApiService, useValue: mockBilateralApi },
      ],
    });

    service = TestBed.inject(BilateralAutoSaveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register a field', () => {
    service.registerField('title', 'text');
    expect(service.fieldStatus()['title']).toBe('idle');
  });

  it('should set saving status on text field update', () => {
    service.registerField('title', 'text');
    service.updateField('title', 'New Title', 'text');
    expect(service.fieldStatus()['title']).toBe('saving');
  });

  it('should reset all state', () => {
    service.registerField('title', 'text');
    service.updateField('title', 'New Title', 'text');
    service.reset();
    expect(service.fieldStatus()).toEqual({});
    expect(service.hasPendingSaves()).toBe(false);
  });

  it('should set result id', () => {
    service.setResultId(42);
    expect(service.hasPendingSaves()).toBe(false);
  });

  it('should flush general-info via PATCH_generalInfo', () => {
    service.setResultId(42);
    service.updateFieldsBatch({ title: 'Hello' });
    expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(42, { title: 'Hello' });
  });

  it('should save contributors via PATCH_contributors', () => {
    service.setResultId(7);
    service.saveContributors({ contributing_center: [{ institution_id: 1 }] });
    expect(mockBilateralApi.PATCH_contributors).toHaveBeenCalledWith(7, {
      contributing_center: [{ institution_id: 1 }],
    });
  });
});
