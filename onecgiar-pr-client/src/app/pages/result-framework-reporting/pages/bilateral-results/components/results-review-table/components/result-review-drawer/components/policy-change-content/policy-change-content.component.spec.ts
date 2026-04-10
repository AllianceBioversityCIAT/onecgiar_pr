import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PolicyChangeContentComponent } from './policy-change-content.component';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';
import { PolicyControlListService } from '../../../../../../../../../../shared/services/global/policy-control-list.service';
import { ChangeDetectorRef, EventEmitter } from '@angular/core';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';

describe('PolicyChangeContentComponent', () => {
  let component: PolicyChangeContentComponent;
  let fixture: ComponentFixture<PolicyChangeContentComponent>;
  let mockInstitutionsService: any;
  let mockCdr: any;

  beforeEach(async () => {
    mockInstitutionsService = {
      institutionsList: [],
      loadedInstitutions: new EventEmitter()
    };

    await TestBed.configureTestingModule({
      imports: [PolicyChangeContentComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: InstitutionsService, useValue: mockInstitutionsService },
        { provide: PolicyControlListService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyChangeContentComponent);
    component = fixture.componentInstance;
    mockCdr = (component as any).cdr;
    jest.spyOn(mockCdr, 'markForCheck');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('resultDetail setter', () => {
    it('should set _resultDetail to null/undefined when value is falsy', () => {
      component.resultDetail = null as any;
      expect(component.resultDetail).toBeNull();

      component.resultDetail = undefined as any;
      expect(component.resultDetail).toBeUndefined();
    });

    it('should initialize resultTypeResponse when it is null/undefined', fakeAsync(() => {
      const value = { resultTypeResponse: null } as any;
      component.resultDetail = value;
      tick(0);

      expect(value.resultTypeResponse).toEqual([
        {
          policy_type_id: null,
          policy_stage_id: null,
          implementing_organization: [],
          institutions: [],
          result_policy_change_id: null
        }
      ]);
    }));

    it('should initialize resultTypeResponse when it is not an array', fakeAsync(() => {
      const value = { resultTypeResponse: 'notArray' } as any;
      component.resultDetail = value;
      tick(0);

      expect(value.resultTypeResponse).toEqual([
        {
          policy_type_id: null,
          policy_stage_id: null,
          implementing_organization: [],
          institutions: [],
          result_policy_change_id: null
        }
      ]);
    }));

    it('should initialize resultTypeResponse when it is an empty array', fakeAsync(() => {
      const value = { resultTypeResponse: [] } as any;
      component.resultDetail = value;
      tick(0);

      expect(value.resultTypeResponse).toEqual([
        {
          policy_type_id: null,
          policy_stage_id: null,
          implementing_organization: [],
          institutions: [],
          result_policy_change_id: null
        }
      ]);
    }));

    it('should default undefined fields on existing firstItem', fakeAsync(() => {
      const firstItem: any = {};
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;
      tick(0);

      expect(firstItem.policy_type_id).toBeNull();
      expect(firstItem.policy_stage_id).toBeNull();
      expect(firstItem.implementing_organization).toEqual([]);
      expect(firstItem.institutions).toEqual([]);
      expect(firstItem.result_policy_change_id).toBeNull();
    }));

    it('should not override existing defined fields on firstItem', fakeAsync(() => {
      const firstItem: any = {
        policy_type_id: 5,
        policy_stage_id: 3,
        implementing_organization: [{ id: 1 }],
        institutions: [1, 2],
        result_policy_change_id: 10
      };
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;
      tick(0);

      expect(firstItem.policy_type_id).toBe(5);
      expect(firstItem.policy_stage_id).toBe(3);
      expect(firstItem.implementing_organization).toEqual([{ id: 1 }]);
      expect(firstItem.institutions).toEqual([1, 2]);
      expect(firstItem.result_policy_change_id).toBe(10);
    }));

    it('should reset implementing_organization when it is not an array', fakeAsync(() => {
      const firstItem: any = {
        policy_type_id: 1,
        policy_stage_id: 2,
        implementing_organization: 'not-array',
        institutions: [1],
        result_policy_change_id: 1
      };
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;
      tick(0);

      expect(firstItem.implementing_organization).toEqual([]);
    }));

    it('should reset institutions when it is not an array', fakeAsync(() => {
      const firstItem: any = {
        policy_type_id: 1,
        policy_stage_id: 2,
        implementing_organization: [],
        institutions: 'not-array',
        result_policy_change_id: 1
      };
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;
      tick(0);

      expect(firstItem.institutions).toEqual([]);
    }));

    it('should call ensureInstitutionsMapped when institutionsList is populated', fakeAsync(() => {
      mockInstitutionsService.institutionsList = [{ id: 1 }];
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      const firstItem: any = {
        policy_type_id: 1,
        policy_stage_id: 1,
        implementing_organization: [],
        institutions: [],
        result_policy_change_id: 1
      };
      component.resultDetail = { resultTypeResponse: [firstItem] } as any;
      tick(0);

      expect(spy).toHaveBeenCalled();
    }));

    it('should not call ensureInstitutionsMapped when institutionsList is empty', fakeAsync(() => {
      mockInstitutionsService.institutionsList = [];
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      const firstItem: any = {
        policy_type_id: 1,
        policy_stage_id: 1,
        implementing_organization: [],
        institutions: [],
        result_policy_change_id: 1
      };
      component.resultDetail = { resultTypeResponse: [firstItem] } as any;
      tick(0);

      expect(spy).not.toHaveBeenCalled();
    }));
  });

  describe('ngOnInit', () => {
    it('should call ensureInstitutionsMapped on loadedInstitutions event when resultDetail has resultTypeResponse', () => {
      const firstItem: any = {
        policy_type_id: 1,
        policy_stage_id: 1,
        implementing_organization: [],
        institutions: [],
        result_policy_change_id: 1
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      mockInstitutionsService.loadedInstitutions.emit(true);

      expect(spy).toHaveBeenCalled();
    });

    it('should not call ensureInstitutionsMapped on loadedInstitutions event when resultDetail has no resultTypeResponse', () => {
      (component as any)._resultDetail = null;
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      mockInstitutionsService.loadedInstitutions.emit(true);

      expect(spy).not.toHaveBeenCalled();
    });

    it('should call ensureInstitutionsMapped in ngOnInit if institutions already loaded', () => {
      mockInstitutionsService.institutionsList = [{ id: 1 }];
      const firstItem: any = {
        policy_type_id: 1,
        policy_stage_id: 1,
        implementing_organization: [],
        institutions: [],
        result_policy_change_id: 1
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });

    it('should not call ensureInstitutionsMapped in ngOnInit if institutions not loaded and no resultDetail', () => {
      mockInstitutionsService.institutionsList = [];
      (component as any)._resultDetail = null;
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      component.ngOnInit();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from institutionsLoadedSubscription if it exists', () => {
      const mockSub = { unsubscribe: jest.fn() };
      (component as any).institutionsLoadedSubscription = mockSub;

      component.ngOnDestroy();

      expect(mockSub.unsubscribe).toHaveBeenCalled();
    });

    it('should not throw when institutionsLoadedSubscription is falsy', () => {
      (component as any).institutionsLoadedSubscription = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('ensureInstitutionsMapped', () => {
    it('should return early when resultDetail is null', () => {
      (component as any)._resultDetail = null;

      expect(() => (component as any).ensureInstitutionsMapped()).not.toThrow();
    });

    it('should return early when resultTypeResponse is empty', () => {
      (component as any)._resultDetail = { resultTypeResponse: [] } as any;

      expect(() => (component as any).ensureInstitutionsMapped()).not.toThrow();
    });

    it('should map implementing_organization to institutions using institution_id', fakeAsync(() => {
      const firstItem: any = {
        implementing_organization: [{ institution_id: 10 }, { institution_id: 20 }],
        institutions: []
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;

      (component as any).ensureInstitutionsMapped();
      tick(0);

      expect(firstItem.institutions).toEqual([10, 20]);
    }));

    it('should map implementing_organization to institutions using institutions_id fallback', fakeAsync(() => {
      const firstItem: any = {
        implementing_organization: [{ institutions_id: 30 }],
        institutions: []
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;

      (component as any).ensureInstitutionsMapped();
      tick(0);

      expect(firstItem.institutions).toEqual([30]);
    }));

    it('should map implementing_organization to institutions using id fallback', fakeAsync(() => {
      const firstItem: any = {
        implementing_organization: [{ id: 40 }],
        institutions: []
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;

      (component as any).ensureInstitutionsMapped();
      tick(0);

      expect(firstItem.institutions).toEqual([40]);
    }));

    it('should filter out null ids from mapping', fakeAsync(() => {
      const firstItem: any = {
        implementing_organization: [{ institution_id: 10 }, {}],
        institutions: []
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;

      (component as any).ensureInstitutionsMapped();
      tick(0);

      expect(firstItem.institutions).toEqual([10]);
    }));

    it('should not overwrite institutions if they already have values', () => {
      const firstItem: any = {
        implementing_organization: [{ institution_id: 10 }],
        institutions: [99]
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;

      (component as any).ensureInstitutionsMapped();

      expect(firstItem.institutions).toEqual([99]);
    });

    it('should set institutions to empty array when implementing_organization is empty and institutions is falsy', fakeAsync(() => {
      const firstItem: any = {
        implementing_organization: [],
        institutions: undefined
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;

      (component as any).ensureInstitutionsMapped();
      tick(0);

      expect(firstItem.institutions).toEqual([]);
    }));

    it('should not set institutions to empty array when implementing_organization is empty but institutions already exists', () => {
      const firstItem: any = {
        implementing_organization: [],
        institutions: [1, 2]
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;

      (component as any).ensureInstitutionsMapped();

      expect(firstItem.institutions).toEqual([1, 2]);
    });

    it('should handle implementing_organization being null (falsy branch)', fakeAsync(() => {
      const firstItem: any = {
        implementing_organization: null,
        institutions: undefined
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;

      (component as any).ensureInstitutionsMapped();
      tick(0);

      expect(firstItem.institutions).toEqual([]);
    }));
  });

  describe('ngOnChanges', () => {
    it('should call ensureInstitutionsMapped when resultDetail changes and institutions are loaded', () => {
      mockInstitutionsService.institutionsList = [{ id: 1 }];
      const firstItem: any = {
        implementing_organization: [],
        institutions: []
      };
      (component as any)._resultDetail = { resultTypeResponse: [firstItem] } as any;
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      component.ngOnChanges({
        resultDetail: {} as any
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should not call ensureInstitutionsMapped when resultDetail changes but institutions are not loaded', () => {
      mockInstitutionsService.institutionsList = [];
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      component.ngOnChanges({
        resultDetail: {} as any
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not call ensureInstitutionsMapped when other inputs change (not resultDetail)', () => {
      mockInstitutionsService.institutionsList = [{ id: 1 }];
      const spy = jest.spyOn(component as any, 'ensureInstitutionsMapped');

      component.ngOnChanges({
        disabled: {} as any
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });
});
