import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { StepTwoBasicInfoComponent, InnovationComplementary } from './step-two-basic-info.component';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { Subject, of, throwError } from 'rxjs';
import { UnsavedNavigationIntentService } from '../../../../../../../../../../shared/services/unsaved-changes/unsaved-navigation-intent.service';

describe('StepTwoBasicInfoComponent', () => {
  let component: StepTwoBasicInfoComponent;
  let fixture: ComponentFixture<StepTwoBasicInfoComponent>;
  let apiServiceMock: any;
  let ipsrDataControlServiceMock: any;
  let routerMock: any;

  beforeEach(async () => {
    apiServiceMock = {
      isStepTwoTwo: false,
      isStepTwoOne: true,
      resultsSE: {
        PostStepTwoComentariesInnovation: jest.fn().mockReturnValue(of({})),
        PostStepTwoComentariesInnovationPrevius: jest.fn().mockReturnValue(of({})),
        getStepTwoComentariesInnovationId: jest.fn().mockReturnValue(of({ response: { results: [] } })),
        getStepTwoComentariesInnovation: jest.fn().mockReturnValue(of({ response: { comentaryPrincipals: [] } }))
      },
      rolesSE: {
        readOnly: false
      }
    };

    ipsrDataControlServiceMock = {
      resultInnovationCode: '123',
      resultInnovationPhase: '1'
    };

    routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [StepTwoBasicInfoComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceMock },
        { provide: IpsrDataControlService, useValue: ipsrDataControlServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StepTwoBasicInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component with correct values', () => {
    component.ngOnInit();
    expect(apiServiceMock.isStepTwoTwo).toBe(true);
    expect(apiServiceMock.isStepTwoOne).toBe(false);
    expect(apiServiceMock.resultsSE.getStepTwoComentariesInnovationId).toHaveBeenCalled();
    expect(apiServiceMock.resultsSE.getStepTwoComentariesInnovation).toHaveBeenCalled();
  });

  it('should call PostStepTwoComentariesInnovation on save', () => {
    component.onSaveSection();
    expect(apiServiceMock.resultsSE.PostStepTwoComentariesInnovation).toHaveBeenCalledWith(component.bodyStep2);
  });

  it('should return correct goToStep link', () => {
    const link = component.goToStep();
    expect(link).toBe(
      `<a class='open_route' href='/ipsr/detail/123/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=1' target='_blank'> Go to step 2.1</a>`
    );
  });

  it('should navigate correctly on savePreviousNext when readOnly is true', () => {
    apiServiceMock.rolesSE.readOnly = true;
    component.api.isStepTwoTwo = true;
    component.onSavePreviuosNext('next');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/ipsr/detail/123/ipsr-innovation-use-pathway/step-3'], { queryParams: { phase: '1' } });
  });

  it('should call PostStepTwoComentariesInnovationPrevius on savePreviousNext when readOnly is false', () => {
    apiServiceMock.rolesSE.readOnly = false;
    component.api.isStepTwoTwo = true;
    component.onSavePreviuosNext('next');
    expect(apiServiceMock.resultsSE.PostStepTwoComentariesInnovationPrevius).toHaveBeenCalledWith(component.bodyStep2, 'next');
  });

  it('should get innovation complementaries and update bodyStep2', () => {
    const response = {
      response: {
        results: [
          { result_by_innovation_package_id: '1', complementary_enablers_one: 'a;b', complementary_enablers_two: 'c;d' },
          { result_by_innovation_package_id: '2', complementary_enablers_one: null, complementary_enablers_two: 'e;f' }
        ]
      }
    };
    apiServiceMock.resultsSE.getStepTwoComentariesInnovationId.mockReturnValue(of(response));
    component.getInnovationComplementaries();
    expect(component.bodyStep2.length).toBe(2);
    expect(component.bodyStep2[0].complementary_innovation_enabler_types_one).toEqual(['a', 'b']);
    expect(component.bodyStep2[0].complementary_innovation_enabler_types_two).toEqual(['c', 'd']);
    expect(component.bodyStep2[1].complementary_innovation_enabler_types_one).toEqual([]);
    expect(component.bodyStep2[1].complementary_innovation_enabler_types_two).toEqual(['e', 'f']);
  });

  it('should select one level and update complementary_innovation_enabler_types_two', () => {
    component.bodyStep2 = [
      {
        complementary_innovation_enabler_types_one: ['1'],
        complementary_innovation_enabler_types_two: []
      } as InnovationComplementary
    ];
    const category = {
      complementary_innovation_enabler_types_id: '1',
      subCategories: [{ complementary_innovation_enabler_types_id: '2' }]
    };
    component.selectedOneLevel(category, 0, []);
    expect(component.bodyStep2[0].complementary_innovation_enabler_types_two).toEqual(['2']);
  });

  it('should deselect one level and update complementary_innovation_enabler_types_two', () => {
    component.bodyStep2 = [
      {
        complementary_innovation_enabler_types_one: ['1'],
        complementary_innovation_enabler_types_two: ['2']
      } as InnovationComplementary
    ];
    const category = {
      complementary_innovation_enabler_types_id: '1',
      subCategories: [{ complementary_innovation_enabler_types_id: '2' }]
    };
    component.bodyStep2[0].complementary_innovation_enabler_types_one = [];
    component.selectedOneLevel(category, 0, []);
    expect(component.bodyStep2[0].complementary_innovation_enabler_types_two).toEqual([]);
  });

  it('should select two and update complementary_innovation_enabler_types_one', () => {
    component.bodyStep2 = [
      {
        complementary_innovation_enabler_types_one: [],
        complementary_innovation_enabler_types_two: []
      } as InnovationComplementary
    ];
    const category = {
      complementary_innovation_enabler_types_id: '1'
    };
    component.selectedTwo(category, 0);
    expect(component.bodyStep2[0].complementary_innovation_enabler_types_one).toEqual(['1']);
  });

  /**
   * P2-3427 (Ángel, 28-Sep-2026 review) — `CanComponentDeactivate` wiring. `SectionDirtyTrackerService`
   * is component-scoped, so each test gets a fresh instance from `TestBed.createComponent`.
   *
   * The outer `beforeEach` already ran `ngOnInit()` against an EMPTY list; every test here reloads with
   * two rows so a snapshot taken at the wrong moment (construction, or the empty first load) reports the
   * freshly loaded, untouched sub-step as dirty — the control negative of the first test.
   */
  describe('CanComponentDeactivate (P2-3427)', () => {
    const loadRows = () => {
      apiServiceMock.resultsSE.getStepTwoComentariesInnovationId.mockReturnValue(
        of({
          response: {
            results: [
              { result_by_innovation_package_id: '1', complementary_enablers_one: '10;11', complementary_enablers_two: '20' },
              { result_by_innovation_package_id: '2', complementary_enablers_one: null, complementary_enablers_two: null }
            ]
          }
        })
      );
      component.getInnovationComplementaries();
      expect(component.bodyStep2.length).toBe(2);
    };

    it('is false right after the load flow completes (untouched)', () => {
      loadRows();
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('is true after ticking an enabler type (the user-action cascade mutates the body)', () => {
      loadRows();
      component.selectedTwo({ complementary_innovation_enabler_types_id: '12' }, 1);
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    it('is true after appending to a bound array of the body', () => {
      loadRows();
      component.bodyStep2[0].complementary_innovation_enabler_types_two.push('21');
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    /**
     * The save call is a Subject so the assertion can run at BOTH instants: still dirty while the call is
     * in flight (calling save is not saving), clean the moment it resolves and `saveSection()` emits `true`.
     */
    it('is false right when saveSection() emits true, and not one instant before', () => {
      loadRows();
      component.bodyStep2[0].complementary_innovation_enabler_types_two.push('21');
      const save$ = new Subject<any>();
      apiServiceMock.resultsSE.PostStepTwoComentariesInnovation.mockReturnValue(save$);

      let sawTrue = false;
      component.saveSection().subscribe(result => {
        sawTrue = result === true;
        expect(component.hasUnsavedChanges()).toBe(false);
      });
      expect(apiServiceMock.resultsSE.PostStepTwoComentariesInnovation).toHaveBeenCalledWith(component.bodyStep2);
      expect(component.hasUnsavedChanges()).toBe(true);

      save$.next({});
      save$.complete();

      expect(sawTrue).toBe(true);
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('saveSection() resolves false (not throws) when the save call fails, and the sub-step stays dirty', () => {
      loadRows();
      component.bodyStep2[0].complementary_innovation_enabler_types_two.push('21');
      apiServiceMock.resultsSE.PostStepTwoComentariesInnovation.mockReturnValue(throwError(() => new Error('save failed')));

      let result: boolean | undefined;
      let errored = false;
      component.saveSection().subscribe({ next: value => (result = value), error: () => (errored = true) });

      expect(errored).toBe(false);
      expect(result).toBe(false);
      expect(component.hasUnsavedChanges()).toBe(true);
    });

    describe('Save & go to previous/next step', () => {
      let markSilent: jest.SpyInstance;
      let markSilentCallsAtNavigate: number[];

      beforeEach(() => {
        markSilent = jest.spyOn(TestBed.inject(UnsavedNavigationIntentService), 'markSilent');
        markSilentCallsAtNavigate = [];
        routerMock.navigate.mockImplementation(() => {
          markSilentCallsAtNavigate.push(markSilent.mock.calls.length);
          return Promise.resolve(true);
        });
        component.api.isStepTwoTwo = true;
      });

      it.each(['next', 'previous'])('read-only: marks the navigation silent BEFORE router.navigate (%s)', async descrip => {
        apiServiceMock.rolesSE.readOnly = true;

        await component.onSavePreviuosNext(descrip);

        expect(apiServiceMock.resultsSE.PostStepTwoComentariesInnovationPrevius).not.toHaveBeenCalled();
        expect(routerMock.navigate).toHaveBeenCalledTimes(1);
        expect(markSilentCallsAtNavigate).toEqual([1]);
      });

      it.each(['next', 'previous'])('after a successful save the sub-step is clean and the navigation is marked silent before navigating (%s)', async descrip => {
        loadRows();
        apiServiceMock.rolesSE.readOnly = false;
        component.bodyStep2[0].complementary_innovation_enabler_types_two.push('21');
        expect(component.hasUnsavedChanges()).toBe(true);

        await component.onSavePreviuosNext(descrip);

        expect(apiServiceMock.resultsSE.PostStepTwoComentariesInnovationPrevius).toHaveBeenCalledWith(component.bodyStep2, descrip);
        expect(component.hasUnsavedChanges()).toBe(false);
        expect(routerMock.navigate).toHaveBeenCalledTimes(1);
        expect(markSilentCallsAtNavigate).toEqual([1]);
      });

      it('a failing save neither navigates nor cleans the sub-step', async () => {
        loadRows();
        apiServiceMock.rolesSE.readOnly = false;
        component.bodyStep2[0].complementary_innovation_enabler_types_two.push('21');
        apiServiceMock.resultsSE.PostStepTwoComentariesInnovationPrevius.mockReturnValue(throwError(() => new Error('save failed')));

        await component.onSavePreviuosNext('next');

        expect(routerMock.navigate).not.toHaveBeenCalled();
        expect(component.hasUnsavedChanges()).toBe(true);
      });
    });
  });
});
