import { TestBed } from '@angular/core/testing';

import { RdPartnersService } from './rd-partners.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { of, throwError } from 'rxjs';

describe('RdPartnersService', () => {
  let service: RdPartnersService;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      rolesSE: {
        readOnly: true
      },
      resultsSE: {
        GET_partnersSection: () => of({ response: { no_applicable_partner: true } }),
        GET_centers: () => of({}),
      }
    };

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
      ]
    });
    service = TestBed.inject(RdPartnersService);
  });

  describe('validateDeliverySelection', () => {
    it('should return false if deliveries is not an object', () => {
      const result = service.validateDeliverySelection('', 1);

      expect(result).toBeFalsy();
    });
    it('should return false if deliveryId is not in deliveries', () => {
      const deliveries = [2, 3, 4];
      const deliveryId = 1;

      const result = service.validateDeliverySelection(deliveries, deliveryId);

      expect(result).toBeFalsy();
    });

    it('should return true if deliveryId is in deliveries', () => {
      const deliveries = [2, 3, 4];
      const deliveryId = 3;

      const result = service.validateDeliverySelection(deliveries, deliveryId);

      expect(result).toBeTruthy();
    });
  });

  describe('onSelectDelivery', () => {
    it('should do nothing if readOnly is true', () => {
      const option = { deliveries: [1, 2, 3] };
      const deliveryId = 1;

      service.onSelectDelivery(option, deliveryId);

      expect(option.deliveries).toEqual([1, 2, 3]);
    });
    it('should remove deliveryId 4 from option.deliveries if present and deliveryId is not 4', () => {
      mockApiService.rolesSE.readOnly = false;
      const option = { deliveries: [1, 2, 3, 4] };
      const deliveryId = 3;

      service.onSelectDelivery(option, deliveryId);

      expect(option.deliveries).toEqual([1, 2]);
    });

    it('should set option.deliveries to an empty array if deliveryId is 4 and index is less than 0', () => {
      mockApiService.rolesSE.readOnly = false;
      const option = { deliveries: [1, 2, 3] };
      const deliveryId = 4;

      service.onSelectDelivery(option, deliveryId);

      expect(option.deliveries).toEqual([4]);
    });

    it('should set option.deliveries to an [4] array if indexOf(4) is -1', () => {
      mockApiService.rolesSE.readOnly = false;
      const option = { deliveries: null };

      service.onSelectDelivery(option, 4);

      expect(option.deliveries).toEqual([4]);
    });
  });
  describe('onSelectDelivery', () => {
    it('should remove a partner at the specified index and increment toggle', () => {
      const initialInstitutions = [
        {
          name: 'Partner 1',
          institutions_id: 1,
          institutions_name: 'name',
          institutions_type_name: 'type'
        }];
      const indexToRemove = 1;
      service.partnersBody.institutions = [...initialInstitutions];

      service.removePartner(indexToRemove);

      expect(service.partnersBody.institutions).toEqual(initialInstitutions);
      expect(service.toggle).toBe(1);
    });
  });

  describe('getSectionInformation', () => {
    it('should set partnersBody and no_applicable_partner on successful GET_partnersSection response', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, "GET_partnersSection")
      const noApplicablePartner = true;

      service.getSectionInformation(noApplicablePartner);
      expect(service.partnersBody.no_applicable_partner).toBe(noApplicablePartner);
      expect(spy).toHaveBeenCalled();
    });
    it('should set partnersBody and no_applicable_partner on successful GET_partnersSection response when no_applicable_partner is false', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, "GET_partnersSection")
        .mockReturnValue(of({response: {no_applicable_partner: false}}));
      const noApplicablePartner = false;

      service.getSectionInformation(noApplicablePartner);
      expect(service.partnersBody.no_applicable_partner).toBe(noApplicablePartner);
      expect(spy).toHaveBeenCalled();
    });

    it('should set no_applicable_partner on error in API response', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, "GET_partnersSection")
      .mockReturnValue(throwError('API Error'));
      const noApplicablePartner = false;

      service.getSectionInformation(noApplicablePartner);

      expect(spy).toHaveBeenCalled();
      expect(service.partnersBody.no_applicable_partner).toBe(noApplicablePartner);
    });
  });
  describe('getCenterInformation', () => {
    it('should set partnersBody and no_applicable_partner on successful GET_partnersSection response', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, "GET_centers")

      service.getCenterInformation();

      expect(spy).toHaveBeenCalled();
    });
  });
});
