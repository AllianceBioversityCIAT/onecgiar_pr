import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Type } from '@angular/core';
import { MessageService } from 'primeng/api';
import { RolesService } from '../../src/app/shared/services/global/roles.service';
import { CustomFieldsModule } from '../../src/app/custom-fields/custom-fields.module';

/** Shared imports + providers every custom-fields CT spec needs. */
export const CF_TEST_IMPORTS = [CustomFieldsModule, HttpClientTestingModule, NoopAnimationsModule] as const;

export const CF_TEST_PROVIDERS = [provideRouter([]), MessageService] as const;

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
