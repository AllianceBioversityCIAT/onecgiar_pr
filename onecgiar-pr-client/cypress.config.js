const { defineConfig } = require('cypress')

// Try to import Cypress environment configuration.
// The keys read here MUST match cypress.env.js.example (guestEmail / guestPassword / userToken).
let cypressEnvironment
try {
  cypressEnvironment = require('./cypress.env')
} catch (error) {
  console.warn('⚠️  cypress.env.js not found. Using empty credentials.')
  cypressEnvironment = {
    environment: {
      cypress: {
        guestEmail: '',
        guestPassword: '',
        userToken: ''
      }
    }
  }
}

const cypressEnv = (cypressEnvironment && cypressEnvironment.environment && cypressEnvironment.environment.cypress) || {}

module.exports = defineConfig({
  projectId: 'snnzit',
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
      // This app builds with the esbuild `@angular/build:application` builder, but
      // Cypress' Angular preset drives the legacy webpack `browser` builder. Reading
      // the real build target as-is crashes (e.g. `outputPath` is an object, `browser`
      // replaces `main`). So we hand Cypress a curated, webpack-compatible projectConfig.
      // Global styles are loaded from cypress/support/component.ts instead of styles[]
      // to keep the CT bundle lean.
      options: {
        projectConfig: {
          root: '',
          sourceRoot: 'src',
          buildOptions: {
            main: 'src/main.ts',
            polyfills: ['src/polyfills.ts'],
            tsConfig: 'tsconfig.app.json',
            inlineStyleLanguage: 'scss',
            outputPath: 'dist/cypress-ct',
            assets: [],
            // Global stylesheets the custom-fields rely on (mirrors angular.json > styles[]).
            // Loaded through the Angular webpack pipeline so global SCSS compiles correctly.
            styles: [
              'node_modules/primeicons/primeicons.css',
              'src/styles.scss',
              'src/styles/fonts.scss',
              'src/styles/colors.scss',
              'src/styles/transitions.scss',
              'src/app/custom-fields/custom-fields.scss'
            ],
            scripts: []
          }
        }
      }
    },
    // Scoped to src/ so component specs (colocated next to each component) never
    // collide with the e2e specs living under cypress/e2e/**.
    specPattern: 'src/**/*.cy.ts',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html'
  },
  viewportWidth: 1280,
  viewportHeight: 720,
  video: true,
  screenshotOnRunFailure: true,
  defaultCommandTimeout: 10000,
  requestTimeout: 10000,
  responseTimeout: 10000,
  pageLoadTimeout: 30000,
  env: {
    // Test credentials for Guest role (UI login — slow path)
    guestEmail: cypressEnv.guestEmail || '',
    guestPassword: cypressEnv.guestPassword || '',

    // Raw JWT for the fast session login (cy.loginByToken) — same value the app
    // stores under localStorage['token']. NEVER commit this; cypress.env.js is gitignored.
    userToken: cypressEnv.userToken || '',

    // Availability flags used by the specs to skip gracefully on machines without secrets
    hasCredentials: !!(cypressEnv.guestEmail && cypressEnv.guestPassword),
    hasToken: !!cypressEnv.userToken
  }
});
