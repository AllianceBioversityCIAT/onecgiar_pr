import { Component, ViewChild } from '@angular/core';
import { Observable, of } from 'rxjs';
import { LinksToResultsGlobalComponent } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.component';
import { CanComponentDeactivate } from '../../../../../../shared/guards/unsaved-changes.types';

/**
 * `UCA-T-10` — P22-only section. This routed component is a thin host: `linksToResultsBody`, its
 * load/save calls and the `SectionDirtyTrackerService` instance all live in the child
 * `app-links-to-results-global` (`LinksToResultsGlobalComponent`), which is shared with
 * `ipsr-link-to-results`. Angular's `canDeactivate` invokes methods on the ROUTED component
 * instance, so `CanComponentDeactivate` is implemented here and simply delegates to the child via
 * `@ViewChild` — see `links-to-results-global.component.ts` for the actual dirty-tracking / save
 * logic and its load-flow / race-condition findings.
 *
 * Confirmed by reading `links-to-results-global.component.html`: it renders `app-save-button`
 * (line 216), NOT `SectionBottomBarComponent` — so unlike `rd-theory-of-change`, this section has
 * no Back/Next silent-save case to test (`section-bottom-bar.goTo()`'s `markSilent()` /
 * `UnsavedNavigationIntentService` path never applies here). It still needs
 * `CanComponentDeactivate` for the Save/Discard dialog path on whatever navigation DOES apply —
 * sidebar clicks, browser back — per this task's own note and `UCA-T-6`'s prior investigation.
 */
@Component({
    selector: 'app-rd-links-to-results',
    templateUrl: './rd-links-to-results.component.html',
    styleUrls: ['./rd-links-to-results.component.scss'],
    standalone: false
})
export class RdLinksToResultsComponent implements CanComponentDeactivate {
  @ViewChild(LinksToResultsGlobalComponent) private readonly linksToResultsGlobal?: LinksToResultsGlobalComponent;

  constructor() {}

  /** `UCA-T-10` — `CanComponentDeactivate.hasUnsavedChanges()`, delegated to the child section-body owner. */
  hasUnsavedChanges(): boolean {
    return this.linksToResultsGlobal?.hasUnsavedChanges() ?? false;
  }

  /** `UCA-T-10` — `CanComponentDeactivate.saveSection()`, delegated to the child section-body owner. */
  saveSection(): Observable<boolean> {
    return this.linksToResultsGlobal ? this.linksToResultsGlobal.saveSection() : of(true);
  }
}
