import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Angular 21 flipped TestBed's errorOnUnknownElements/errorOnUnknownProperties
// defaults to `true`. Restore the pre-21 lenient behaviour so existing TestBeds
// (which rely on shallow rendering of unknown child elements) keep passing.
setupZoneTestEnv({
  errorOnUnknownElements: false,
  errorOnUnknownProperties: false
});
