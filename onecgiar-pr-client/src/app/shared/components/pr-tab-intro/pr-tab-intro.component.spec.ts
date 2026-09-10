import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { PrTabIntroComponent } from './pr-tab-intro.component';

describe('PrTabIntroComponent', () => {
  let component: PrTabIntroComponent;
  let fixture: ComponentFixture<PrTabIntroComponent>;
  let componentRef: ComponentRef<PrTabIntroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrTabIntroComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrTabIntroComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
  });

  it('should create with default inputs and closed by default (STEP-R-1)', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.isOpen()).toBe(false);
    expect(component.title()).toBe('What does this tab show?');
    expect(component.icon()).toBe('info');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('What does this tab show?');
  });

  it('should render custom title and description (STEP-R-4)', () => {
    componentRef.setInput('title', 'Overview Guide');
    componentRef.setInput('description', 'This is a description of the overview tab.');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Overview Guide');
    // Initially closed, description is not rendered
    expect(compiled.textContent).not.toContain('This is a description of the overview tab.');
  });

  it('should toggle collapse state when header or button is clicked (STEP-R-2)', () => {
    componentRef.setInput('description', 'Collapsible content description');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.isOpen()).toBe(false);
    expect(compiled.textContent).not.toContain('Collapsible content description');

    // Click toggle header to open
    const header = compiled.querySelector('[role="button"]') as HTMLElement;
    header.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    expect(compiled.textContent).toContain('Collapsible content description');

    // Click toggle header again to close
    header.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(compiled.textContent).not.toContain('Collapsible content description');
  });

  it('should respect defaultOpen input if true (STEP-R-3)', () => {
    componentRef.setInput('defaultOpen', true);
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);
  });
});
