import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RdLinksToResultsComponent } from './rd-links-to-results.component';
import { LinksToResultsGlobalComponent } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterResultNotLinkedPipe } from './pipe/filter-result-not-linked.pipe';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { BeforeUnloadWarningDirective } from '../../../../../../shared/directives/before-unload-warning.directive';
describe('RdLinksToResultsComponent', () => {
  let component: RdLinksToResultsComponent;
  let fixture: ComponentFixture<RdLinksToResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        RdLinksToResultsComponent,
        LinksToResultsGlobalComponent,
        FilterResultNotLinkedPipe,
        PrFieldHeaderComponent,
        SaveButtonComponent,
        DetailSectionTitleComponent
      ],
      imports: [
        HttpClientTestingModule,
        BeforeUnloadWarningDirective
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RdLinksToResultsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * `UCA-T-10` — `RdLinksToResultsComponent` is a thin host (see its class doc comment):
   * `linksToResultsBody`, its load/save calls and its `SectionDirtyTrackerService` instance all
   * live in the child `app-links-to-results-global`. This component's own `CanComponentDeactivate`
   * contract is pure delegation to `@ViewChild(LinksToResultsGlobalComponent)`; the dirty-tracking
   * / load-race behaviour itself is exercised end-to-end in
   * `links-to-results-global.component.spec.ts`. These tests stub the child directly (bypassing
   * view resolution / real HTTP, `fixture.detectChanges()` is never called in this file) to prove
   * the delegation seam in isolation.
   *
   * `rd-links-to-results` does NOT render `SectionBottomBarComponent` — confirmed by reading
   * `links-to-results-global.component.html`, which renders `app-save-button` (its own Save
   * action) instead, at line 216. So unlike `rd-theory-of-change`, there is no Back/Next
   * silent-save case to test here: `section-bottom-bar.goTo()`'s `UnsavedNavigationIntentService.markSilent()`
   * path never runs for this section. `CanComponentDeactivate` is still required for the
   * Save/Discard dialog path on whatever navigation DOES apply (sidebar clicks, browser back).
   */
  describe('CanComponentDeactivate (UCA-T-10)', () => {
    it('hasUnsavedChanges() is false before the child has rendered (nothing loaded yet)', () => {
      expect(component.hasUnsavedChanges()).toBe(false);
    });

    it('hasUnsavedChanges() delegates to the child section-body owner', () => {
      const stubChild = { hasUnsavedChanges: jest.fn(() => true) } as unknown as LinksToResultsGlobalComponent;
      (component as any).linksToResultsGlobal = stubChild;

      expect(component.hasUnsavedChanges()).toBe(true);
      expect(stubChild.hasUnsavedChanges).toHaveBeenCalled();
    });

    it('saveSection() resolves true before the child has rendered (nothing to save)', done => {
      component.saveSection().subscribe(result => {
        expect(result).toBe(true);
        done();
      });
    });

    it('saveSection() delegates to the child section-body owner', done => {
      const stubChild = { saveSection: jest.fn(() => of(true)) } as unknown as LinksToResultsGlobalComponent;
      (component as any).linksToResultsGlobal = stubChild;

      component.saveSection().subscribe(result => {
        expect(result).toBe(true);
        expect(stubChild.saveSection).toHaveBeenCalled();
        done();
      });
    });
  });
});
