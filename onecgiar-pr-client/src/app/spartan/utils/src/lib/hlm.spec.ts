import { ApplicationRef, Component, Directive, ElementRef, EnvironmentInjector, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ClassValue } from 'clsx';
import { classes, hlm } from './hlm';

const flushFrame = () => new Promise<void>(resolve => setTimeout(resolve, 40));

@Directive({ selector: '[testExtraClasses]', standalone: true })
class ExtraClassesDirective {
  readonly extra = signal<ClassValue[] | string>('font-bold');
  constructor() {
    classes(() => this.extra());
  }
}

@Component({ selector: 'app-hlm-target', standalone: true, template: '' })
class TargetComponent {
  readonly cls = signal<ClassValue[] | string>('text-red-500');
  constructor() {
    classes(() => this.cls());
  }
}

@Component({
  standalone: true,
  imports: [TargetComponent, ExtraClassesDirective],
  template: '<app-hlm-target class="base-class"></app-hlm-target>'
})
class WithBaseClassHost {}

@Component({ standalone: true, imports: [TargetComponent], template: '<app-hlm-target></app-hlm-target>' })
class NoBaseClassHost {}

@Component({
  standalone: true,
  imports: [TargetComponent],
  template: '<app-hlm-target style="transition: opacity 1s"></app-hlm-target>'
})
class WithInlineTransitionHost {}

@Component({
  standalone: true,
  imports: [TargetComponent],
  template: '<app-hlm-target style="transition: opacity 1s !important"></app-hlm-target>'
})
class WithImportantTransitionHost {}

@Component({
  standalone: true,
  imports: [TargetComponent, ExtraClassesDirective],
  template: '<app-hlm-target testExtraClasses></app-hlm-target>'
})
class TwoSourcesHost {}

function targetEl(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement.querySelector('app-hlm-target') as HTMLElement;
}

function targetInstance(fixture: ComponentFixture<unknown>): TargetComponent {
  return fixture.debugElement.children[0].componentInstance as TargetComponent;
}

describe('hlm()', () => {
  it('merges plain strings', () => {
    expect(hlm('p-2', 'text-red-500')).toBe('p-2 text-red-500');
  });

  it('lets the last conflicting tailwind class win', () => {
    expect(hlm('p-2', 'p-4')).toBe('p-4');
  });

  it('ignores falsy values', () => {
    expect(hlm('p-2', false, null, undefined, '', 0 as any)).toBe('p-2');
  });

  it('accepts arrays and conditional objects', () => {
    expect(hlm(['p-2', 'flex'], { 'text-red-500': true, hidden: false })).toBe('p-2 flex text-red-500');
  });

  it('returns an empty string for no input', () => {
    expect(hlm()).toBe('');
  });
});

describe('classes()', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('with a host "class" attribute', () => {
    let fixture: ComponentFixture<WithBaseClassHost>;

    beforeEach(() => {
      fixture = TestBed.createComponent(WithBaseClassHost);
      fixture.detectChanges();
    });

    it('keeps the base class and adds the computed ones', () => {
      const el = targetEl(fixture);
      expect(el.className).toContain('base-class');
      expect(el.className).toContain('text-red-500');
    });

    it('swaps the computed classes when the source changes', () => {
      targetInstance(fixture).cls.set('text-blue-500');
      fixture.detectChanges();

      const el = targetEl(fixture);
      expect(el.className).toContain('text-blue-500');
      expect(el.className).not.toContain('text-red-500');
      expect(el.className).toContain('base-class');
    });

    it('accepts an array of class values', () => {
      targetInstance(fixture).cls.set(['flex', 'gap-2', { hidden: false }]);
      fixture.detectChanges();

      const el = targetEl(fixture);
      expect(el.className).toContain('flex');
      expect(el.className).toContain('gap-2');
      expect(el.className).not.toContain('hidden');
    });

    it('keeps only the base class when the computed classes go empty', () => {
      targetInstance(fixture).cls.set('');
      fixture.detectChanges();
      expect(targetEl(fixture).className).toBe('base-class');
    });

    it('suppresses transitions on first write and restores them afterwards', async () => {
      const el = targetEl(fixture);
      expect(el.style.getPropertyValue('transition')).toBe('none');

      await flushFrame();
      expect(el.style.getPropertyValue('transition')).toBe('');
    });
  });

  describe('without a host "class" attribute', () => {
    it('applies only the computed classes', () => {
      const fixture = TestBed.createComponent(NoBaseClassHost);
      fixture.detectChanges();
      expect(targetEl(fixture).className).toBe('text-red-500');
    });

    it('leaves the element class empty when the computed value is empty', () => {
      const fixture = TestBed.createComponent(NoBaseClassHost);
      fixture.componentRef.changeDetectorRef.detectChanges();
      const instance = fixture.debugElement.children[0].componentInstance as TargetComponent;
      instance.cls.set('');
      fixture.detectChanges();
      expect(targetEl(fixture).className).toBe('');
    });
  });

  describe('inline transition restore', () => {
    it('restores a previous inline transition', async () => {
      const fixture = TestBed.createComponent(WithInlineTransitionHost);
      fixture.detectChanges();
      const el = targetEl(fixture);
      expect(el.style.getPropertyValue('transition')).toBe('none');

      await flushFrame();
      expect(el.style.getPropertyValue('transition')).toBe('opacity 1s');
      expect(el.style.getPropertyPriority('transition')).toBe('');
    });

    it('restores a previous !important inline transition', async () => {
      const fixture = TestBed.createComponent(WithImportantTransitionHost);
      fixture.detectChanges();

      await flushFrame();
      const el = targetEl(fixture);
      expect(el.style.getPropertyValue('transition')).toBe('opacity 1s');
      expect(el.style.getPropertyPriority('transition')).toBe('important');
    });

    it('restores the transition when destroyed before the first effect ran', () => {
      const fixture = TestBed.createComponent(WithInlineTransitionHost);
      const el = targetEl(fixture);
      expect(el.style.getPropertyValue('transition')).toBe('none');

      fixture.destroy();

      expect(el.style.getPropertyValue('transition')).toBe('opacity 1s');
    });

    it('cancels the pending restore frame when destroyed right after the first effect', async () => {
      const fixture = TestBed.createComponent(WithInlineTransitionHost);
      fixture.detectChanges();
      const el = targetEl(fixture);

      fixture.destroy();
      await flushFrame();

      // The frame was cancelled, so the suppression the effect installed is still in place.
      expect(el.style.getPropertyValue('transition')).toBe('none');
    });
  });

  describe('several sources on the same element', () => {
    it('merges every source', () => {
      const fixture = TestBed.createComponent(TwoSourcesHost);
      fixture.detectChanges();

      const el = targetEl(fixture);
      expect(el.className).toContain('text-red-500');
      expect(el.className).toContain('font-bold');
    });

    it('drops only the classes of the source that went away', () => {
      const fixture = TestBed.createComponent(TwoSourcesHost);
      fixture.detectChanges();

      const el = targetEl(fixture);
      const directive = fixture.debugElement.children[0].injector.get(ExtraClassesDirective);
      directive.extra.set('italic');
      fixture.detectChanges();

      expect(el.className).toContain('italic');
      expect(el.className).not.toContain('font-bold');
      expect(el.className).toContain('text-red-500');
    });

    it('cleans up every source on destroy', () => {
      const fixture = TestBed.createComponent(TwoSourcesHost);
      fixture.detectChanges();
      const el = targetEl(fixture);

      expect(() => fixture.destroy()).not.toThrow();
      // The element survives the teardown with whatever the last write left on it.
      expect(typeof el.className).toBe('string');
    });
  });

  describe('external class mutations', () => {
    it('adopts classes added by someone else as base classes', async () => {
      const fixture = TestBed.createComponent(NoBaseClassHost);
      fixture.detectChanges();
      await flushFrame();

      const el = targetEl(fixture);
      el.className = `${el.className} externally-added`;
      await flushFrame();

      expect(el.className).toContain('externally-added');
      expect(el.className).toContain('text-red-500');

      // And a later computed change must not wipe the adopted class.
      targetInstance(fixture).cls.set('text-green-500');
      fixture.detectChanges();
      expect(el.className).toContain('externally-added');
      expect(el.className).toContain('text-green-500');
    });

    it('ignores class mutations on elements it does not manage', async () => {
      const fixture = TestBed.createComponent(NoBaseClassHost);
      fixture.detectChanges();

      const stranger = document.createElement('div');
      document.body.appendChild(stranger);
      stranger.className = 'not-managed';
      await flushFrame();

      expect(stranger.className).toBe('not-managed');
      stranger.remove();
    });

    it('ignores non-class attribute mutations', async () => {
      const fixture = TestBed.createComponent(NoBaseClassHost);
      fixture.detectChanges();
      await flushFrame();

      const el = targetEl(fixture);
      el.setAttribute('data-something', 'value');
      await flushFrame();

      expect(el.className).toBe('text-red-500');
    });
  });

  describe('explicit options', () => {
    it('uses the given elementRef and injector instead of injecting them', () => {
      const injector = TestBed.inject(EnvironmentInjector);
      const el = document.createElement('div');

      classes(() => 'p-4 text-sm', { elementRef: new ElementRef(el), injector });
      TestBed.inject(ApplicationRef).tick();

      expect(el.className).toContain('p-4');
      expect(el.className).toContain('text-sm');
    });
  });

  describe('on the server platform', () => {
    it('applies the classes without touching transitions', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });

      const fixture = TestBed.createComponent(NoBaseClassHost);
      fixture.detectChanges();

      const el = targetEl(fixture);
      expect(el.className).toBe('text-red-500');
      expect(el.style.getPropertyValue('transition')).toBe('');

      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
