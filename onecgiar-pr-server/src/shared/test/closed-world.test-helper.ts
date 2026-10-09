/**
 * @akili-spec bilateral/resubmit-rejected-result — RSB-T-4 (T-3 review advisory B), strengthened in
 * RSB-T-5 (T-4 review advisory B).
 *
 * A "closed world" fake for specs that must prove NOTHING was written: a collaborator that only
 * answers the reads it was given, and records (and throws on) every other method. A named list of
 * writer spies only proves the writers somebody remembered to list; here a writer nobody listed —
 * today's or one T-5 adds tomorrow — fails the spec by construction.
 *
 * - `reads`: the methods the code under test may legitimately call (find*, findOne*, count,
 *   SELECT-only `query`, ...). They are returned untouched, so they can be `jest.fn()` mocks.
 * - Any other property is a RECORDING PROXY at any depth: `fake('dataSource').manager.update(...)`
 *   pushes `dataSource.manager.update` onto `violations` and throws, exactly like a flat
 *   `fake('dataSource').update(...)` does. (Before T-5 only the first level was recorded, so a nested
 *   call died with a TypeError that a `try { ... } catch` could swallow without leaving a trace.)
 *   Merely READING a property path is not a violation; only calling it is.
 * - The push matters: a refusal path that swallows the throw (a `try { ... } catch` that only logs)
 *   still leaves the violation behind for the spec to assert on.
 */
export interface ClosedWorld {
  /** Every call that was not a declared read, as `<fake name>.<path>`. */
  readonly violations: string[];
  /** Builds a fake that answers `reads` and refuses everything else, at any depth. */
  fake<T extends Record<string, any>>(
    name: string,
    reads?: T,
  ): T & Record<string, any>;
}

// Properties the runtime itself probes on any object (promise resolution, jest matchers, printing).
const PASSIVE_PROPS = new Set([
  'then',
  'toJSON',
  'asymmetricMatch',
  'nodeType',
  'hasAttribute',
  'tagName',
  '$$typeof',
  'constructor',
  'inspect',
  'name',
]);

/** An undeclared member: reading it yields another recorder, CALLING it is the violation. */
function recorder(violations: string[], path: string): any {
  return new Proxy(function closedWorldRecorder() {}, {
    get(_target, prop) {
      if (typeof prop === 'symbol' || PASSIVE_PROPS.has(prop)) return undefined;
      return recorder(violations, `${path}.${prop}`);
    },
    apply() {
      violations.push(path);
      throw new Error(`closed world: ${path}() is not a declared read`);
    },
  });
}

export function createClosedWorld(): ClosedWorld {
  const violations: string[] = [];
  return {
    violations,
    fake(name, reads = {} as any) {
      return new Proxy(reads, {
        get(target, prop) {
          if (typeof prop === 'symbol' || PASSIVE_PROPS.has(prop)) {
            return (target as any)[prop];
          }
          if (prop in target) return (target as any)[prop];
          return recorder(violations, `${name}.${prop}`);
        },
      }) as any;
    },
  };
}
