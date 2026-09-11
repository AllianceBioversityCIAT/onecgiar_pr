import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SectionSkeletonDirective } from './section-skeleton.directive';

@Component({
  template: `<div class="detail_container" [appSectionSkeleton]="loading()">
    <div class="pr-field mandatory">control</div>
  </div>`,
  standalone: false
})
class HostComponent {
  // A signal, not a plain field: Angular 21 renders zoneless, so a plain property mutated from a
  // test would not mark the host view dirty and `detectChanges()` would throw NG0100.
  readonly loading = signal(true);
}

describe('SectionSkeletonDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let container: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SectionSkeletonDirective, HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    container = fixture.debugElement.query(By.css('.detail_container')).nativeElement;
  });

  it('marks the container while the section is loading', () => {
    expect(container.classList.contains('rd-loading')).toBe(true);
    expect(container.getAttribute('aria-busy')).toBe('true');
    // jsdom does not implement `inert` behaviour, so assert the attribute, not focusability.
    expect(container.getAttribute('inert')).toBe('');
  });

  it('clears every marker once the section has loaded', () => {
    host.loading.set(false);
    fixture.detectChanges();

    expect(container.classList.contains('rd-loading')).toBe(false);
    expect(container.getAttribute('aria-busy')).toBeNull();
    expect(container.getAttribute('inert')).toBeNull();
  });

  it('re-marks the container when loading is raised again', () => {
    host.loading.set(false);
    fixture.detectChanges();
    host.loading.set(true);
    fixture.detectChanges();

    expect(container.classList.contains('rd-loading')).toBe(true);
  });

  /**
   * The load-bearing guarantee: `DataControlService.someMandatoryFieldIncompleteResultDetail`
   * scans the live DOM for `.pr-field.mandatory`. Masking must never remove those nodes, or the
   * mandatory-field alert count silently changes while a section loads.
   */
  it('keeps the scanned control DOM in place while loading', () => {
    expect(container.querySelectorAll('.pr-field.mandatory').length).toBe(1);
  });
});
