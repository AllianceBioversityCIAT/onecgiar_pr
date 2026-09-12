import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SpTabEmptyStateComponent } from './sp-tab-empty-state.component';

describe('SpTabEmptyStateComponent', () => {
  let fixture: ComponentFixture<SpTabEmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpTabEmptyStateComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SpTabEmptyStateComponent);
    fixture.componentRef.setInput('title', 'Nothing here yet');
    fixture.detectChanges();
  });

  it('renders the hero variant with icon and title', () => {
    fixture.componentRef.setInput('icon', 'view_kanban');
    fixture.componentRef.setInput('description', 'Try reporting a result.');
    fixture.componentRef.setInput('primaryLabel', 'Go to Reporting');
    fixture.componentRef.setInput('primaryRouterLink', '/reporting');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="sp-tab-empty-state"]')).toBeTruthy();
    expect(root.textContent).toContain('Nothing here yet');
    expect(root.textContent).toContain('Try reporting a result.');
    expect(root.textContent).toContain('Go to Reporting');
    expect(root.querySelector('.material-icons-round')?.textContent?.trim()).toBe('view_kanban');
  });

  it('renders the filtered variant without an icon', () => {
    fixture.componentRef.setInput('variant', 'filtered');
    fixture.componentRef.setInput('icon', 'view_kanban');
    fixture.componentRef.setInput('secondaryLabel', 'Clear filters');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.material-icons-round')).toBeNull();
    expect(root.textContent).toContain('Clear filters');
  });
});
