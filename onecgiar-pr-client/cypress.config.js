const { defineConfig } = require('cypress')
const { registerArgosTask } = require('@argos-ci/cypress/task')

module.exports = defineConfig({
  projectId: 'snnzit',
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    async setupNodeEvents(on, config) {
      registerArgosTask(on, config, {
        // Enable upload to Argos only when it runs on CI.
        uploadToArgos: !!process.env.CI,
        // Set your Argos token
        token: 'argos_433e2da941cb4c279d0887acadeedfb25c',
      })

      // implement node event listeners here
    },
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: '**/*.cy.ts'
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
    // Test credentials - these should be overridden by environment variables
    testEmail: process.env.CYPRESS_TEST_EMAIL || 'yecksin.multimedia@gmail.com',
    testPassword: process.env.CYPRESS_TEST_PASSWORD || 'Cypress@2'
  }
});
