// ***********************************************************
// Support file loaded before every Cypress *component* test.
//
// It wires up the Angular `mount` command. The global stylesheets the app ships
// (angular.json > styles[]) are loaded through the CT devServer `styles` option in
// cypress.config.js (the Angular webpack pipeline handles global SCSS there), so the
// custom-fields render like production (e.g. the `:focus-within .options` dropdown).
// ***********************************************************

import { mount } from 'cypress/angular';
// TIP-T-4 (`docs/specs/changes/tooltip-keyboard-accessibility/`): real CDP-level Tab/key
// dispatch (`Input.dispatchKeyEvent`), NOT a synthetic JS KeyboardEvent — needed to assert the
// browser's actual tab order into a pinned tooltip's focus-trapped content. Cypress core has no
// built-in `{tab}` support and a synthetic `.trigger('keydown')` does not move focus at all.
import 'cypress-real-events/support';

Cypress.Commands.add('mount', mount);

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

export {};
