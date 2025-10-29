import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollapsibleContainerComponent } from './collapsible-container.component';

describe('CollapsibleContainerComponent', () => {
  let component: CollapsibleContainerComponent;
  let fixture: ComponentFixture<CollapsibleContainerComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [CollapsibleContainerComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CollapsibleContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set collapse=true when input is not boolean on init', () => {
    component.collapse = null as any;
    component.ngOnInit();
    expect(component.collapse).toBe(true);
  });

  it('should keep collapse when input is boolean on init', () => {
    component.collapse = false;
    component.ngOnInit();
    expect(component.collapse).toBe(false);
  });

  it('should toggle collapse and emit value', () => {
    component.collapse = true;
    const emitted: boolean[] = [];
    component.toggleCollapseEvent.subscribe(v => emitted.push(v));
    component.toggleCollapse();
    expect(component.collapse).toBe(false);
    expect(emitted).toEqual([false]);
    component.toggleCollapse();
    expect(component.collapse).toBe(true);
    expect(emitted).toEqual([false, true]);
  });
});
