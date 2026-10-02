/**
 * `PNS-T-2` rework attempt 2 — Reviewer FAIL remediation proof.
 *
 * Reproduces the real app load order (`api/modules.routes.ts` loads `ResultsModule` before
 * `BilateralModule` is ever reached) by `require`-ing `app.module` first, exactly like
 * `main.ts`/Nest's bootstrap does, THEN inspecting the constructor-parameter metadata Nest's own
 * DI container reads to resolve what to inject.
 *
 * This never calls `NestFactory.create` / boots a real application and never opens a DB
 * connection — `TypeOrmModule.forRoot` only builds a dynamic module descriptor from
 * `src/config/orm.config.ts`'s `DataSource` object; the `DataSource` itself is constructed (safe,
 * no I/O) but never `.initialize()`d here.
 *
 * **Why this mirrors Nest's injector exactly (not just raw `design:paramtypes`):** a naive read of
 * `Reflect.getMetadata('design:paramtypes', Klass)` also flags two *already-accepted, harmless*
 * patterns already in this constructor list — `@Optional()`-only params
 * (`bilateral.service.ts`'s `_notificationService`/`_resultTaggedNotificationService`, BCT-T-5) and
 * `@Inject(forwardRef(...))`-guarded params (this file's own `notificationService`, "Defect A").
 * Nest's real injector (`node_modules/@nestjs/core/injector/injector.js`,
 * `reflectConstructorParams` + `resolveConstructorParams`) never crashes on those: a
 * `self:paramtypes` entry (from `@Inject`) OVERWRITES the `design:paramtypes` slot before Nest ever
 * looks at it, and an `optional:paramtypes` entry (from `@Optional()`) catches the
 * `UndefinedDependencyException` and resolves to `undefined` instead of throwing. Only a slot that
 * is STILL undefined after that override AND is not marked optional is a genuine boot-time crash —
 * replicating that exact two-step (not a flat "no undefined anywhere") is what makes this probe
 * trustworthy instead of noisy.
 */
import 'reflect-metadata';

const PARAMTYPES_METADATA = 'design:paramtypes';
const SELF_DECLARED_DEPS_METADATA = 'self:paramtypes';
const OPTIONAL_DEPS_METADATA = 'optional:paramtypes';

/** Mirrors `Injector.reflectConstructorParams` (`@nestjs/core/injector/injector.js`). */
function reflectConstructorParams(type: unknown): unknown[] {
  const paramtypes: unknown[] = [
    ...((Reflect.getMetadata(PARAMTYPES_METADATA, type) as unknown[]) ?? []),
  ];
  const selfParams: Array<{ index: number; param: unknown }> =
    (Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, type) as Array<{
      index: number;
      param: unknown;
    }>) ?? [];
  selfParams.forEach(({ index, param }) => (paramtypes[index] = param));
  return paramtypes;
}

/** Mirrors `Injector.reflectOptionalParams`. */
function reflectOptionalParams(type: unknown): number[] {
  return (Reflect.getMetadata(OPTIONAL_DEPS_METADATA, type) as number[]) ?? [];
}

/**
 * The constructor-parameter indices that would make Nest's injector throw an unrecovered
 * `UndefinedDependencyException` at boot: still-undefined after the `@Inject` self-param override,
 * and not covered by `@Optional()`.
 */
function undefinedRequiredParamIndices(type: unknown): number[] {
  const paramtypes = reflectConstructorParams(type);
  const optional = reflectOptionalParams(type);
  return paramtypes
    .map((param, index) =>
      param === undefined && !optional.includes(index) ? index : -1,
    )
    .filter((index) => index >= 0);
}

describe('PrimaryProgramRequestService / BilateralService load-order (PNS-T-2 rework)', () => {
  it('has no boot-crashing undefined constructor dependency after loading app.module first', () => {
    // Load the real app module graph first, the same order `main.ts` triggers via
    // `NestFactory.create(AppModule)`: `app.module.ts` → `api/modules.routes.ts` →
    // `ResultsModule` (first entry) → ... → `BilateralModule` is reached later, for the first
    // time, while `primary-program-request.service.ts` is still mid-evaluation IF it holds a
    // static top-level import of `bilateral.service.ts`.

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../../../app.module');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      PrimaryProgramRequestService,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('./primary-program-request.service');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      BilateralService,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('../../../bilateral/bilateral.service');

    const bilateralUndefinedAt =
      undefinedRequiredParamIndices(BilateralService);
    const primaryUndefinedAt = undefinedRequiredParamIndices(
      PrimaryProgramRequestService,
    );

    expect({ bilateralUndefinedAt, primaryUndefinedAt }).toEqual({
      bilateralUndefinedAt: [],
      primaryUndefinedAt: [],
    });
  });
});
