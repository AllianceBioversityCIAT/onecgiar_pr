import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultReviewDrawerComponent, ResultToReview } from './result-review-drawer.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ResultReviewDrawerComponent', () => {
  let component: ResultReviewDrawerComponent;
  let fixture: ComponentFixture<ResultReviewDrawerComponent>;

  const mockResult: ResultToReview = {
    id: '1',
    project_id: 'proj-001',
    project_name: 'Test Project',
    result_code: '3816',
    result_title: 'TEST - Farmers trained on protection against wheat disease apply CGIAR innovation in their work',
    indicator_category: 'Innovation Use',
    status_name: 'Pending review',
    acronym: 'aow04',
    toc_title: 'AOW04 - 2030 Outcome',
    indicator: 'Number of farmers',
    submission_date: '20/08/2025'
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
    expect(component.resultToReview()?.result_title).toBe('TEST - Farmers trained on protection against wheat disease apply CGIAR innovation in their work');
    expect(component.resultToReview()?.indicator_category).toBe('Innovation Use');
  });

  describe('Form functionality', () => {
    it('should have TOC result options', () => {
      expect(component.tocResultOptions.length).toBeGreaterThan(0);
    });

    it('should have indicator options', () => {
      expect(component.indicatorOptions.length).toBeGreaterThan(0);
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
      expect(component.rejectJustification).toBe('');
    });

    it('should not confirm reject without justification', () => {
      component.showConfirmRejectDialog.set(true);
      component.rejectJustification = '';
      component.confirmReject();
      expect(component.showConfirmRejectDialog()).toBe(true);
    });

    it('should confirm reject with justification', () => {
      component.visible.set(true);
      component.showConfirmRejectDialog.set(true);
      component.rejectJustification = 'Result does not meet quality standards';
      component.confirmReject();
      expect(component.showConfirmRejectDialog()).toBe(false);
      expect(component.visible()).toBe(false);
    });

    it('should close drawer on confirm approve', () => {
      component.visible.set(true);
      component.resultToReview.set(mockResult);
      component.selectedTocResult = 'aow04';
      component.selectedIndicator = 'ind01';
      component.tocAlignmentValue = true;

      component.confirmApprove();

      expect(component.showConfirmApproveDialog()).toBe(false);
      expect(component.visible()).toBe(false);
    });
  });

  describe('TOC Changes', () => {
    it('should call saveTocChanges without error', () => {
      expect(() => component.saveTocChanges()).not.toThrow();
    });
  });
});
