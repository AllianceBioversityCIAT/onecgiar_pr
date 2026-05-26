import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { RdContributorsAndPartnersService } from './rd-contributors-and-partners.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { ContributorsAndPartnersBody } from './models/contributorsAndPartnersBody';

describe('RdContributorsAndPartnersService', () => {
  let service: RdContributorsAndPartnersService;
  let mockApi: { resultsSE: { GET_ContributorsPartners: jest.Mock } };
  let mockInstitutionsSE: {
    institutionsList: { institutions_id: number; full_name: string }[];
    institutionsWithoutCentersList: { institutions_id: number }[];
    loadedInstitutions: Subject<boolean>;
  };
  let mockCentersSE: {
    centersList: { code: string; full_name: string }[];
    loadedCenters: Subject<boolean>;
  };

  beforeEach(() => {
    mockApi = {
      resultsSE: {
        GET_ContributorsPartners: jest.fn().mockReturnValue(of({ response: {} }))
      }
    };
    mockInstitutionsSE = {
      institutionsList: [
        { institutions_id: 10, full_name: 'Partner A' },
        { institutions_id: 20, full_name: 'Partner B' }
      ],
      institutionsWithoutCentersList: [{ institutions_id: 10 }, { institutions_id: 20 }],
      loadedInstitutions: new Subject<boolean>()
    };
    mockCentersSE = {
      centersList: [
        { code: 'C1', full_name: 'Center One' },
        { code: 'C2', full_name: 'Center Two' }
      ],
      loadedCenters: new Subject<boolean>()
    };

    TestBed.configureTestingModule({
      providers: [
        RdContributorsAndPartnersService,
        { provide: ApiService, useValue: mockApi },
        { provide: InstitutionsService, useValue: mockInstitutionsSE },
        { provide: CentersService, useValue: mockCentersSE }
      ]
    });

    service = TestBed.inject(RdContributorsAndPartnersService);
    service.partnersBody = new ContributorsAndPartnersBody();
  });

  describe('tryAutoAssignLeadCenter', () => {
    beforeEach(() => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' } as any];
      service.setPossibleLeadCenters(false, false);
    });

    it('should assign leadCenterCode when one center and center-led', () => {
      service.leadCenterCode = null;
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBe('C1');
    });

    it('should not assign when two contributing centers', () => {
      service.partnersBody.contributing_center.push({ code: 'C2', name: 'Center Two' } as any);
      service.setPossibleLeadCenters(false, false);
      service.leadCenterCode = null;
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBeNull();
    });

    it('should not overwrite a valid existing lead center', () => {
      service.leadCenterCode = 'C1';
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBe('C1');
    });

    it('should re-assign when lead center is no longer in possible list', () => {
      service.leadCenterCode = 'C99';
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBe('C1');
    });

    it('should skip when led by partner', () => {
      service.partnersBody.is_lead_by_partner = true;
      service.leadCenterCode = null;
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBeNull();
    });
  });

  describe('tryAutoAssignLeadPartner', () => {
    beforeEach(() => {
      service.partnersBody.is_lead_by_partner = true;
      service.partnersBody.institutions = [{ institutions_id: 10 } as any];
      service.setPossibleLeadPartners(false, false);
    });

    it('should assign leadPartnerId when one partner and partner-led', () => {
      service.leadPartnerId = null;
      service.tryAutoAssignLeadPartner();
      expect(service.leadPartnerId).toBe(10);
    });

    it('should not assign when two partners', () => {
      service.partnersBody.institutions.push({ institutions_id: 20 } as any);
      service.setPossibleLeadPartners(false, false);
      service.leadPartnerId = null;
      service.tryAutoAssignLeadPartner();
      expect(service.leadPartnerId).toBeNull();
    });

    it('should skip when not led by partner', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.leadPartnerId = null;
      service.tryAutoAssignLeadPartner();
      expect(service.leadPartnerId).toBeNull();
    });
  });

  describe('onLeadByPartnerChange', () => {
    it('should auto-assign lead center when switching to center-led with one center', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' } as any];
      service.partnersBody.is_lead_by_partner = true;
      service.leadPartnerId = 10;
      service.partnersBody.institutions = [{ institutions_id: 10 } as any];

      service.onLeadByPartnerChange(false);

      expect(service.leadPartnerId).toBeNull();
      expect(service.leadCenterCode).toBe('C1');
    });

    it('should auto-assign lead partner when switching to partner-led with one partner', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' } as any];
      service.partnersBody.institutions = [{ institutions_id: 10 } as any];
      service.partnersBody.is_lead_by_partner = false;
      service.leadCenterCode = 'C1';

      service.onLeadByPartnerChange(true);

      expect(service.leadCenterCode).toBeNull();
      expect(service.leadPartnerId).toBe(10);
    });
  });

  describe('setPossibleLeadCenters auto-assign', () => {
    it('should auto-assign after rebuild when one center remains', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' } as any];
      service.leadCenterCode = null;

      service.setPossibleLeadCenters(false, true);

      expect(service.leadCenterCode).toBe('C1');
    });
  });
});
