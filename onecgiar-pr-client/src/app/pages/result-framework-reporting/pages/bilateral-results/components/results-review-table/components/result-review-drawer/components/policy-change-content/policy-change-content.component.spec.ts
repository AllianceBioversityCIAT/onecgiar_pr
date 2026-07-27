import { ChangeDetectionStrategy, EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { PolicyChangeContentComponent } from './policy-change-content.component';
import { PolicyControlListService } from '../../../../../../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('PolicyChangeContentComponent', () => {
  let component: PolicyChangeContentComponent;
  let fixture: ComponentFixture<PolicyChangeContentComponent>;
  let institutionsMock: any;
  let loaded$: EventEmitter<boolean>;

  const configure = async (institutionsList: any[]) => {
    loaded$ = new EventEmitter<boolean>();
    institutionsMock = { institutionsList, loadedInstitutions: loaded$ };

    await TestBed.configureTestingModule({
      imports: [PolicyChangeContentComponent],
      providers: [
        { provide: PolicyControlListService, useValue: { policyTypesList: [], policyStages: [] } },
        { provide: InstitutionsService, useValue: institutionsMock }
      ]
    })
      .overrideComponent(PolicyChangeContentComponent, {
        set: { template: '', imports: [], styles: [], changeDetection: ChangeDetectionStrategy.Default }
      })
      .compileComponents();

    fixture = TestBed.createComponent(PolicyChangeContentComponent);
    component = fixture.componentInstance;
  };

  beforeEach(async () => {
    await configure([{ institutions_id: 1 }]);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ------------------------------------------------------------ resultDetail

  describe('resultDetail setter', () => {
    it('accepts a falsy value untouched', () => {
      component.resultDetail = null as any;
      expect(component.resultDetail).toBeNull();
    });

    it('injects a default policy body when resultTypeResponse is missing', fakeAsync(() => {
      const detail: any = {};
      component.resultDetail = detail;
      tick(1);
      expect(detail.resultTypeResponse[0]).toEqual({
        policy_type_id: null,
        policy_stage_id: null,
        implementing_organization: [],
        institutions: [],
        result_policy_change_id: null
      });
    }));

    it('injects a default policy body for an empty / non-array value', fakeAsync(() => {
      const detail: any = { resultTypeResponse: [] };
      component.resultDetail = detail;
      tick(1);
      expect(detail.resultTypeResponse.length).toBe(1);

      const other: any = { resultTypeResponse: 'nope' };
      component.resultDetail = other;
      tick(1);
      expect(Array.isArray(other.resultTypeResponse)).toBe(true);
    }));

    it('backfills the undefined keys of an existing body', fakeAsync(() => {
      const detail: any = { resultTypeResponse: [{}] };
      component.resultDetail = detail;
      tick(1);
      const first = detail.resultTypeResponse[0];
      expect(first.policy_type_id).toBeNull();
      expect(first.policy_stage_id).toBeNull();
      expect(first.implementing_organization).toEqual([]);
      expect(first.institutions).toEqual([]);
      expect(first.result_policy_change_id).toBeNull();
    }));

    it('keeps the values already present', fakeAsync(() => {
      const detail: any = {
        resultTypeResponse: [
          { policy_type_id: 3, policy_stage_id: 4, implementing_organization: [{ institution_id: 9 }], institutions: [9], result_policy_change_id: 2 }
        ]
      };
      component.resultDetail = detail;
      tick(1);
      expect(detail.resultTypeResponse[0].institutions).toEqual([9]);
      expect(detail.resultTypeResponse[0].result_policy_change_id).toBe(2);
    }));

    it('maps implementing organizations to institution ids once loaded', fakeAsync(() => {
      const detail: any = {
        resultTypeResponse: [{ implementing_organization: [{ institution_id: 5 }, { institutions_id: 6 }, { id: 7 }, {}], institutions: [] }]
      };
      component.resultDetail = detail;
      tick(1);
      expect(detail.resultTypeResponse[0].institutions).toEqual([5, 6, 7]);
    }));

    it('skips the mapping when the institutions catalogue is empty', fakeAsync(() => {
      institutionsMock.institutionsList = [];
      const detail: any = { resultTypeResponse: [{ implementing_organization: [{ institution_id: 5 }], institutions: [] }] };
      component.resultDetail = detail;
      tick(1);
      expect(detail.resultTypeResponse[0].institutions).toEqual([]);
    }));
  });

  // ---------------------------------------------------------------- lifecycle

  describe('ngOnInit', () => {
    it('maps institutions immediately when the catalogue is ready', fakeAsync(() => {
      component.resultDetail = { resultTypeResponse: [{ implementing_organization: [{ institution_id: 2 }] }] } as any;
      tick(1);
      component.ngOnInit();
      tick(1);
      expect((component.resultDetail as any).resultTypeResponse[0].institutions).toEqual([2]);
    }));

    it('does nothing on init without a result detail', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('maps institutions when loadedInstitutions emits later', fakeAsync(() => {
      institutionsMock.institutionsList = [];
      component.resultDetail = { resultTypeResponse: [{ implementing_organization: [{ institution_id: 4 }] }] } as any;
      tick(1);
      component.ngOnInit();
      loaded$.emit(true);
      tick(1);
      expect((component.resultDetail as any).resultTypeResponse[0].institutions).toEqual([4]);
    }));

    it('ignores a late emission when there is no result type response', fakeAsync(() => {
      institutionsMock.institutionsList = [];
      component.ngOnInit();
      loaded$.emit(true);
      tick(1);
      expect(component.resultDetail).toBeUndefined();
    }));
  });

  describe('ngOnDestroy', () => {
    it('unsubscribes when a subscription exists', () => {
      component.ngOnInit();
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('tolerates being destroyed without init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('ngOnChanges', () => {
    it('re-maps when resultDetail changed and the catalogue is ready', fakeAsync(() => {
      component.resultDetail = { resultTypeResponse: [{ implementing_organization: [{ id: 8 }] }] } as any;
      tick(1);
      (component.resultDetail as any).resultTypeResponse[0].institutions = [];
      component.ngOnChanges({ resultDetail: {} as any });
      tick(1);
      expect((component.resultDetail as any).resultTypeResponse[0].institutions).toEqual([8]);
    }));

    it('ignores unrelated changes', () => {
      expect(() => component.ngOnChanges({ disabled: {} as any })).not.toThrow();
    });

    it('ignores changes while the catalogue is empty', fakeAsync(() => {
      institutionsMock.institutionsList = [];
      component.ngOnChanges({ resultDetail: {} as any });
      tick(1);
      expect(component.resultDetail).toBeUndefined();
    }));
  });

  describe('ensureInstitutionsMapped', () => {
    const ensure = () => (component as any).ensureInstitutionsMapped();

    it('bails without a result type response', () => {
      expect(() => ensure()).not.toThrow();
    });

    it('creates an empty institutions list when there is no implementing organization', fakeAsync(() => {
      const detail: any = { resultTypeResponse: [{ implementing_organization: [] }] };
      component.resultDetail = detail;
      tick(1);
      delete detail.resultTypeResponse[0].institutions;
      ensure();
      tick(1);
      expect(detail.resultTypeResponse[0].institutions).toEqual([]);
    }));

    it('does not overwrite an already populated institutions list', fakeAsync(() => {
      const detail: any = { resultTypeResponse: [{ implementing_organization: [{ institution_id: 1 }], institutions: [42] }] };
      component.resultDetail = detail;
      tick(1);
      ensure();
      tick(1);
      expect(detail.resultTypeResponse[0].institutions).toEqual([42]);
    }));
  });
});
