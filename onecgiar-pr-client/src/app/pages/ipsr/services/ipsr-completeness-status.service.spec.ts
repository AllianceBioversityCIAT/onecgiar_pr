import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { IpsrCompletenessStatusService } from './ipsr-completeness-status.service';

class MockApiService {
  resultsSE = {
    getCompletenessStatus: jest.fn()
  } as any;
}

class MockIpsrDataControlService {
  detailData: any = { validResult: false };
}

describe('IpsrCompletenessStatusService', () => {
  let service: IpsrCompletenessStatusService;
  let api: MockApiService;
  let ipsrData: MockIpsrDataControlService;

  const mockResponse = {
    validResult: true,
    sectionA: { validation: '1' },
    sectionB: {
      sub1: { validation: '0' },
      sub2: { validation: '1' }
    },
    sectionC: { other: 'x' }
  } as any;

  beforeEach(() => {
    api = new MockApiService();
    ipsrData = new MockIpsrDataControlService();
    api.resultsSE.getCompletenessStatus.mockReturnValue(of({ response: mockResponse }));

    TestBed.configureTestingModule({
      providers: [
        { provide: (jest.requireActual('../../../shared/services/api/api.service') as any).ApiService, useValue: api },
        { provide: (jest.requireActual('./ipsr-data-control.service') as any).IpsrDataControlService, useValue: ipsrData },
        IpsrCompletenessStatusService
      ]
    });

    service = TestBed.inject(IpsrCompletenessStatusService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('flattenObject should map nested validation to boolean by parent key', () => {
    const flat = service.flattenObject({ a: { validation: '1' }, b: { c: { validation: '0' } }, d: { e: { f: { validation: '1' } } } }, '');
    expect(flat).toEqual({ a: true, 'b.c': false, 'd.e.f': true });
  });

  it('updateGreenChecks should set validResult and build flatList from response', () => {
    service.updateGreenChecks();
    expect(api.resultsSE.getCompletenessStatus).toHaveBeenCalled();
    expect(ipsrData.detailData.validResult).toBe(true);
    expect(service.flatList).toEqual({ sectionA: true, 'sectionB.sub1': false, 'sectionB.sub2': true });
  });
});
