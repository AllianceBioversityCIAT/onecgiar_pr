import { TestBed } from '@angular/core/testing';
import { runInInjectionContext, EnvironmentInjector, signal } from '@angular/core';
import { CPMultipleWPsContentComponent } from './multiple-wps-content.component';
import { ResultLevelService } from '../../../../../../../../../../pages/results/pages/result-creator/services/result-level.service';
import { FieldsManagerService } from '../../../../../../../../../../shared/services/fields-manager.service';
import { RdContributorsAndPartnersService } from '../../../../rd-contributors-and-partners.service';
import { TocInitiativeOutcomeListsService } from '../../../../../rd-theory-of-change/components/toc-initiative-outcome-section/services/toc-initiative-outcome-lists.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { RdTheoryOfChangesServicesService } from '../../../../../rd-theory-of-change/rd-theory-of-changes-services.service';
import { MappedResultsModalServiceService } from '../mapped-results-modal/mapped-results-modal-service.service';

jest.useFakeTimers();

describe('CPMultipleWPsContentComponent', () => {
  let component: CPMultipleWPsContentComponent;
  let fieldsManagerMock: any;

  // P2-3204: only the collaborators the constructor / field initializers touch are mocked. The typology
  // computed reads a single signal (`selectedIndicatorData`), so the rest can stay inert.
  const buildComponent = (isCP2026: boolean = true) => {
    fieldsManagerMock = {
      isContributorsPartners2026: jest.fn().mockReturnValue(isCP2026),
      isP25: jest.fn().mockReturnValue(false),
      activeIndicatorsLength: signal(0),
      hasSelectedIndicator: signal(false)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: fieldsManagerMock },
        {
          provide: RdContributorsAndPartnersService,
          useValue: {
            tocSelectionTouched: signal(false),
            tocReferenceCenterInstitutionIds: signal([]),
            tocReferenceSynergyInitiativeIds: signal([]),
            tocReferencePartnerInstitutionIds: signal([])
          }
        },
        { provide: TocInitiativeOutcomeListsService, useValue: {} },
        { provide: ApiService, useValue: {} },
        { provide: RdTheoryOfChangesServicesService, useValue: {} },
        { provide: MappedResultsModalServiceService, useValue: {} }
      ]
    });

    const injector = TestBed.inject(EnvironmentInjector);
    component = runInInjectionContext(injector, () => TestBed.createComponent(CPMultipleWPsContentComponent).componentInstance);
    component.activeTabSignal = signal(null);
    component.outcomeList = signal([]);
    component.outputList = signal([]);
    component.eoiList = signal([]);
    return component;
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.clearAllMocks();
  });

  // P2-3204: the five shapes the TOC actually returns, taken from a census of 59 KPIs in prtest (SP01-SP07).
  describe('indicatorTypologyValue (P2-3204)', () => {
    it('should show the sentinel and the real KPI name together', () => {
      buildComponent();
      component.selectedIndicatorData.set({
        type_value: 'custom',
        type_name: '# partners supporting changes to more gender-equitable norms',
        indicator_typology: 'custom'
      } as any);

      expect(component.indicatorTypologyValue()).toBe('custom — # partners supporting changes to more gender-equitable norms');
    });

    it('should not repeat the value when sentinel and name are identical', () => {
      buildComponent();
      component.selectedIndicatorData.set({
        type_value: 'Innovation Use',
        type_name: 'Innovation Use',
        indicator_typology: 'Innovation Use'
      } as any);

      expect(component.indicatorTypologyValue()).toBe('Innovation Use');
    });

    it('should fall through to the type name when the sentinel is empty', () => {
      buildComponent();
      component.selectedIndicatorData.set({
        type_value: '',
        type_name: 'Number of food producers using CGIAR innovations.',
        indicator_typology: ''
      } as any);

      expect(component.indicatorTypologyValue()).toBe('Number of food producers using CGIAR innovations.');
    });

    it('should fall back to the sentinel when the type name is missing', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_value: 'Innovation Use' } as any);

      expect(component.indicatorTypologyValue()).toBe('Innovation Use');
    });

    it('should fall back to the indicator_typology alias as a last resort', () => {
      buildComponent();
      component.selectedIndicatorData.set({ indicator_typology: 'Innovation Use' } as any);

      expect(component.indicatorTypologyValue()).toBe('Innovation Use');
    });

    it('should keep both values when the sentinel carries a dirty prefix', () => {
      buildComponent();
      component.selectedIndicatorData.set({
        type_value: '_n_Realized genetic gains in farmer-relevant conditions.',
        type_name: 'Realized genetic gains in farmer-relevant conditions.'
      } as any);

      expect(component.indicatorTypologyValue()).toBe(
        '_n_Realized genetic gains in farmer-relevant conditions. — Realized genetic gains in farmer-relevant conditions.'
      );
    });

    it('should return an empty string when the TOC has no typology at all', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_value: '', type_name: null } as any);

      expect(component.indicatorTypologyValue()).toBe('');
    });

    it('should ignore whitespace-only values and trim each part', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_name: '   ', type_value: '  Innovation Use  ' } as any);

      expect(component.indicatorTypologyValue()).toBe('Innovation Use');
    });

    it('should return an empty string when no indicator is selected', () => {
      buildComponent();
      component.selectedIndicatorData.set(null);

      expect(component.indicatorTypologyValue()).toBe('');
    });
  });

  describe('indicatorTypologyDisplay (P2-3204)', () => {
    it('should show "Not specified" when no typology can be resolved, matching the sibling read-only fields', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_value: '', type_name: '' } as any);

      expect(component.indicatorTypologyDisplay()).toBe('Not specified');
    });

    it('should show the resolved typology when there is one', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_name: 'Innovation Use' } as any);

      expect(component.indicatorTypologyDisplay()).toBe('Innovation Use');
    });

    it('should show both values joined when they differ', () => {
      buildComponent();
      component.selectedIndicatorData.set({ type_value: 'custom', type_name: 'Other outcome' } as any);

      expect(component.indicatorTypologyDisplay()).toBe('custom — Other outcome');
    });
  });

  describe('indicatorTypologyTooltip', () => {
    it('should expose the TOC mapping hint in the 2026 phase', () => {
      buildComponent(true);

      expect(component.indicatorTypologyTooltip()).toBe('Maps to TOC: [Type]');
    });

    it('should stay empty outside the 2026 phase', () => {
      buildComponent(false);

      expect(component.indicatorTypologyTooltip()).toBe('');
    });
  });
});
