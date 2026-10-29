// @akili-spec quality-assurance/qa-field-catalog
// Regenerates __snapshots__/qa-catalog.snapshot.json from the code catalog. Run after an
// intentional, VALID catalog change. It never bumps revisions: bump them in definitions/versions.ts.
// It compares against the committed snapshot first and refuses to write (exit 1, file
// untouched) on any integrity violation, so it cannot launder a removed key or an un-bumped change.
import { join } from 'path';
import { CATALOG_RESULT_TYPES } from '../definitions/result-types';
import { CATALOG_FIELDS, CATALOG_SECTIONS } from '../definitions/sections';
import { CATALOG_VERSIONS } from '../definitions/versions';
import {
  buildSnapshot,
  guardedSnapshotWrite,
} from '../definitions/snapshot-check';

const target = join(
  __dirname,
  '..',
  '__snapshots__',
  'qa-catalog.snapshot.json',
);
const snapshot = buildSnapshot(
  {
    resultTypes: CATALOG_RESULT_TYPES,
    sections: CATALOG_SECTIONS,
    fields: CATALOG_FIELDS,
  },
  CATALOG_VERSIONS,
);
const { written, violations } = guardedSnapshotWrite(target, snapshot);
if (!written) {
  console.error(
    'qa-catalog snapshot NOT written; integrity violations (QAC-R-2 / QAC-R-8):',
  );
  violations.forEach((violation) => console.error(`  - ${violation}`));
  process.exit(1);
}
console.log(`qa-catalog snapshot written (${snapshot.keys.length} keys)`);
