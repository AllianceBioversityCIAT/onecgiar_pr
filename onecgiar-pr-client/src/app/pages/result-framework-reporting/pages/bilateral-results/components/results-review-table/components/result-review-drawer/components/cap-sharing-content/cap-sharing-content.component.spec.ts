import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CapSharingContentComponent } from './cap-sharing-content.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { of, throwError } from 'rxjs';

describe('CapSharingContentComponent', () => {
  let component: CapSharingContentComponent;
  let fixture: ComponentFixture<CapSharingContentComponent>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      resultsSE: {
        GET_capdevsTerms: jest.fn().mockReturnValue(of({ response: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] })),
        GET_capdevsDeliveryMethod: jest.fn().mockReturnValue(of({ response: [{ id: 10, name: 'Method1' }] }))
      }
    };

    await TestBed.configureTestingModule({
      imports: [CapSharingContentComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: ApiService, useValue: mockApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CapSharingContentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('resultDetail setter', () => {
    it('should set _resultDetail to null when value is falsy', () => {
      component.resultDetail = null as any;
      expect(component.resultDetail).toBeNull();
    });

    it('should set _resultDetail to undefined when value is undefined', () => {
      component.resultDetail = undefined as any;
      expect(component.resultDetail).toBeUndefined();
    });

    it('should initialize resultTypeResponse when it is null', () => {
      const value = { resultTypeResponse: null } as any;
      component.resultDetail = value;

      expect(value.resultTypeResponse).toEqual([{
        result_capacity_development_id: null,
        male_using: null,
        female_using: null,
        non_binary_using: null,
        has_unkown_using: null,
        capdev_delivery_method_id: null,
        capdev_term_id: null
      }]);
    });

    it('should initialize resultTypeResponse when it is not an array', () => {
      const value = { resultTypeResponse: 'string' } as any;
      component.resultDetail = value;

      expect(value.resultTypeResponse[0].male_using).toBeNull();
    });

    it('should initialize resultTypeResponse when it is an empty array', () => {
      const value = { resultTypeResponse: [] } as any;
      component.resultDetail = value;

      expect(value.resultTypeResponse.length).toBe(1);
      expect(value.resultTypeResponse[0].male_using).toBeNull();
    });

    it('should default undefined fields on existing firstItem', () => {
      const firstItem: any = {};
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;

      expect(firstItem.male_using).toBeNull();
      expect(firstItem.female_using).toBeNull();
      expect(firstItem.non_binary_using).toBeNull();
      expect(firstItem.has_unkown_using).toBeNull();
      expect(firstItem.capdev_delivery_method_id).toBeNull();
      expect(firstItem.capdev_term_id).toBeNull();
    });

    it('should not override existing defined fields on firstItem', () => {
      const firstItem: any = {
        male_using: 10,
        female_using: 20,
        non_binary_using: 5,
        has_unkown_using: 3,
        capdev_delivery_method_id: 1,
        capdev_term_id: 2
      };
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;

      expect(firstItem.male_using).toBe(10);
      expect(firstItem.female_using).toBe(20);
      expect(firstItem.non_binary_using).toBe(5);
      expect(firstItem.has_unkown_using).toBe(3);
      expect(firstItem.capdev_delivery_method_id).toBe(1);
      expect(firstItem.capdev_term_id).toBe(2);
    });

    it('should keep null values on firstItem without overriding', () => {
      const firstItem: any = {
        male_using: null,
        female_using: null,
        non_binary_using: null,
        has_unkown_using: null,
        capdev_delivery_method_id: null,
        capdev_term_id: null
      };
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;

      expect(firstItem.male_using).toBeNull();
    });
  });

  describe('ngOnInit', () => {
    it('should load capdev terms (slicing indices 2-4)', () => {
      fixture.detectChanges();

      expect(mockApiService.resultsSE.GET_capdevsTerms).toHaveBeenCalled();
      expect(component.capdevsTerms()).toEqual([{ id: 3 }, { id: 4 }]);
    });

    it('should load delivery methods', () => {
      fixture.detectChanges();

      expect(mockApiService.resultsSE.GET_capdevsDeliveryMethod).toHaveBeenCalled();
      expect(component.deliveryMethodOptions()).toEqual([{ id: 10, name: 'Method1' }]);
    });
  });

  describe('loadCapdevsTerms error', () => {
    it('should set capdevsTerms to empty array on error', () => {
      mockApiService.resultsSE.GET_capdevsTerms.mockReturnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();

      expect(component.capdevsTerms()).toEqual([]);
    });
  });

  describe('loadDeliveryMethods error', () => {
    it('should set deliveryMethodOptions to empty array on error', () => {
      mockApiService.resultsSE.GET_capdevsDeliveryMethod.mockReturnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();

      expect(component.deliveryMethodOptions()).toEqual([]);
    });
  });

  describe('getTotalParticipants', () => {
    it('should return 0 when resultDetail is null', () => {
      (component as any)._resultDetail = null;
      expect(component.getTotalParticipants()).toBe(0);
    });

    it('should return 0 when resultTypeResponse is empty', () => {
      (component as any)._resultDetail = { resultTypeResponse: [] } as any;
      expect(component.getTotalParticipants()).toBe(0);
    });

    it('should sum all participant values', () => {
      (component as any)._resultDetail = {
        resultTypeResponse: [{
          male_using: 10,
          female_using: 20,
          non_binary_using: 5,
          has_unkown_using: 3
        }]
      } as any;
      expect(component.getTotalParticipants()).toBe(38);
    });

    it('should handle string numeric values', () => {
      (component as any)._resultDetail = {
        resultTypeResponse: [{
          male_using: '10',
          female_using: '20',
          non_binary_using: '5',
          has_unkown_using: '3'
        }]
      } as any;
      expect(component.getTotalParticipants()).toBe(38);
    });

    it('should treat null/undefined values as 0', () => {
      (component as any)._resultDetail = {
        resultTypeResponse: [{
          male_using: null,
          female_using: undefined,
          non_binary_using: 5,
          has_unkown_using: null
        }]
      } as any;
      expect(component.getTotalParticipants()).toBe(5);
    });
  });

  describe('lengthOfTrainingDescription', () => {
    it('should return the HTML description string', () => {
      const result = component.lengthOfTrainingDescription();
      expect(result).toContain('Long-term training');
      expect(result).toContain('Short-term training');
    });
  });
});
