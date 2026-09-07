import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { BilateralReviewAccessService } from './bilateral-review-access.service';

describe('BilateralReviewAccessService', () => {
  let service: BilateralReviewAccessService;
  let apiMock: any;

  const configure = () => {
    TestBed.configureTestingModule({
      providers: [BilateralReviewAccessService, { provide: ApiService, useValue: apiMock }]
    });
    service = TestBed.inject(BilateralReviewAccessService);
  };

  it('is true for an admin regardless of program', () => {
    apiMock = { rolesSE: { isAdmin: true }, dataControlSE: { myInitiativesList: [] } };
    configure();
    expect(service.isProgramMember('SP02')).toBe(true);
  });

  it('is true for a non-admin member of the program', () => {
    apiMock = { rolesSE: { isAdmin: false }, dataControlSE: { myInitiativesList: [{ official_code: 'SP02' }] } };
    configure();
    expect(service.isProgramMember('SP02')).toBe(true);
  });

  it('is false for a non-admin who is not a member of that program', () => {
    apiMock = { rolesSE: { isAdmin: false }, dataControlSE: { myInitiativesList: [{ official_code: 'SP02' }] } };
    configure();
    expect(service.isProgramMember('SP03')).toBe(false);
  });

  it('is false for a guest with no initiatives and no admin role', () => {
    apiMock = { rolesSE: { isAdmin: false }, dataControlSE: { myInitiativesList: [] } };
    configure();
    expect(service.isProgramMember('SP02')).toBe(false);
  });

  it('is false when myInitiativesList is missing entirely', () => {
    apiMock = { rolesSE: { isAdmin: false }, dataControlSE: {} };
    configure();
    expect(service.isProgramMember('SP02')).toBe(false);
  });
});
