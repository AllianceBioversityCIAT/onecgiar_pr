const { defineConfig } = require('cypress');

// Try to import Cypress environment configuration.
// The keys read here MUST match cypress.env.js.example (guestEmail / guestPassword / userToken).
let cypressEnvironment;
try {
  cypressEnvironment = require('./cypress.env');
} catch (error) {
  console.warn('⚠️  cypress.env.js not found. Using empty credentials.');
  cypressEnvironment = {
    environment: {
      cypress: {
        guestEmail: '',
        guestPassword: '',
        userToken: ''
      }
    }
  };
}

const cypressEnv = (cypressEnvironment && cypressEnvironment.environment && cypressEnvironment.environment.cypress) || {};

/**
 * Memory budget for the browser renderer, in MB.
 * PRMS mounts a heavy PrimeNG DOM; without a cap the V8 heap of the renderer grows until the
 * OS starts swapping and the whole machine stalls. Override with CYPRESS_RENDERER_HEAP_MB.
 */
const RENDERER_HEAP_MB = Number(process.env.CYPRESS_RENDERER_HEAP_MB || 2048);

/**
 * Chromium flags that actually move the needle on RAM. Deliberately NOT included:
 *   --memory-pressure-off  → disables GC under pressure, i.e. the exact opposite of what we want
 *   --disable-gpu          → on macOS software compositing costs more RAM than the GPU path
 */
const chromiumMemoryFlags = [
  `--js-flags=--max-old-space-size=${RENDERER_HEAP_MB}`,
  '--renderer-process-limit=1',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  '--disable-background-networking',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--no-default-browser-check',
  '--no-first-run'
];

module.exports = defineConfig({
  projectId: 'snnzit',

  /**
   * Cypress' own mitigation for renderer growth: it forces a GC between tests and restarts the
   * renderer when it detects pressure. This is THE flag for "Cypress eats all my RAM".
   */
  experimentalMemoryManagement: true,

  /**
   * How many tests keep their per-command DOM snapshots alive. The default (50) is what makes
   * `cypress open` climb into the gigabytes on a DOM this size — it is only useful for time
   * travel in the runner UI, and 5 tests back is plenty. `setupNodeEvents` drops it to 0 in
   * `cypress run`, where nobody ever looks at those snapshots.
   */
  numTestsKeptInMemory: 5,

  /**
   * Video recording off by default: it pins an extra encoder process plus frame buffers for the
   * whole run, and `cypress/videos/` was empty — nobody was consuming the output. Turn it on
   * for a specific run with `CYPRESS_VIDEO=true`.
   */
  video: false,
  videoCompression: false,

  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',

    /**
     * Third parties the shell boots on EVERY page load — and an e2e run boots the app once per
     * test (61 of them). Two of these are session recorders: Hotjar and Clarity buffer DOM
     * mutations in memory for the life of the page, which is pure waste inside a test. Pusher and
     * the socket server hold open connections whose failures cypress/support/e2e.ts already has to
     * swallow as noise. None of them is ever asserted on.
     *
     * Google Fonts and cdnjs are deliberately NOT blocked: icon glyph widths affect layout, and
     * specs click on icons.
     */
    blockHosts: ['*.hotjar.com', '*.hotjar.io', '*.clarity.ms', '*.pusher.com', '*.pusherapp.com', 'sockets.prms.cgiar.org', 'cdn.lordicon.com'],
    setupNodeEvents
  },
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
      /**
       * The CT dev-server binds 8080 by default, so two agents running component tests on the
       * same checkout crash each other with EADDRINUSE — the config file itself throws and no
       * test runs. Override per session with CT_DEV_SERVER_PORT.
       */
      port: Number(process.env.CT_DEV_SERVER_PORT || 8080),
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
            // Deliberately NOT tsconfig.app.json — see tsconfig.ct.json for why (it would pull the
            // whole AppModule into the CT program: 2601 files instead of 965).
            tsConfig: 'tsconfig.ct.json',
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
            scripts: [],
            // ---- memory ----
            // Source maps for the whole app graph are the single biggest allocation in the
            // webpack dev-server process, and a component test never steps through them.
            sourceMap: false,
            // No point paying for named/vendor chunk bookkeeping in a throwaway CT bundle.
            namedChunks: false,
            // vendorChunk stays at its default (true): one shared chunk for node_modules is cheaper
            // than duplicating them into every spec entry.
            buildOptimizer: false,
            optimization: false,
            extractLicenses: false,
            progress: false
          }
        }
      }
    },
    // Scoped to src/ so component specs (colocated next to each component) never
    // collide with the e2e specs living under cypress/e2e/**.
    specPattern: 'src/**/*.cy.ts',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
    setupNodeEvents
  },
  viewportWidth: 1280,
  viewportHeight: 720,
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

/**
 * Shared by both testing types. Runs in Cypress' Node process, so it is the only place where
 * the real run mode (`config.isTextTerminal`) is known.
 */
function setupNodeEvents(on, config) {
  const isHeadlessRun = config.isTextTerminal;

  if (isHeadlessRun) {
    // Nothing reads command snapshots in a headless run — keeping zero of them removes the
    // per-command DOM copies, which is where the renderer memory actually goes.
    config.numTestsKeptInMemory = 0;
    // The file watcher keeps every spec + its module graph resident for the whole run.
    config.watchForFileChanges = false;
    config.video = process.env.CYPRESS_VIDEO === 'true';
  }

  on('before:browser:launch', (browser = {}, launchOptions) => {
    if (browser.family === 'chromium' && browser.name !== 'electron') {
      launchOptions.args.push(...chromiumMemoryFlags);
    }
    return launchOptions;
  });

  return config;
}
