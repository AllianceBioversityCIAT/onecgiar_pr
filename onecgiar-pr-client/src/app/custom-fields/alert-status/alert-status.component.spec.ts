import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertStatusComponent } from './alert-status.component';

describe('AlertStatusComponent', () => {
  let component: AlertStatusComponent;
  let fixture: ComponentFixture<AlertStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertStatusComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept only "info" or "warning" status values', () => {
    fixture.componentRef.setInput('status', 'info');
    expect(() => fixture.detectChanges()).not.toThrowError();

    fixture.componentRef.setInput('status', 'warning');
    expect(() => fixture.detectChanges()).not.toThrowError();
  });

  describe('isCollapsible', () => {
    it('is true when status is "info"', () => {
      fixture.componentRef.setInput('status', 'info');
      fixture.detectChanges();

      expect(component.isCollapsible).toBe(true);
    });

    it('is false when status is "warning"', () => {
      fixture.componentRef.setInput('status', 'warning');
      fixture.detectChanges();

      expect(component.isCollapsible).toBe(false);
    });

    it('is true when status is "info" and collapsible is left at its default', () => {
      fixture.componentRef.setInput('status', 'info');
      fixture.detectChanges();

      expect(component.isCollapsible).toBe(true);
    });

    it('is false when status is "info" and collapsible is explicitly false (ITR-R-30)', () => {
      fixture.componentRef.setInput('status', 'info');
      fixture.componentRef.setInput('collapsible', false);
      fixture.detectChanges();

      expect(component.isCollapsible).toBe(false);
    });
  });

  describe('expanded seeding from startExpanded', () => {
    it('defaults to collapsed (false) when startExpanded is not set', () => {
      // component was already created + detectChanges'd (ngOnInit ran) in the outer beforeEach
      // with no startExpanded input, exercising the default input value.
      expect(component.expanded()).toBe(false);
    });

    it('seeds expanded as true when startExpanded is set before the first detectChanges', () => {
      const seededFixture = TestBed.createComponent(AlertStatusComponent);
      const seededComponent = seededFixture.componentInstance;

      seededFixture.componentRef.setInput('startExpanded', true);
      seededFixture.detectChanges(); // triggers ngOnInit, seeding expanded() from startExpanded

      expect(seededComponent.expanded()).toBe(true);
    });
  });

  describe('toggle', () => {
    it('flips expanded from false to true', () => {
      expect(component.expanded()).toBe(false);

      component.toggle();

      expect(component.expanded()).toBe(true);
    });

    it('flips expanded from true back to false on a second call', () => {
      component.toggle();
      expect(component.expanded()).toBe(true);

      component.toggle();

      expect(component.expanded()).toBe(false);
    });
  });
});
