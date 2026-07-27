import { ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CapSharingContentComponent } from './cap-sharing-content.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('CapSharingContentComponent', () => {
  let component: CapSharingContentComponent;
  let fixture: ComponentFixture<CapSharingContentComponent>;
  let apiMock: any;

  beforeEach(async () => {
    apiMock = {
      resultsSE: {
        GET_capdevsTerms: jest.fn(() => of({ response: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }] })),
        GET_capdevsDeliveryMethod: jest.fn(() => of({ response: [{ id: 10 }] }))
      }
    };

    await TestBed.configureTestingModule({
      imports: [CapSharingContentComponent],
      providers: [{ provide: ApiService, useValue: apiMock }]
    })
      .overrideComponent(CapSharingContentComponent, {
        set: { template: '', imports: [], styles: [], changeDetection: ChangeDetectionStrategy.Default }
      })
      .compileComponents();

    fixture = TestBed.createComponent(CapSharingContentComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => jest.clearAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('loads the third and fourth capdev terms plus the delivery methods', () => {
      component.ngOnInit();
      expect(component.capdevsTerms()).toEqual([{ id: 3 }, { id: 4 }]);
      expect(component.deliveryMethodOptions()).toEqual([{ id: 10 }]);
    });

    it('handles both error branches', () => {
      apiMock.resultsSE.GET_capdevsTerms.mockReturnValue(throwError(() => new Error('x')));
      apiMock.resultsSE.GET_capdevsDeliveryMethod.mockReturnValue(throwError(() => new Error('y')));
      component.capdevsTerms.set([{ id: 1 }]);
      component.deliveryMethodOptions.set([{ id: 1 }]);
      component.ngOnInit();
      expect(component.capdevsTerms()).toEqual([]);
      expect(component.deliveryMethodOptions()).toEqual([]);
    });
  });

  describe('resultDetail setter', () => {
    it('accepts a falsy value untouched', () => {
      component.resultDetail = null as any;
      expect(component.resultDetail).toBeNull();
    });

    it('injects a default body when resultTypeResponse is missing', () => {
      const detail: any = {};
      component.resultDetail = detail;
      expect(detail.resultTypeResponse[0]).toEqual({
        result_capacity_development_id: null,
        male_using: null,
        female_using: null,
        non_binary_using: null,
        has_unkown_using: null,
        capdev_delivery_method_id: null,
        capdev_term_id: null
      });
    });

    it('injects a default body for an empty array and for a non-array value', () => {
      const empty: any = { resultTypeResponse: [] };
      component.resultDetail = empty;
      expect(empty.resultTypeResponse.length).toBe(1);

      const notArray: any = { resultTypeResponse: {} };
      component.resultDetail = notArray;
      expect(Array.isArray(notArray.resultTypeResponse)).toBe(true);
    });

    it('backfills only the undefined keys of an existing body', () => {
      const detail: any = { resultTypeResponse: [{ capdev_term_id: 3 }] };
      component.resultDetail = detail;
      const first = detail.resultTypeResponse[0];
      expect(first.male_using).toBeNull();
      expect(first.capdev_term_id).toBe(3);
      expect(first.female_using).toBeNull();
      expect(first.non_binary_using).toBeNull();
      expect(first.has_unkown_using).toBeNull();
      expect(first.capdev_delivery_method_id).toBeNull();
    });

    it('keeps a fully populated body untouched', () => {
      const detail: any = {
        resultTypeResponse: [
          { male_using: 1, female_using: 2, non_binary_using: 3, has_unkown_using: 4, capdev_delivery_method_id: 5, capdev_term_id: 6 }
        ]
      };
      component.resultDetail = detail;
      expect(detail.resultTypeResponse[0].female_using).toBe(2);
    });
  });

  describe('getTotalParticipants', () => {
    it('is 0 without a result detail', () => {
      expect(component.getTotalParticipants()).toBe(0);
    });

    it('sums every participant bucket, treating blanks as 0', () => {
      component.resultDetail = { resultTypeResponse: [{ male_using: '2', female_using: 3, non_binary_using: null, has_unkown_using: '' }] } as any;
      expect(component.getTotalParticipants()).toBe(5);
    });
  });

  it('lengthOfTrainingDescription returns the copy', () => {
    expect(component.lengthOfTrainingDescription()).toContain('Long-term training');
  });
});
