import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultReviewDrawerComponent, ResultToReview } from './result-review-drawer.component';
import { DrawerModule } from 'primeng/drawer';
import { CommonModule } from '@angular/common';
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
    indicator: 'Number of farmers',
    submission_date: '20/08/2025',
    submitted_by: 'Nicoleta Trifa',
    entity_acronym: 'CIMMYT',
    entity_code: 'V0165-ACIAR-ICCCAD'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultReviewDrawerComponent, DrawerModule, CommonModule, NoopAnimationsModule]
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
});
