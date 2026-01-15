import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultReviewDrawerComponent, ResultToReview } from './result-review-drawer.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ResultReviewDrawerComponent', () => {
  let component: ResultReviewDrawerComponent;
  let fixture: ComponentFixture<ResultReviewDrawerComponent>;

  const mockResult: ResultToReview = {
    code: '3816',
    title: 'TEST - Farmers trained on protection against wheat disease apply CGIAR innovation in their work',
    indicator_category: 'Innovation Use',
    status: 'Pending review',
    toc_result: 'AOW04 - 2030 Outcome',
    toc_result_id: 'aow04',
    indicator: 'Number of farmers',
    indicator_id: 'ind01',
    submission_date: '20/08/2025',
    submitted_by: 'Nicoleta Trifa',
    entity_acronym: 'CIMMYT',
    entity_code: 'V0165-ACIAR-ICCCAD',
    toc_alignment: true,
    result_description: 'Farmers are trained on wheat disease protection.',
    geographic_scope: 'global',
    regions: ['africa', 'western_africa'],
    countries: ['kenya', 'ethiopia']
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultReviewDrawerComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultReviewDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with drawer not full screen', () => {
    expect(component.drawerFullScreen()).toBe(false);
  });

  it('should initialize with visible as false', () => {
    expect(component.visible()).toBe(false);
  });

  it('should toggle full screen mode', () => {
    expect(component.drawerFullScreen()).toBe(false);

    component.toggleFullScreen();
    expect(component.drawerFullScreen()).toBe(true);

    component.toggleFullScreen();
    expect(component.drawerFullScreen()).toBe(false);
  });

  it('should close drawer and reset full screen', () => {
    component.visible.set(true);
    component.drawerFullScreen.set(true);

    component.closeDrawer();

    expect(component.visible()).toBe(false);
    expect(component.drawerFullScreen()).toBe(false);
  });

  it('should set body overflow to hidden on init', () => {
    component.ngOnInit();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should set body overflow to auto on destroy', () => {
    component.ngOnDestroy();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should accept result to review', () => {
    component.resultToReview.set(mockResult);

    expect(component.resultToReview()).toEqual(mockResult);
    expect(component.resultToReview()?.title).toBe('TEST - Farmers trained on protection against wheat disease apply CGIAR innovation in their work');
    expect(component.resultToReview()?.indicator_category).toBe('Innovation Use');
  });

  describe('Form functionality', () => {
    it('should have TOC result options', () => {
      expect(component.tocResultOptions().length).toBeGreaterThan(0);
    });

    it('should have indicator options', () => {
      expect(component.indicatorOptions().length).toBeGreaterThan(0);
    });

    it('should have region options', () => {
      expect(component.regionOptions().length).toBeGreaterThan(0);
    });

    it('should have country options', () => {
      expect(component.countryOptions().length).toBeGreaterThan(0);
    });

    it('should remove region from selected regions', () => {
      component.selectedRegions.set(['africa', 'asia']);
      component.removeRegion('africa');
      expect(component.selectedRegions()).toEqual(['asia']);
    });

    it('should remove country from selected countries', () => {
      component.selectedCountries.set(['kenya', 'ethiopia']);
      component.removeCountry('kenya');
      expect(component.selectedCountries()).toEqual(['ethiopia']);
    });

    it('should get correct region label', () => {
      const label = component.getRegionLabel('africa');
      expect(label).toBe('Africa');
    });

    it('should get correct country label', () => {
      const label = component.getCountryLabel('kenya');
      expect(label).toBe('Kenya');
    });

    it('should get correct TOC result label', () => {
      const label = component.getTocResultLabel('aow01');
      expect(label).toContain('AOW01');
    });

    it('should get correct indicator label', () => {
      const label = component.getIndicatorLabel('ind01');
      expect(label).toContain('small-scale producers');
    });
  });

  describe('Approval and Rejection flow', () => {
    it('should show confirm approve dialog on approve', () => {
      component.onApprove();
      expect(component.showConfirmApproveDialog()).toBe(true);
    });

    it('should hide confirm approve dialog on cancel', () => {
      component.showConfirmApproveDialog.set(true);
      component.cancelApprove();
      expect(component.showConfirmApproveDialog()).toBe(false);
    });

    it('should show confirm reject dialog on reject', () => {
      component.onReject();
      expect(component.showConfirmRejectDialog()).toBe(true);
    });

    it('should hide confirm reject dialog on cancel', () => {
      component.showConfirmRejectDialog.set(true);
      component.cancelReject();
      expect(component.showConfirmRejectDialog()).toBe(false);
      expect(component.rejectJustification()).toBe('');
    });

    it('should not confirm reject without justification', () => {
      component.showConfirmRejectDialog.set(true);
      component.rejectJustification.set('');
      component.confirmReject();
      expect(component.showConfirmRejectDialog()).toBe(true);
    });

    it('should require update explanation when modifications are made', () => {
      // First set initial values
      component.selectedTocResult.set('aow04');
      component.selectedIndicator.set('ind01');
      component.tocAlignmentValue.set(true);
      component.resultDescription.set('Test description');
      component.geographicScope.set('global');
      component.selectedRegions.set(['africa']);
      component.selectedCountries.set([]);

      // Store original values
      component.visible.set(true);
      fixture.detectChanges();

      // Simulate a modification
      component.selectedTocResult.set('aow01');
      fixture.detectChanges();

      expect(component.hasModifications()).toBe(true);
      expect(component.canApproveOrReject()).toBe(false);

      // Add explanation
      component.updateExplanation.set('Changed TOC result for better alignment');
      expect(component.canApproveOrReject()).toBe(true);
    });

    it('should log form data on confirm approve', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.resultToReview.set(mockResult);
      component.selectedTocResult.set('aow04');
      component.selectedIndicator.set('ind01');
      component.tocAlignmentValue.set(true);
      component.resultDescription.set('Test description');
      component.geographicScope.set('global');
      component.selectedRegions.set(['africa']);
      component.selectedCountries.set(['kenya']);

      component.confirmApprove();

      expect(consoleSpy).toHaveBeenCalledWith('=== APPROVE RESULT - FORM DATA ===');
      consoleSpy.mockRestore();
    });

    it('should log form data on confirm reject', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      component.resultToReview.set(mockResult);
      component.rejectJustification.set('Result does not meet quality standards');

      component.confirmReject();

      expect(consoleSpy).toHaveBeenCalledWith('=== REJECT RESULT - FORM DATA ===');
      consoleSpy.mockRestore();
    });
  });
});
