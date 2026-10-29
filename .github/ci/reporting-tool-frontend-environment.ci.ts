// CI-only frontend environment for lint and unit tests of reporting-tool-staging-ci.yml.
// NOT a real configuration: no endpoint, no identifier, no credential. Copied during the job to the
// git-ignored src/environments/environment.ts and environment.prod.ts, then removed.
// Keep the property names in sync with the code (git grep "environment\." in onecgiar-pr-client/src).
export const environment = {
  production: false,
  apiBaseUrl: 'https://api.ci.invalid/',
  frontBaseUrl: 'https://app.ci.invalid/',
  webSocketUrl: 'wss://ws.ci.invalid/',
  fileManagerUrl: 'https://files.ci.invalid/',
  bulkUploaderUrl: 'https://bulk.ci.invalid/',
  releasesNotesApiUrl: 'https://releases.ci.invalid/',
  reviewApiUrl: 'https://review.ci.invalid/',
  textMiningUrl: 'https://text-mining.ci.invalid/',
  qaUrl: 'https://qa.ci.invalid/',
  googleAnalyticsId: '',
  clarityProjectId: '',
  tawkId: '',
  hotjarSiteId: 0,
  hotjarVersion: 0,
  testEnvironmentBanner: null,
  footerUrls: { license: '', termsAndCondition: '' },
  pusher: { key: '', cluster: '' },
  elastic: { baseUrl: 'https://search.ci.invalid/' },
  aiAssistant: { enabled: false, modelBaseUrl: '' },
};
