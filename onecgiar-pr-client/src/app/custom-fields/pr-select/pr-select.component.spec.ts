import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrSelectComponent } from './pr-select.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../pr-field-header/pr-field-header.component';
import { LabelNamePipe } from './label-name.pipe';
import { FormsModule } from '@angular/forms';

describe('PrSelectComponent', () => {
  let component: PrSelectComponent;
  let fixture: ComponentFixture<PrSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrSelectComponent, PrFieldHeaderComponent, LabelNamePipe],
      imports: [HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses a distinct trigger id for select instances with the same option value', () => {
    fixture.componentRef.setInput('optionValue', 'id');
    fixture.detectChanges();

    const secondFixture = TestBed.createComponent(PrSelectComponent);
    secondFixture.componentRef.setInput('optionValue', 'id');
    secondFixture.detectChanges();

    expect(component.triggerId).not.toBe(secondFixture.componentInstance.triggerId);
  });

  it('closes its own expanded dropdown after selecting an option', () => {
    fixture.componentRef.setInput('optionValue', 'id');
    fixture.componentRef.setInput('expandSpaceOnOpen', true);
    fixture.detectChanges();
    component.isDropdownOpen.set(true);

    component.removeFocus({ id: 2 });

    expect(component.isDropdownOpen()).toBe(false);
  });

  it('stops wheel events from propagating outside the options viewport', () => {
    const event = { stopPropagation: jest.fn() } as unknown as WheelEvent;

    component.onOptionsWheel(event);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  // 2026-09-07: in the bilateral editor the section column scrolls, not the window, and the fixed
  // panel stayed put while its input scrolled away. The panel now follows the trigger on ANY
  // scroll container and only closes once the trigger has left the viewport.
  describe('a fixed overlay while something scrolls', () => {
    let trigger: HTMLElement;
    const rectAt = (top: number, height = 40) =>
      ({ top, bottom: top + height, left: 10, width: 300, height, right: 310, x: 10, y: top, toJSON: () => ({}) }) as DOMRect;

    beforeEach(() => {
      fixture.componentRef.setInput('overlayToBody', true);
      fixture.componentRef.setInput('expandSpaceOnOpen', true);
      fixture.detectChanges();
      trigger = document.createElement('a');
      trigger.id = component.triggerId;
      document.body.appendChild(trigger);
      jest.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rectAt(100));
      component.onDropdownOpen();
    });

    afterEach(() => {
      trigger.remove();
    });

    it('anchors the panel under the trigger when it opens', () => {
      expect(component.overlayStyles()).toContain('top: 144px');
      expect(component.overlayStyles()).toContain('left: 10px');
      expect(component.overlayStyles()).toContain('width: 300px');
    });

    it('re-anchors the panel when an inner scroll container (not the window) scrolls', () => {
      (trigger.getBoundingClientRect as jest.Mock).mockReturnValue(rectAt(60));
      const column = document.createElement('div');
      document.body.appendChild(column);

      column.dispatchEvent(new Event('scroll', { bubbles: false }));

      expect(component.overlayStyles()).toContain('top: 104px');
      expect(component.isDropdownOpen()).toBe(true);
      column.remove();
    });

    it('re-anchors on a window scroll too, instead of closing', () => {
      (trigger.getBoundingClientRect as jest.Mock).mockReturnValue(rectAt(20));

      document.dispatchEvent(new Event('scroll'));

      expect(component.overlayStyles()).toContain('top: 64px');
      expect(component.isDropdownOpen()).toBe(true);
    });

    it('ignores the option list scrolling itself', () => {
      const panel = (fixture.nativeElement as HTMLElement).querySelector('.options') as HTMLElement;
      const before = component.overlayStyles();
      (trigger.getBoundingClientRect as jest.Mock).mockReturnValue(rectAt(0));

      (panel ?? document.body).dispatchEvent(new Event('scroll'));

      if (panel) expect(component.overlayStyles()).toBe(before);
      expect(component.isDropdownOpen()).toBe(true);
    });

    it('closes once the trigger has scrolled out of the viewport', () => {
      (trigger.getBoundingClientRect as jest.Mock).mockReturnValue(rectAt(-200));

      document.dispatchEvent(new Event('scroll'));

      expect(component.isDropdownOpen()).toBe(false);
      expect(component.overlayStyles()).toBe('');
    });

    it('stops listening once closed, so a later scroll cannot resurrect the styles', () => {
      component.removeFocus();
      (trigger.getBoundingClientRect as jest.Mock).mockReturnValue(rectAt(50));

      document.dispatchEvent(new Event('scroll'));

      expect(component.overlayStyles()).toBe('');
    });
  });
});
