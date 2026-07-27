import { ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { InnovationUseContentComponent } from './innovation-use-content.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('InnovationUseContentComponent', () => {
  let component: InnovationUseContentComponent;
  let fixture: ComponentFixture<InnovationUseContentComponent>;
  let apiMock: any;

  beforeEach(async () => {
    apiMock = {
      resultsSE: {
        GETAllActorsTypes: jest.fn(() => of({ response: [{ actor_type_id: 1, name: 'Farmers' }] }))
      }
    };

    await TestBed.configureTestingModule({
      imports: [InnovationUseContentComponent],
      providers: [{ provide: ApiService, useValue: apiMock }]
    })
      .overrideComponent(InnovationUseContentComponent, {
        set: { template: '', imports: [], styles: [], changeDetection: ChangeDetectionStrategy.Default }
      })
      .compileComponents();

    fixture = TestBed.createComponent(InnovationUseContentComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => jest.clearAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------- ngOnInit

  describe('ngOnInit', () => {
    it('stores the actor types', () => {
      component.ngOnInit();
      expect(component.actorsTypeList).toEqual([{ actor_type_id: 1, name: 'Farmers' }]);
    });

    it('falls back to an empty list when the response is null', () => {
      apiMock.resultsSE.GETAllActorsTypes.mockReturnValue(of({ response: null }));
      component.ngOnInit();
      expect(component.actorsTypeList).toEqual([]);
    });

    it('handles the error branch', () => {
      apiMock.resultsSE.GETAllActorsTypes.mockReturnValue(throwError(() => new Error('x')));
      component.actorsTypeList = [{ actor_type_id: 9, name: 'stale' }];
      component.ngOnInit();
      expect(component.actorsTypeList).toEqual([]);
    });
  });

  // ------------------------------------------------------------ resultDetail

  describe('resultDetail setter', () => {
    it('accepts a falsy value untouched', () => {
      component.resultDetail = null as any;
      expect(component.resultDetail).toBeNull();
      expect(component.body).toEqual({ actors: [], organizations: [], measures: [], investment_partners: [], investment_projects: [] });
    });

    it('injects a default body when resultTypeResponse is missing', () => {
      const detail: any = { commonFields: {} };
      component.resultDetail = detail;
      expect(detail.resultTypeResponse).toEqual([
        { actors: [], organizations: [], measures: [], investment_partners: [], investment_projects: [] }
      ]);
    });

    it('injects a default body when the array holds a non innovation-use shape', () => {
      const detail: any = { resultTypeResponse: [{ policy_type_id: 1 }] };
      component.resultDetail = detail;
      expect(detail.resultTypeResponse[0].actors).toEqual([]);
    });

    it('injects a default body for an empty array', () => {
      const detail: any = { resultTypeResponse: [] };
      component.resultDetail = detail;
      expect(detail.resultTypeResponse.length).toBe(1);
    });

    it('injects a default body when the first entry is not an object', () => {
      const detail: any = { resultTypeResponse: ['nope'] };
      component.resultDetail = detail;
      expect(detail.resultTypeResponse[0].actors).toEqual([]);
    });

    it('wraps a bare innovation-use object into an array', () => {
      const detail: any = { resultTypeResponse: { actors: [{ a: 1 }] } };
      component.resultDetail = detail;
      expect(Array.isArray(detail.resultTypeResponse)).toBe(true);
      expect(detail.resultTypeResponse[0].actors).toEqual([{ a: 1 }]);
    });

    it('normalizes every missing sub-list of an existing body', () => {
      const detail: any = { resultTypeResponse: [{ actors: null, organizations: undefined, measures: 'x', investment_partners: null }] };
      component.resultDetail = detail;
      const body = component.body;
      expect(body.actors).toEqual([]);
      expect(body.organizations).toEqual([]);
      expect(body.measures).toEqual([]);
      expect(body.investment_partners).toEqual([]);
      expect(body.investment_projects).toEqual([]);
    });

    it('keeps already valid sub-lists', () => {
      const detail: any = {
        resultTypeResponse: [
          { actors: [{ a: 1 }], organizations: [], measures: [], investment_partners: [], investment_projects: [{ p: 1 }] }
        ]
      };
      component.resultDetail = detail;
      expect(component.body.actors).toEqual([{ a: 1 }]);
      expect(component.body.investment_projects).toEqual([{ p: 1 }]);
    });
  });

  // -------------------------------------------------------------- pure helpers

  it('actorTypeDescription returns the copy', () => {
    expect(component.actorTypeDescription()).toContain('United Nations');
  });

  it('headerDescriptions return the copies', () => {
    expect(component.headerDescriptionsN2()).toContain('in-kind');
    expect(component.headerDescriptionsN3()).toContain('partner resources');
  });

  describe('removeOther', () => {
    it('returns an empty list for a falsy input', () => {
      expect(component.removeOther(null as any)).toEqual([]);
    });

    it('drops "Other" (5) and null actor types', () => {
      expect(component.removeOther([{ actor_type_id: 5 }, { actor_type_id: null }, { actor_type_id: 2 }, null as any])).toEqual([
        { actor_type_id: 2 }
      ]);
    });
  });

  describe('cleanActor', () => {
    it('ignores a falsy actor', () => {
      expect(() => component.cleanActor(null)).not.toThrow();
    });

    it('nulls out every disaggregation field', () => {
      const actor: any = { women: 1, women_youth: 2, women_non_youth: 3, men: 4, men_youth: 5, men_non_youth: 6, how_many: 7 };
      component.cleanActor(actor);
      expect(Object.values(actor).every(v => v === null)).toBe(true);
    });
  });

  describe('addActor / addOther', () => {
    it('creates the actors array when missing', () => {
      const detail: any = { resultTypeResponse: [{ actors: [], organizations: [], measures: [], investment_partners: [], investment_projects: [] }] };
      component.resultDetail = detail;
      detail.resultTypeResponse[0].actors = null;
      component.addActor();
      expect(component.body.actors?.length).toBe(1);
      expect(component.body.actors?.[0].sex_and_age_disaggregation).toBe(true);
    });

    it('appends to an existing actors array', () => {
      component.resultDetail = { resultTypeResponse: [{ actors: [{ existing: true }] }] } as any;
      component.addActor();
      expect(component.body.actors?.length).toBe(2);
    });

    it('creates the measures array when missing', () => {
      const detail: any = { resultTypeResponse: [{ actors: [] }] };
      component.resultDetail = detail;
      detail.resultTypeResponse[0].measures = null;
      component.addOther();
      expect(component.body.measures?.length).toBe(1);
    });

    it('appends to an existing measures array', () => {
      component.resultDetail = { resultTypeResponse: [{ measures: [{ unit_of_measure: 'kg' }] }] } as any;
      component.addOther();
      expect(component.body.measures?.length).toBe(2);
    });
  });

  describe('hasElementsWithId', () => {
    it('returns false when the list is not an array', () => {
      expect(component.hasElementsWithId(undefined, 'id')).toBe(false);
      expect(component.hasElementsWithId('nope' as any, 'id')).toBe(false);
    });

    it('checks the attribute when disabled', () => {
      component.disabled = true;
      expect(component.hasElementsWithId([{ id: 1 }], 'id')).toBe(true);
      expect(component.hasElementsWithId([{ id: null }, null as any], 'id')).toBe(false);
    });

    it('checks the active flag when enabled', () => {
      component.disabled = false;
      expect(component.hasElementsWithId([{ is_active: false }], 'id')).toBe(false);
      expect(component.hasElementsWithId([{ is_active: false }, { is_active: true }], 'id')).toBe(true);
      expect(component.hasElementsWithId([{}], 'id')).toBe(true);
    });
  });

  describe('investment helpers', () => {
    it('checkValueAlert covers each branch', () => {
      expect(component.checkValueAlert({ is_determined: true })).toBe(true);
      expect(component.checkValueAlert({ kind_cash: 0 })).toBe(true);
      expect(component.checkValueAlert({ kind_cash: '' })).toBe(false);
      expect(component.checkValueAlert({ kind_cash: null })).toBe(false);
      expect(component.checkValueAlert(null)).toBe(false);
    });

    it('onRadioChange clears kind_cash and tolerates a falsy item', () => {
      const item: any = { kind_cash: 5 };
      component.onRadioChange(item);
      expect(item.kind_cash).toBeNull();
      expect(() => component.onRadioChange(null)).not.toThrow();
    });

    it('onInputChange clears is_determined only when kind_cash is set', () => {
      const withCash: any = { kind_cash: 3, is_determined: true };
      component.onInputChange(withCash);
      expect(withCash.is_determined).toBeNull();

      const withoutCash: any = { kind_cash: null, is_determined: true };
      component.onInputChange(withoutCash);
      expect(withoutCash.is_determined).toBe(true);

      expect(() => component.onInputChange(null)).not.toThrow();
    });
  });
});
