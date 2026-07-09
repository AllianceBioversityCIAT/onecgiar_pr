// ***********************************************************
// Support file loaded before every Cypress *component* test.
//
// It wires up the Angular `mount` command. The global stylesheets the app ships
// (angular.json > styles[]) are loaded through the CT devServer `styles` option in
// cypress.config.js (the Angular webpack pipeline handles global SCSS there), so the
// custom-fields render like production (e.g. the `:focus-within .options` dropdown).
// ***********************************************************

import { mount } from 'cypress/angular';

Cypress.Commands.add('mount', mount);

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

export {};
