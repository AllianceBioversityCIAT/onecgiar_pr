import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Type } from '@angular/core';
import { RolesService } from '../../src/app/shared/services/global/roles.service';
import { CustomFieldsModule } from '../../src/app/custom-fields/custom-fields.module';

/** Shared imports + providers every custom-fields CT spec needs. */
export const CF_TEST_IMPORTS = [CustomFieldsModule, HttpClientTestingModule, NoopAnimationsModule] as const;

export const CF_TEST_PROVIDERS = [provideRouter([])] as const;

/**
 * Shared mount helper for custom-fields component tests.
 *
 * Imports the whole `CustomFieldsModule` (so every child component/pipe resolves) plus the
 * testing HttpClient/Router/animations the injected services need. Optionally flips the global
 * `RolesService.readOnly` flag to `false` after mount — several fields hide their interactive
 * control while read-only, so interaction tests must opt into `editable: true`.
 */
export interface MountCFOptions {
  componentProperties?: Record<string, unknown>;
  /** Flip RolesService.readOnly to false so the editable control renders. */
  editable?: boolean;
}

export function mountCF(template: string, opts: MountCFOptions = {}) {
  return cy
    .mount(template, {
      imports: [...CF_TEST_IMPORTS],
      providers: [...CF_TEST_PROVIDERS],
      componentProperties: opts.componentProperties ?? {}
    })
    .then(wrapper => {
      if (opts.editable) {
        const roles = wrapper.fixture.debugElement.injector.get(RolesService);
        roles.readOnly = false;
        wrapper.fixture.detectChanges();
      }
      return cy.wrap(wrapper);
    });
}

/**
 * Mount a custom-fields component class directly — use for components that are declared in
 * `CustomFieldsModule` but NOT exported (e.g. `PrWordCounterComponent`, `UnderConstructionPointComponent`).
 * Template-tag mounts of those selectors fail silently in CT because the host cannot see them.
 */
export function mountComponent<T>(component: Type<T>, opts: MountCFOptions = {}) {
  return cy
    .mount(component, {
      imports: [...CF_TEST_IMPORTS],
      providers: [...CF_TEST_PROVIDERS],
      componentProperties: opts.componentProperties ?? {}
    })
    .then(wrapper => {
      if (opts.editable) {
        const roles = wrapper.fixture.debugElement.injector.get(RolesService);
        roles.readOnly = false;
        wrapper.fixture.detectChanges();
      }
      return cy.wrap(wrapper);
    });
}

/* ------------------------------------------------------------------ *
 * Contract-testing helpers
 *
 * These exist so specs can assert how a field is EXPECTED to behave —
 * derived from the `master` (PrimeNG) reference and from how the ~34-53
 * real consumer templates actually use each field — rather than from
 * whatever the current implementation happens to do.
 * ------------------------------------------------------------------ */

/**
 * Drive the host component from inside a test.
 *
 * Real parents mutate the bound model IN PLACE (`splice`/`push` on the array they
 * passed as `[(ngModel)]`), and they replace `[options]` once an async catalog call
 * resolves. Both paths are regression-prone after the `@Input()` -> `input()` signal
 * migration, so specs need a way to reproduce them exactly.
 *
 * `fn` receives the host instance; change detection runs after it returns.
 */
export function patchHost(fn: (host: any) => void) {
  return cy.get('@ctWrapper').then((wrapper: any) => {
    const fixture = wrapper.fixture;
    // Let Angular own the change-detection cycle. Mutating the host and immediately forcing a
    // synchronous detectChanges() puts the two-way [(ngModel)] write-back inside the very cycle
    // that is already checking it, which throws NG0100 from the TEST HOST — an artefact of the
    // harness, not a defect of the field under test. autoDetectChanges lets the write-back land
    // on its own tick, so any NG0100 that still surfaces belongs to the component.
    fixture.autoDetectChanges(true);
    fn(fixture.componentInstance);
    return cy.wrap(wrapper, { log: false });
  });
}

/** Mount and alias the wrapper as `@ctWrapper` so `patchHost` can reach the host later. */
export function mountCFHost(template: string, opts: MountCFOptions = {}) {
  return mountCF(template, opts).as('ctWrapper');
}

/** Read the host's bound model without leaving the Cypress chain. */
export function readHost(fn: (host: any) => unknown) {
  return cy.get('@ctWrapper').then((wrapper: any) => cy.wrap(fn(wrapper.fixture.componentInstance) as any, { log: false }));
}

/**
 * Shared contracts every custom field must satisfy, regardless of which control it renders.
 *
 * Call inside a `describe`. These encode behaviour the whole app depends on:
 *  - `RolesService.readOnly` defaults to TRUE, so the read-only path is the DEFAULT render
 *    in the running app — a field that leaks an editable control there is a real defect.
 *  - `DataControlService.someMandatoryFieldIncompleteResultDetail()` SCANS the DOM for
 *    `.pr-field.mandatory` / `.pr-input.mandatory` without `.complete` to build the submission
 *    validation list. A field that renders fine but drops those classes breaks submit validation
 *    SILENTLY — which is why this is asserted on the markup, not on a component property.
 */
export interface FieldCase {
  template: string;
  componentProperties: Record<string, unknown>;
}

export function sharedFieldContracts(opts: {
  /** Field required, holding NO value. */
  emptyRequired: FieldCase;
  /** Field required, holding a value. */
  filledRequired: FieldCase;
  /** Field with [required]="false". Omit if the field is always required. */
  optional?: FieldCase;
  /** Selector of the interactive control that must disappear while read-only. */
  controlSelector: string;
  /**
   * Root element carrying the mandatory/complete contract. Defaults to `.pr-field`.
   *
   * Pass `null` for a field that does NOT participate in that DOM contract at all. Only
   * `pr-select` (and `appFeedbackValidation`) render a `.pr-field` root with `mandatory` /
   * `complete` on it — `pr-multi-select`, `pr-yes-or-not`, `pr-checkbox` and `pr-range-level`
   * render an `app-pr-field-header` instead, so they show a red asterisk while contributing
   * nothing to `someMandatoryFieldIncompleteResultDetail`'s DOM scan. This is documented
   * behaviour (see src/CLAUDE.md §21.5), not a defect. Asserting the mandatory contract on those
   * fields fabricates a requirement they never had, which is why the three tests are skipped
   * rather than failed — and why the requiredness marker they DO own is asserted in their own
   * spec instead.
   */
  rootSelector?: string | null;
}) {
  const participatesInDomScan = opts.rootSelector !== null;
  const root = opts.rootSelector ?? '.pr-field';

  it('[contract] hides the interactive control when read-only (the app default)', () => {
    mountCF(opts.filledRequired.template, { componentProperties: opts.filledRequired.componentProperties });
    cy.get(opts.controlSelector).should('not.exist');
  });

  it('[contract] exposes the interactive control when editable', () => {
    mountCF(opts.emptyRequired.template, {
      componentProperties: opts.emptyRequired.componentProperties,
      editable: true
    });
    cy.get(opts.controlSelector).should('exist');
  });

  (participatesInDomScan ? it : it.skip)('[contract] marks a required field as mandatory-but-incomplete while empty', () => {
    mountCF(opts.emptyRequired.template, {
      componentProperties: opts.emptyRequired.componentProperties,
      editable: true
    });
    cy.get(`${root}.mandatory`).should('exist').and('not.have.class', 'complete');
  });

  (participatesInDomScan ? it : it.skip)('[contract] marks a required field complete once it holds a value', () => {
    mountCF(opts.filledRequired.template, {
      componentProperties: opts.filledRequired.componentProperties,
      editable: true
    });
    cy.get(`${root}.mandatory`).should('have.class', 'complete');
  });

  if (opts.optional) {
    const optional = opts.optional;
    (participatesInDomScan ? it : it.skip)('[contract] does not mark an optional field as mandatory', () => {
      mountCF(optional.template, { componentProperties: optional.componentProperties, editable: true });
      cy.get(`${root}.mandatory`).should('not.exist');
    });
  }
}
