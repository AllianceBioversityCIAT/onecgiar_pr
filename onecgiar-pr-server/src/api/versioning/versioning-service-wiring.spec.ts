import * as fs from 'fs';
import * as path from 'path';

/**
 * `VersioningService` is provided independently by four modules, not shared through one. So a
 * new constructor dependency has to be wired into every one of them: missing it in a single
 * module takes the whole application down at boot with
 * `UnknownDependenciesException … is available in the <X>Module context`.
 *
 * No existing spec catches that. `app.module.spec.ts` only reads `Reflect` metadata and the
 * service specs build the class by hand, so none of them resolve the real DI graph — which is
 * how a green suite shipped a backend that could not start (2026-08-26, prtest).
 *
 * This walks the source instead of the container: cheap, and it fails the moment someone adds a
 * fifth provider of `VersioningService` without its rules module.
 */
describe('VersioningService wiring', () => {
  const SRC = path.join(__dirname, '..', '..');
  const RULES_MODULE = 'BilateralVersioningRulesModule';

  const moduleFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return moduleFiles(full);
      return entry.isFile() && entry.name.endsWith('.module.ts') ? [full] : [];
    });

  /**
   * Bracket-depth aware: `providers` and `imports` hold nested calls and arrays
   * (`forwardRef(() => X)`, `TypeOrmModule.forFeature([...])`), so slicing to the first `],`
   * cuts the block short and the check silently passes on whatever it did not read.
   */
  const arrayBlock = (source: string, key: string): string => {
    const start = source.indexOf(`${key}: [`);
    if (start === -1) return '';
    let depth = 0;
    for (let i = source.indexOf('[', start); i < source.length; i++) {
      const c = source[i];
      if (c === '[' || c === '(' || c === '{') depth++;
      else if (c === ']' || c === ')' || c === '}') {
        depth--;
        if (depth === 0) return source.slice(start, i);
      }
    }
    return source.slice(start);
  };

  it('every module that provides VersioningService also imports its rules module', () => {
    const offenders = moduleFiles(SRC).filter((file) => {
      const source = fs.readFileSync(file, 'utf8');
      if (!/\bVersioningService\b/.test(arrayBlock(source, 'providers'))) {
        return false;
      }
      // The imports ARRAY, not the file: leaving the `import { … }` statement behind while
      // dropping the array entry is exactly the shape of the failure this guards against.
      return !arrayBlock(source, 'imports').includes(RULES_MODULE);
    });

    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('finds the providers it is meant to be guarding', () => {
    // Guards the guard: if the providers regex stops matching, the test above passes vacuously.
    const providers = moduleFiles(SRC).filter((file) =>
      /\bVersioningService\b/.test(
        arrayBlock(fs.readFileSync(file, 'utf8'), 'providers'),
      ),
    );

    expect(providers.length).toBeGreaterThanOrEqual(3);
  });
});
