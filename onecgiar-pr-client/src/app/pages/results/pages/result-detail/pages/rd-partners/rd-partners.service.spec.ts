import { RdPartnersService } from './rd-partners.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { Observable, of, Subject } from 'rxjs';

describe('RdPartnersService', () => {
  let service: RdPartnersService;
  let apiServiceMock: jest.Mocked<ApiService>;
  let institutionsServiceMock: jest.Mocked<InstitutionsService>;
  let centersServiceMock: jest.Mocked<CentersService>;

  beforeEach(() => {
    apiServiceMock = {
      rolesSE: {
        readOnly: false
      },
      resultsSE: {
        GET_partnersSection: jest.fn().mockReturnValue(of({ response: {} }))
      }
    } as unknown as jest.Mocked<ApiService>;

    institutionsServiceMock = {
      loadedInstitutions: new Subject(),
      institutionsList: [],
      institutionsWithoutCentersList: []
    } as unknown as jest.Mocked<InstitutionsService>;

    centersServiceMock = {
      loadedCenters: new Subject(),
      centersList: []
    } as unknown as jest.Mocked<CentersService>;

    service = new RdPartnersService(apiServiceMock, institutionsServiceMock, centersServiceMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should unsubscribe on destroy', () => {
    const institutionsUnsubscribeSpy = jest.spyOn(institutionsServiceMock.loadedInstitutions, 'unsubscribe');
    const centersUnsubscribeSpy = jest.spyOn(centersServiceMock.loadedCenters, 'unsubscribe');

    service.ngOnDestroy();

    expect(institutionsUnsubscribeSpy).toHaveBeenCalled();
    expect(centersUnsubscribeSpy).toHaveBeenCalled();
  });

  describe('validateDeliverySelection', () => {
    it('should return false if deliveries is not an array', () => {
      expect(service.validateDeliverySelection(true, 1)).toBe(false);
      expect(service.validateDeliverySelection('string', 1)).toBe(false);
    });

    it('should return false if deliveryId is not found', () => {
      expect(service.validateDeliverySelection([2, 3], 1)).toBe(false);
    });

    it('should return true if deliveryId is found', () => {
      expect(service.validateDeliverySelection([1, 2, 3], 1)).toBe(true);
    });
  });

  describe('onSelectDelivery', () => {
    it('should do nothing if readOnly is true', () => {
      apiServiceMock.rolesSE.readOnly = true;
      const option = { deliveries: [1, 2, 3] };

      service.onSelectDelivery(option, 4);
      expect(option.deliveries).toEqual([1, 2, 3]);
    });

    it('should remove deliveryId 4 if another deliveryId is selected', () => {
      const option = { deliveries: [4] };

      service.onSelectDelivery(option, 2);
      expect(option.deliveries).toEqual([2]);
    });

    it('should add deliveryId 4 and clear other deliveries', () => {
      const option = { deliveries: [1, 2, 3] };

      service.onSelectDelivery(option, 4);
      expect(option.deliveries).toEqual([4]);
    });

    it('should initialize deliveries as an empty array if it is not an object', () => {
      const option = { deliveries: null };

      service.onSelectDelivery(option, 4);
      expect(option.deliveries).toEqual([4]);
    });

    it('should add deliveryId if it does not exist and remove it if it does', () => {
      const option = { deliveries: [1, 2, 3] };

      // Add new delivery
      service.onSelectDelivery(option, 4);
      expect(option.deliveries).toContain(4);

      // Remove existing delivery
      service.onSelectDelivery(option, 4);
      expect(option.deliveries).not.toContain(4);
    });

    it('should handle undefined index correctly', () => {
      const option = { deliveries: [1, 2, 3] };

      service.onSelectDelivery(option, 5);
      expect(option.deliveries).toContain(5);
    });
  });

  describe('removePartner', () => {
    it('should remove a partner and update leadPartnerId', () => {
      service.partnersBody = { institutions: [{ institutions_id: 1 }, { institutions_id: 2 }] } as any;
      service.leadPartnerId = 1;

      service.removePartner(0);
      expect(service.partnersBody.institutions.length).toBe(1);
      expect(service.leadPartnerId).toBeNull();
    });
  });

  describe('getSectionInformation', () => {
    it('should call GET_partnersSection API and update partnersBody', () => {
      const responseMock = { response: { mqap_institutions: [], institutions: [] } };
      apiServiceMock.resultsSE.GET_partnersSection = jest.fn().mockReturnValue(of(responseMock));

      service.getSectionInformation(false, false);

      expect(apiServiceMock.resultsSE.GET_partnersSection).toHaveBeenCalled();
      expect(service.partnersBody).toEqual(responseMock.response);
    });

    it('should call setPossibleLeadPartners(), setLeadPartnerOnLoad(), setPossibleLeadCenters(), and setLeadCenterOnLoad() with false when onSave is not provided', () => {
      const setPossibleLeadPartnersSpy = jest.spyOn(service, 'setPossibleLeadPartners');
      const setLeadPartnerOnLoadSpy = jest.spyOn(service, 'setLeadPartnerOnLoad');
      const setPossibleLeadCentersSpy = jest.spyOn(service, 'setPossibleLeadCenters');
      const setLeadCenterOnLoadSpy = jest.spyOn(service, 'setLeadCenterOnLoad');

      service.getSectionInformation();

      expect(setPossibleLeadPartnersSpy).toHaveBeenCalledWith(false);
      expect(setLeadPartnerOnLoadSpy).toHaveBeenCalledWith(false);
      expect(setPossibleLeadCentersSpy).toHaveBeenCalledWith(false);
      expect(setLeadCenterOnLoadSpy).toHaveBeenCalledWith(false);
    });

    it('should set no_applicable_partner if error occurs and no_applicable_partner is true or false', () => {
      const errorMock = new Error('API error');
      const sectionInfo = jest.spyOn(apiServiceMock.resultsSE, 'GET_partnersSection').mockReturnValue(
        new Observable(observer => {
          observer.error(errorMock);
        })
      );

      service.getSectionInformation(true, false);
      expect(service.partnersBody.no_applicable_partner).toBe(true);

      service.getSectionInformation(false, false);
      expect(service.partnersBody.no_applicable_partner).toBe(false);

      sectionInfo.mockRestore();
    });
  });

  describe('validateDeliverySelectionPartners', () => {
    it('should return false if deliveries is not an array', () => {
      expect(service.validateDeliverySelectionPartners(false, 1)).toBe(false);
      expect(service.validateDeliverySelectionPartners('string', 1)).toBe(false);
    });

    it('should return undefined if deliveryId is not found', () => {
      const deliveries = [{ partner_delivery_type_id: 2 }];
      expect(service.validateDeliverySelectionPartners(deliveries, 1)).toBeUndefined();
    });

    it('should return the matching delivery if deliveryId is found', () => {
      const deliveries = [{ partner_delivery_type_id: 1 }, { partner_delivery_type_id: 2 }];
      expect(service.validateDeliverySelectionPartners(deliveries, 1)).toEqual({ partner_delivery_type_id: 1 });
    });
  });

  describe('onSelectDeliveryPartners', () => {
    it('should do nothing if readOnly is true', () => {
      apiServiceMock.rolesSE.readOnly = true;
      const option = { delivery: [{ partner_delivery_type_id: 1 }] };

      service.onSelectDeliveryPartners(option, 4);
      expect(option.delivery).toEqual([{ partner_delivery_type_id: 1 }]);
    });

    it('should add deliveryId 4 and remove all other deliveries', () => {
      const option = { delivery: [{ partner_delivery_type_id: 2 }] };
      service.onSelectDeliveryPartners(option, 4);

      expect(option.delivery).toEqual([{ partner_delivery_type_id: 4 }]);
    });

    it('should add deliveryId if it does not exist and remove it if it does', () => {
      const option = { delivery: [{ partner_delivery_type_id: 2 }] };

      // Add new delivery
      service.onSelectDeliveryPartners(option, 3);
      expect(option.delivery).toContainEqual({ partner_delivery_type_id: 3 });

      // Remove existing delivery
      service.onSelectDeliveryPartners(option, 3);
      expect(option.delivery).not.toContainEqual({ partner_delivery_type_id: 3 });
    });

    it('should remove deliveryId 4 if other deliveryId is selected', () => {
      const option = { delivery: [{ partner_delivery_type_id: 4 }] };

      service.onSelectDeliveryPartners(option, 2);
      expect(option.delivery).toContainEqual({ partner_delivery_type_id: 2 });
      expect(option.delivery).not.toContainEqual({ partner_delivery_type_id: 4 });
    });

    it('should remove delivery 4 if it has been selected before and deliveryId is 4', () => {
      const option = {
        delivery: [{ partner_delivery_type_id: 4 }]
      };

      const deliveryId = 4;
      service.onSelectDeliveryPartners(option, deliveryId);

      // Expect no change as index for partner_delivery_type_id 4 is not found
      expect(option.delivery).toEqual([]);
    });
  });

  describe('getDisabledCentersForKP', () => {
    it('should update cgspaceDisabledList with centers from partnersBody', () => {
      service.partnersBody = { contributing_center: [{ from_cgspace: true }, { from_cgspace: false }] } as any;

      service.getDisabledCentersForKP();

      expect(service.cgspaceDisabledList).toEqual([{ from_cgspace: true }]);
    });
  });

  describe('setPossibleLeadPartners', () => {
    it('should set updatingLeadData to true when called with updateComponent as true', () => {
      service.partnersBody = { mqap_institutions: [], institutions: [] } as any;
      service.setPossibleLeadPartners(true);
      expect(service.updatingLeadData).toBe(true);
    });

    it('should assume updateComponent as false when no params are provided', () => {
      service.partnersBody = { mqap_institutions: [], institutions: [] } as any;
      const method = jest.spyOn(service, 'setPossibleLeadPartners');
      service.setPossibleLeadPartners();
      expect(method).toHaveBeenCalledWith();
      expect(service.updatingLeadData).toBe(false);
    });

    it('should filter institutions and set possibleLeadPartners', () => {
      service.partnersBody = { mqap_institutions: [{ institutions_id: 1 }], institutions: [{ institutions_id: 2 }] } as any;
      institutionsServiceMock.institutionsList = [{ institutions_id: 1 }, { institutions_id: 2 }, { institutions_id: 3 }];

      service.setPossibleLeadPartners(false);

      expect(service.possibleLeadPartners).toEqual([{ institutions_id: 1 }, { institutions_id: 2 }]);
    });

    it('should stop updatingLeadData after timeout when updateComponent is true', done => {
      jest.useFakeTimers();
      service.setPossibleLeadPartners(true);

      setTimeout(() => {
        expect(service.updatingLeadData).toBe(false);
        done();
      }, 25);

      jest.advanceTimersByTime(25);
      jest.useRealTimers();
    });
  });

  describe('setPossibleLeadCenters', () => {
    it('should set updatingLeadData to true when called with updateComponent as true', () => {
      service.partnersBody = { contributing_center: [] } as any;
      service.setPossibleLeadCenters(true);
      expect(service.updatingLeadData).toBe(true);
    });

    it('should assume updateComponent as false when no params are provided', () => {
      service.partnersBody = { contributing_center: [] } as any;
      const method = jest.spyOn(service, 'setPossibleLeadCenters');
      service.setPossibleLeadCenters();
      expect(method).toHaveBeenCalledWith();
      expect(service.updatingLeadData).toBe(false);
    });

    it('should not change updatingLeadData when called with updateComponent as faalse', () => {
      service.partnersBody = { contributing_center: [] } as any;
      service.setPossibleLeadCenters(false);
      expect(service.updatingLeadData).toBe(false);
    });

    it('should filter centers and set possibleLeadCenters', () => {
      service.partnersBody = { contributing_center: [{ code: 'IWMI' }] } as any;
      centersServiceMock.centersList = [
        {
          code: 'IWMI',
          financial_code: '1',
          institutionId: 1,
          name: 'IWMI',
          acronym: 'IWMI'
        },
        {
          code: 'ICARDA',
          financial_code: '2',
          institutionId: 2,
          name: 'ICARDA',
          acronym: 'ICARDA'
        }
      ];

      service.setPossibleLeadCenters(false);

      expect(service.possibleLeadCenters).toEqual([
        {
          code: 'IWMI',
          financial_code: '1',
          institutionId: 1,
          name: 'IWMI',
          acronym: 'IWMI',
          selected: false,
          disabled: false
        }
      ]);
    });

    it('should stop updatingLeadData after timeout when updateComponent is true', done => {
      jest.useFakeTimers();
      service.setPossibleLeadCenters(true);

      setTimeout(() => {
        expect(service.updatingLeadData).toBe(false);
        done();
      }, 25);

      jest.advanceTimersByTime(25);
      jest.useRealTimers();
    });
  });

  describe('setLeadPartnerOnLoad', () => {
    it('should set updatingLeadData to true when called with updateComponent as true', () => {
      service.partnersBody = { mqap_institutions: [], institutions: [] } as any;
      service.setLeadPartnerOnLoad(true);
      expect(service.updatingLeadData).toBe(true);
    });

    it('should assume updateComponent as false when no params are provided', () => {
      service.partnersBody = { mqap_institutions: [], institutions: [] } as any;
      const method = jest.spyOn(service, 'setLeadPartnerOnLoad');
      service.setLeadPartnerOnLoad();
      expect(method).toHaveBeenCalledWith();
      expect(service.updatingLeadData).toBe(false);
    });

    it('should set leadPartnerId based on mqap_institutions', () => {
      service.partnersBody = { mqap_institutions: [{ institutions_id: 1, is_leading_result: true }], institutions: [] } as any;
      institutionsServiceMock.institutionsWithoutCentersList = [{ institutions_id: 1 }, { institutions_id: 2 }];

      service.setLeadPartnerOnLoad(false);

      expect(service.leadPartnerId).toBe(1);
    });

    it('should set leadPartnerId based on institutions', () => {
      service.partnersBody = { institutions: [{ institutions_id: 1, is_leading_result: true }], mqap_institutions: [] } as any;
      institutionsServiceMock.institutionsWithoutCentersList = [{ institutions_id: 1 }, { institutions_id: 2 }];

      service.setLeadPartnerOnLoad(false);

      expect(service.leadPartnerId).toBe(1);
    });

    it('should stop updatingLeadData after timeout when updateComponent is true', done => {
      jest.useFakeTimers();
      service.setLeadPartnerOnLoad(true);

      setTimeout(() => {
        expect(service.updatingLeadData).toBe(false);
        done();
      }, 25);

      jest.advanceTimersByTime(25);
      jest.useRealTimers();
    });
  });

  describe('setLeadCenterOnLoad', () => {
    it('should set updatingLeadData to true when called with updateComponent as true', () => {
      service.partnersBody = { contributing_center: [] } as any;
      service.setLeadCenterOnLoad(true);
      expect(service.updatingLeadData).toBe(true);
    });

    it('should assume updateComponent as false when no params are provided', () => {
      service.partnersBody = { contributing_center: [] } as any;
      const method = jest.spyOn(service, 'setLeadCenterOnLoad');
      service.setLeadCenterOnLoad();
      expect(method).toHaveBeenCalledWith();
      expect(service.updatingLeadData).toBe(false);
    });

    it('should set leadCenterCode based on contributing_center', () => {
      service.partnersBody = { contributing_center: [{ code: 'IWMI', is_leading_result: true }] } as any;
      centersServiceMock.centersList = [
        {
          code: 'IWMI',
          financial_code: '1',
          institutionId: 1,
          name: 'IWMI',
          acronym: 'IWMI'
        },
        {
          code: 'ICARDA',
          financial_code: '2',
          institutionId: 2,
          name: 'ICARDA',
          acronym: 'ICARDA'
        }
      ];

      service.setLeadCenterOnLoad(false);

      expect(service.leadCenterCode).toBe('IWMI');
    });

    it('should stop updatingLeadData after timeout when updateComponent is true', done => {
      jest.useFakeTimers();
      service.setLeadCenterOnLoad(true);

      setTimeout(() => {
        expect(service.updatingLeadData).toBe(false);
        done();
      }, 25);

      jest.advanceTimersByTime(25);
      jest.useRealTimers();
    });
  });

  describe('constructor', () => {
    it('should subscribe to loadedInstitutions and call setPossibleLeadPartners and setLeadPartnerOnLoad when loaded', () => {
      const setPossibleLeadPartnersSpy = jest.spyOn(service, 'setPossibleLeadPartners');
      const setLeadPartnerOnLoadSpy = jest.spyOn(service, 'setLeadPartnerOnLoad');

      institutionsServiceMock.loadedInstitutions.next(true);

      expect(setPossibleLeadPartnersSpy).toHaveBeenCalledWith(true);
      expect(setLeadPartnerOnLoadSpy).toHaveBeenCalledWith(true);
    });

    it('should subscribe to loadedCenters and call setPossibleLeadCenters and setLeadCenterOnLoad when loaded', () => {
      const setPossibleLeadCentersSpy = jest.spyOn(service, 'setPossibleLeadCenters');
      const setLeadCenterOnLoadSpy = jest.spyOn(service, 'setLeadCenterOnLoad');

      centersServiceMock.loadedCenters.next(true);

      expect(setPossibleLeadCentersSpy).toHaveBeenCalledWith(true);
      expect(setLeadCenterOnLoadSpy).toHaveBeenCalledWith(true);
    });
  });
});
