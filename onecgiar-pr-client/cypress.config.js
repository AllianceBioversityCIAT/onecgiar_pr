const { defineConfig } = require('cypress')

// Try to import Cypress environment configuration
let cypressEnvironment
try {
  cypressEnvironment = require('./cypress.env')
} catch (error) {
  console.warn('⚠️  cypress.env.js not found. Using empty credentials.')
  cypressEnvironment = {
    environment: {
      cypress: {
        testEmail: '',
        testPassword: ''
      }
    }
  }
}

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
    // Test credentials for Guest role
    guestEmail: cypressEnvironment.environment.cypress.testEmail,
    guestPassword: cypressEnvironment.environment.cypress.testPassword,

    // Check if credentials are available
    hasCredentials: cypressEnvironment.environment.cypress.testEmail &&
      cypressEnvironment.environment.cypress.testPassword,

    // Legacy support (to be removed later)
    testEmail: cypressEnvironment.environment.cypress.testEmail,
    testPassword: cypressEnvironment.environment.cypress.testPassword
  }
});
