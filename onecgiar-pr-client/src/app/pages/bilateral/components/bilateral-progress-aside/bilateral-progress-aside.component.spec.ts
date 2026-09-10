import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BilateralProgressAsideComponent } from './bilateral-progress-aside.component';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';

describe('BilateralProgressAsideComponent', () => {
  let fixture: ComponentFixture<BilateralProgressAsideComponent>;
  let component: BilateralProgressAsideComponent;
  let mds: BilateralMdsTrackerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralProgressAsideComponent],
      providers: [BilateralMdsTrackerService],
    }).compileComponents();

    mds = TestBed.inject(BilateralMdsTrackerService);
    mds.setSectionFields('general-info', [
      { key: 'title', label: 'Title', filled: true },
      { key: 'description', label: 'Description', filled: false },
    ]);
    mds.setSectionFields('geography', [{ key: 'geo', label: 'Geography', filled: false }]);

    fixture = TestBed.createComponent(BilateralProgressAsideComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('openSectionName', 'general-info');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show active section fields', () => {
    expect(component.activeSection()?.sectionName).toBe('general-info');
    expect(component.activeFieldGroups()[0].items.length).toBe(2);
  });

  it('should navigate on section select', () => {
    const scrollIntoView = jest.fn();
    const el = document.createElement('div');
    el.setAttribute('data-section', 'geography');
    el.scrollIntoView = scrollIntoView;
    document.body.appendChild(el);

    jest.useFakeTimers();
    component.selectSection('geography');
    expect(component.openSectionName()).toBe('geography');
    jest.advanceTimersByTime(60);
    expect(scrollIntoView).toHaveBeenCalled();
    jest.useRealTimers();
    el.remove();
  });

  it('syncAsideTop matches section-zero viewport top', () => {
    const zero = document.createElement('div');
    zero.id = 'bcr-section-zero';
    document.body.appendChild(zero);
    jest.spyOn(zero, 'getBoundingClientRect').mockReturnValue({
      top: 212,
      bottom: 400,
      left: 0,
      right: 0,
      width: 0,
      height: 188,
      x: 0,
      y: 212,
      toJSON: () => ({}),
    } as DOMRect);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });

    component.syncAsideTop();
    expect(component.asideTopPx()).toBe(212);

    zero.remove();
  });

  it('syncAsideTop pins below navbar when section-zero scrolls up', () => {
    const zero = document.createElement('div');
    zero.id = 'bcr-section-zero';
    document.body.appendChild(zero);
    jest.spyOn(zero, 'getBoundingClientRect').mockReturnValue({
      top: -40,
      bottom: 100,
      left: 0,
      right: 0,
      width: 0,
      height: 140,
      x: 0,
      y: -40,
      toJSON: () => ({}),
    } as DOMRect);

    const navbar = document.createElement('div');
    navbar.className = 'header_panel_container';
    document.body.appendChild(navbar);
    jest.spyOn(navbar, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 80,
      left: 0,
      right: 1200,
      width: 1200,
      height: 80,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1600 });

    component.syncAsideTop();
    expect(component.asideTopPx()).toBe(92); // 80 + 12 gap

    zero.remove();
    navbar.remove();
  });
});
