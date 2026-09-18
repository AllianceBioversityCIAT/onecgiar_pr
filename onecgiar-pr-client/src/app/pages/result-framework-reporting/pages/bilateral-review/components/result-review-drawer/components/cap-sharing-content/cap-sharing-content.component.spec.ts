import { ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CapSharingContentComponent } from './cap-sharing-content.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';


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
      expect(component.capdevsSubTerms()).toEqual([{ id: 1 }, { id: 2 }]);
      expect(component.deliveryMethodOptions()).toEqual([{ id: 10 }]);
    });

    it('handles both error branches', () => {
      apiMock.resultsSE.GET_capdevsTerms.mockReturnValue(throwError(() => new Error('x')));
      apiMock.resultsSE.GET_capdevsDeliveryMethod.mockReturnValue(throwError(() => new Error('y')));
      component.capdevsTerms.set([{ id: 1 }]);
      component.capdevsSubTerms.set([{ id: 2 }]);
      component.deliveryMethodOptions.set([{ id: 1 }]);
      component.ngOnInit();
      expect(component.capdevsTerms()).toEqual([]);
      // CSD-T-4: by symmetry with the parent list — a failed catalogue fetch must not leave the
      // Degree control offering stale options the parent control no longer offers.
      expect(component.capdevsSubTerms()).toEqual([]);
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

  /**
   * CSD-R-6 / CSD-AC-6 — the term cascade the editor already implements
   * (`type-capacity-sharing.component.ts:170-198`) ported into the drawer.
   *
   * Contract (design.md section 3): `capdev_term_id` stores ONE integer.
   * `3` = Short-term, standalone. `4` = Long-term with no degree chosen.
   * `1`/`2` = Long-term disambiguated by PhD/Master - the parent `4` is not stored
   * alongside them. Display decomposes, a user-initiated change recomposes.
   *
   * This spec overrides the template to '' (see the TestBed above), so these cases
   * cover the resolved state and the snapshot invariant only. Rendering is the
   * human check of CSD-T-5 - design.md DD-6 declares it as a gap on purpose.
   */
  describe('term cascade', () => {
    /** Every key present, so the setter's null-backfill is a no-op and hydration is the only thing that can mutate. */
    const bodyWith = (capdev_term_id: number | null): any => ({
      result_capacity_development_id: 77,
      male_using: 1,
      female_using: 2,
      non_binary_using: 0,
      has_unkown_using: 0,
      capdev_delivery_method_id: 10,
      capdev_term_id
    });

    /**
     * The drawer's own comparison shape, not a re-invented one:
     * `normalizeDataStandardForComparison` reduces `resultTypeResponse` to a deep clone of its
     * first element and `JSON.stringify`s the projection
     * (`result-review-drawer.component.ts:377-389`), which is what
     * `hasDataStandardUnsavedChanges()` feeds into `canApprove()`.
     *
     * The drawer clones with `structuredClone`; this uses the repo's JSON round-trip convention
     * because `structuredClone` is unavailable in this jsdom env
     * (`shared/services/unsaved-changes/section-dirty-tracker.service.ts:20`). The two produce
     * the same string for a JSON-representable body, which is all the comparison reads.
     */
    const drawerSnapshot = (detail: any): string =>
      JSON.stringify({
        resultTypeResponse: detail?.resultTypeResponse?.[0] ? JSON.parse(JSON.stringify(detail.resultTypeResponse[0])) : null
      });

    it('resolves a stored PhD (1) into the Long-term parent plus the PhD degree', () => {
      component.resultDetail = { resultTypeResponse: [bodyWith(1)] } as any;
      expect(component.capdevTermId1).toBe(4);
      expect(component.capdevTermId2).toBe(1);
    });

    it('resolves a stored Long-term (4) into the parent term with no degree', () => {
      component.resultDetail = { resultTypeResponse: [bodyWith(4)] } as any;
      expect(component.capdevTermId1).toBe(4);
      expect(component.capdevTermId2).toBeNull();
    });

    it('resolves a stored Short-term (3) into the standalone parent term', () => {
      component.resultDetail = { resultTypeResponse: [bodyWith(3)] } as any;
      expect(component.capdevTermId1).toBe(3);
      expect(component.capdevTermId2).toBeNull();
    });

    it('recomposes capdev_term_id from the degree the reviewer picks', () => {
      const detail: any = { resultTypeResponse: [bodyWith(4)] };
      component.resultDetail = detail;
      component.capdevTermId2 = 2;
      component.onCapdevTermId2Change();
      expect(detail.resultTypeResponse[0].capdev_term_id).toBe(2);
    });

    it('clears the degree and writes the standalone term when the reviewer switches back to Short-term', () => {
      const detail: any = { resultTypeResponse: [bodyWith(2)] };
      component.resultDetail = detail;
      component.capdevTermId1 = 3;
      component.onCapdevTermId1Change();
      expect(component.capdevTermId2).toBeNull();
      expect(detail.resultTypeResponse[0].capdev_term_id).toBe(3);
    });

    /**
     * design.md DD-4, second clause: "the setter can fire more than once on the same object, and
     * re-running it must not clobber an in-progress selection". The drawer re-emits `[resultDetail]`
     * on every parent render, so this fires constantly while the reviewer is choosing.
     *
     * Added by CSD-T-4 - CSD-T-3 enumerated no case for it and correctly declined to invent one.
     */
    it('is idempotent: a re-emit of the same object leaves the reviewer selection in place', () => {
      const detail: any = { resultTypeResponse: [bodyWith(4)] };
      component.resultDetail = detail;
      expect(component.capdevTermId1).toBe(4);
      expect(component.capdevTermId2).toBeNull();

      component.capdevTermId2 = 1;
      component.onCapdevTermId2Change();

      component.resultDetail = detail;

      expect(component.capdevTermId1).toBe(4);
      expect(component.capdevTermId2).toBe(1);
      expect(detail.resultTypeResponse[0].capdev_term_id).toBe(1);
    });

    /**
     * Defect class D (requirements.md section 9): hydration that writes back into
     * `capdev_term_id` marks a freshly opened drawer dirty and blocks Approve with a change the
     * reviewer never made. The resolved-state assertions are part of the test on purpose - a bare
     * snapshot comparison is vacuous while no cascade exists, and would go green for the wrong reason.
     */
    it('resolves a stored degree without dirtying the drawer data-standard snapshot', () => {
      const detail: any = { resultTypeResponse: [bodyWith(1)] };
      const before = drawerSnapshot(detail);

      component.resultDetail = detail;

      expect(component.capdevTermId1).toBe(4);
      expect(component.capdevTermId2).toBe(1);
      expect(drawerSnapshot(detail)).toBe(before);
      expect(detail.resultTypeResponse[0].capdev_term_id).toBe(1);
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
