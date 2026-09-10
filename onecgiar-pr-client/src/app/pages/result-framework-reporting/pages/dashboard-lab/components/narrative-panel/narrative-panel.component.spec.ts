import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ASSISTANT_ENGINE, AssistantEngineError } from '../../../../../../shared/components/ai-assistant/engine/assistant-engine.types';
import { DeviceCapabilityService } from '../../../../../../shared/components/ai-assistant/device-capability.service';
import { MODEL_TIERS } from '../../../../../../shared/components/ai-assistant/engine/model-tiers';
import {
  COPY_FEEDBACK_MS,
  NarrativeAowFact,
  NarrativeHloFact,
  NarrativePanelComponent,
  NarrativeStatsFact,
  parseNarrativeCompletion
} from './narrative-panel.component';
import { NARRATIVE_COPY } from './narrative-copy';

/**
 * `MRF-TEST-7` (`docs/specs/changes/mass-reporting-flow/tasks.md`) — the narrative panel's
 * behaviour against a mocked `ASSISTANT_ENGINE` + `DeviceCapabilityService`.
 *
 * Deliberately absent (task disqualifier): any assertion about the WORDS of a draft. Narrative
 * quality is untestable here (requirements §8, accepted risk) — every assertion below is about the
 * state machine, the consent gate, the parse contract, or the DOM/a11y surface.
 *
 * @akili-spec changes/mass-reporting-flow
 */

const AOW: NarrativeAowFact = { code: 'AoW1', name: 'Breeding for Tomorrow' };
const OTHER_AOW: NarrativeAowFact = { code: 'AoW2', name: 'Seed Systems' };
const STATS: NarrativeStatsFact = { total: 8, done: 3, pct: 38, zeroTarget: 2 };
const HLOS: NarrativeHloFact[] = [
  { section: 'High Level Outputs', title: 'HLO 1 — Improved varieties', total: 5, pending: 3 },
  { section: 'Outcomes', title: 'Outcome 2 — Adoption at scale', total: 3, pending: 1 }
];

/** A completion the engine could plausibly return — content is irrelevant, the SHAPE is the test. */
const DRAFT = 'Reporting is under way for this Area of Work.';
const VALID_COMPLETION = JSON.stringify({ narrative: DRAFT });

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type EngineMock = {
  init: jest.Mock;
  complete: jest.Mock;
  isModelCached: jest.Mock;
  interrupt: jest.Mock;
  dispose: jest.Mock;
};

function engineMock(overrides: Partial<EngineMock> = {}, calls: string[] = []): EngineMock {
  return {
    init: jest.fn().mockImplementation(() => {
      calls.push('init');
      return Promise.resolve();
    }),
    complete: jest.fn().mockImplementation(() => {
      calls.push('complete');
      return Promise.resolve(VALID_COMPLETION);
    }),
    isModelCached: jest.fn().mockResolvedValue(true),
    interrupt: jest.fn().mockImplementation(() => calls.push('interrupt')),
    dispose: jest.fn(),
    ...overrides
  };
}

/**
 * `ApiService` stand-in that RECORDS every property touched. The panel must not reach any API
 * surface while generating (MRF-AC-8 "nothing is persisted"), so an empty log is the assertion.
 * `constructor` / `ngOnDestroy` are Angular's own probes on a `useValue` provider, not API use.
 */
const DI_PROBES = new Set(['constructor', 'ngOnDestroy']);

function recordingApi(touched: string[]) {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (typeof prop === 'symbol' || DI_PROBES.has(prop)) return Reflect.get(target, prop);
        touched.push(prop);
        return () => undefined;
      }
    }
  );
}

interface MountOptions {
  engine?: Partial<EngineMock>;
  tier?: string;
  promptTemplate?: string;
  hlos?: NarrativeHloFact[];
}

async function mount(options: MountOptions = {}) {
  const calls: string[] = [];
  const apiTouched: string[] = [];
  const engine = engineMock(options.engine ?? {}, calls);
  const detect = jest.fn().mockResolvedValue({ tier: options.tier ?? 'mid', reason: 'ok' });
  const clipboard = { copy: jest.fn().mockReturnValue(true) };

  await TestBed.configureTestingModule({
    imports: [NarrativePanelComponent],
    providers: [
      { provide: ASSISTANT_ENGINE, useValue: engine },
      { provide: DeviceCapabilityService, useValue: { detect } },
      { provide: Clipboard, useValue: clipboard },
      { provide: ApiService, useValue: recordingApi(apiTouched) }
    ]
  }).compileComponents();

  const fixture = TestBed.createComponent(NarrativePanelComponent);
  fixture.componentRef.setInput('aow', AOW);
  fixture.componentRef.setInput('stats', STATS);
  fixture.componentRef.setInput('hlos', options.hlos ?? HLOS);
  fixture.componentRef.setInput('promptTemplate', options.promptTemplate ?? '');
  fixture.detectChanges();
  await settle(fixture);

  return { fixture, component: fixture.componentInstance, engine, detect, clipboard, calls, apiTouched };
}

/** Drain the promise chain the state machine walks, then re-render. */
async function settle(fixture: ComponentFixture<NarrativePanelComponent>): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  await fixture.whenStable();
  fixture.detectChanges();
}

function query(fixture: ComponentFixture<NarrativePanelComponent>, testId: string): HTMLElement | null {
  return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
}

function text(fixture: ComponentFixture<NarrativePanelComponent>, testId: string): string {
  return query(fixture, testId)?.textContent?.trim() ?? '';
}

describe('NarrativePanelComponent (MRF-TEST-7)', () => {
  afterEach(() => TestBed.resetTestingModule());

  describe('parseNarrativeCompletion (MRF-R-9 parse contract)', () => {
    it('returns the narrative string from a schema-shaped completion', () => {
      expect(parseNarrativeCompletion(VALID_COMPLETION)).toBe(DRAFT);
    });

    it.each([
      ['not JSON at all', 'Here is your narrative:'],
      ['JSON without the key', '{"summary":"x"}'],
      ['a non-string narrative', '{"narrative":42}'],
      ['a blank narrative', '{"narrative":"   "}'],
      ['a JSON array', '["narrative"]']
    ])('returns null for %s', (_label, raw) => {
      expect(parseNarrativeCompletion(raw)).toBeNull();
    });
  });

  describe('capability + consent gate (MRF-R-9.2, MRF-R-9.4)', () => {
    it('an unsupported device never downloads and never generates', async () => {
      const { fixture, component, engine } = await mount({ tier: 'unsupported' });

      expect(component.state()).toBe('unsupported');
      expect(query(fixture, 'narrative-unsupported')).not.toBeNull();
      expect(engine.init).not.toHaveBeenCalled();
      expect(engine.complete).not.toHaveBeenCalled();
    });

    it('a cold cache shows the consent step and calls init only after the user accepts', async () => {
      const { fixture, component, engine } = await mount({ engine: { isModelCached: jest.fn().mockResolvedValue(false) } });

      // MRF-R-9.4 — the panel is the opt-in owner: nothing downloads before Accept.
      expect(component.state()).toBe('needs-optin');
      expect(query(fixture, 'narrative-consent')).not.toBeNull();
      expect(engine.init).not.toHaveBeenCalled();
      expect(engine.complete).not.toHaveBeenCalled();

      query(fixture, 'narrative-consent-accept')!.click();
      await settle(fixture);

      expect(engine.init).toHaveBeenCalledTimes(1);
      expect(engine.init).toHaveBeenCalledWith('mid', expect.any(Function));
      expect(component.state()).toBe('ready');
    });

    it('the consent step names the tier download size before anything is fetched', async () => {
      const { fixture } = await mount({ engine: { isModelCached: jest.fn().mockResolvedValue(false) } });

      expect(text(fixture, 'narrative-consent')).toContain(String(MODEL_TIERS.mid.downloadMB));
    });

    it('reports download progress while the model loads, then generates', async () => {
      const initGate = deferred<void>();
      let report: ((p: { progress: number; text: string; fromCache: boolean }) => void) | null = null;
      const { fixture, component } = await mount({
        engine: {
          isModelCached: jest.fn().mockResolvedValue(false),
          init: jest.fn().mockImplementation((_tier, onProgress) => {
            report = onProgress;
            return initGate.promise;
          })
        }
      });

      query(fixture, 'narrative-consent-accept')!.click();
      await settle(fixture);

      expect(component.state()).toBe('downloading');
      report!({ progress: 0.42, text: 'fetching shard 3', fromCache: false });
      fixture.detectChanges();
      expect(component.progressPct()).toBe(42);
      expect(query(fixture, 'narrative-progress')?.getAttribute('aria-valuenow')).toBe('42');

      initGate.resolve();
      await settle(fixture);
      expect(component.state()).toBe('ready');
    });

    // Reviewer finding (attempt 1): the retry path used to shortcut back into `run(cached=true)`,
    // which always calls `init()`. On a device where `isModelCached` REJECTS — blocked Cache/storage
    // API, e.g. private browsing — that shortcut downloaded ~900 MB with no consent step, no size
    // disclosure and no progress bar. Regenerate now re-enters `start()`, so the opt-in step stays
    // the only door to `init()` (MRF-R-9.4).
    it('never downloads on retry when the cache probe itself failed — consent is re-asked', async () => {
      const isModelCached = jest
        .fn()
        .mockRejectedValueOnce(new Error('Cache storage is blocked'))
        .mockResolvedValue(false);
      const { fixture, component, engine } = await mount({ engine: { isModelCached } });

      expect(component.state()).toBe('error');
      expect(engine.init).not.toHaveBeenCalled();

      query(fixture, 'narrative-retry')!.click();
      await settle(fixture);

      expect(component.state()).toBe('needs-optin');
      expect(query(fixture, 'narrative-consent')).not.toBeNull();
      expect(engine.init).not.toHaveBeenCalled();
      expect(engine.complete).not.toHaveBeenCalled();

      query(fixture, 'narrative-consent-accept')!.click();
      await settle(fixture);

      expect(engine.init).toHaveBeenCalledTimes(1);
      expect(component.state()).toBe('ready');
    });

    it('re-asks for consent when a consented download failed part-way and the cache is still cold', async () => {
      const isModelCached = jest.fn().mockResolvedValue(false);
      const init = jest.fn().mockRejectedValueOnce(new Error('Failed to fetch model shard')).mockResolvedValue(undefined);
      const { fixture, component } = await mount({ engine: { isModelCached, init } });

      query(fixture, 'narrative-consent-accept')!.click();
      await settle(fixture);
      expect(component.state()).toBe('error');

      query(fixture, 'narrative-retry')!.click();
      await settle(fixture);

      expect(component.state()).toBe('needs-optin');
      expect(init).toHaveBeenCalledTimes(1);
    });

    it('declining the consent step downloads nothing and closes the panel', async () => {
      const { fixture, engine } = await mount({ engine: { isModelCached: jest.fn().mockResolvedValue(false) } });
      const closed = jest.fn();
      fixture.componentInstance.closed.subscribe(closed);

      query(fixture, 'narrative-consent-decline')!.click();
      await settle(fixture);

      expect(engine.init).not.toHaveBeenCalled();
      expect(closed).toHaveBeenCalledTimes(1);
    });
  });

  describe('ready state (MRF-R-9.1, MRF-AC-8)', () => {
    it('renders the parsed narrative with the mandatory caption, Copy and Regenerate', async () => {
      const { fixture, component } = await mount();

      expect(component.state()).toBe('ready');
      expect(text(fixture, 'narrative-text')).toBe(DRAFT);
      expect(text(fixture, 'narrative-caption')).toBe('AI-generated draft — review before use');
      expect(query(fixture, 'narrative-copy')).not.toBeNull();
      expect(query(fixture, 'narrative-regenerate')).not.toBeNull();
    });

    it('passes the REQUIRED narrative json schema to complete', async () => {
      const { engine } = await mount();

      expect(engine.complete).toHaveBeenCalledWith(expect.any(Array), {
        type: 'object',
        properties: { narrative: { type: 'string' } },
        required: ['narrative']
      });
    });

    it('never renders the raw completion envelope', async () => {
      const { fixture } = await mount();

      const panel = query(fixture, 'narrative-panel')!.textContent ?? '';
      expect(panel).toContain(DRAFT);
      expect(panel).not.toContain('{"narrative"');
    });

    it('Copy puts the narrative — and only the narrative — on the clipboard', async () => {
      const { fixture, clipboard } = await mount();

      query(fixture, 'narrative-copy')!.click();
      fixture.detectChanges();

      expect(clipboard.copy).toHaveBeenCalledTimes(1);
      expect(clipboard.copy).toHaveBeenCalledWith(DRAFT);
      expect(text(fixture, 'narrative-copy')).toBe(NARRATIVE_COPY.copied);
    });

    it('reverts the Copy label after the confirmation window', async () => {
      const { fixture } = await mount();
      jest.useFakeTimers();
      try {
        query(fixture, 'narrative-copy')!.click();
        fixture.detectChanges();
        expect(text(fixture, 'narrative-copy')).toBe(NARRATIVE_COPY.copied);

        jest.advanceTimersByTime(COPY_FEEDBACK_MS);
        fixture.detectChanges();

        expect(text(fixture, 'narrative-copy')).toBe(NARRATIVE_COPY.copy);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('facts fed to the model (MRF-R-9, MRF-R-12)', () => {
    it('interpolates the three placeholders with the page facts, as text', async () => {
      const { engine } = await mount({ promptTemplate: 'AOW={{aow}} STATS={{stats}} HLOS={{hlos}}' });

      const [messages] = engine.complete.mock.calls[0];
      const userTurn = messages.find((m: { role: string }) => m.role === 'user').content;
      expect(userTurn).toContain('AOW=AoW1 — Breeding for Tomorrow');
      expect(userTurn).toContain('STATS=3 of 8 KPIs reported (38%');
      expect(userTurn).toContain('2 KPI(s) excluded because no target is set');
      expect(userTurn).toContain('HLO 1 — Improved varieties: 3 pending of 5 KPIs');
      expect(userTurn).toContain('Outcome 2 — Adoption at scale: 1 pending of 3 KPIs');
      expect(userTurn).not.toContain('{{');
    });

    it('"Data used" holds the exact facts that were fed', async () => {
      const { fixture } = await mount();

      expect(query(fixture, 'narrative-data-used')).toBeNull();
      query(fixture, 'narrative-data-used-toggle')!.click();
      fixture.detectChanges();

      const shown = text(fixture, 'narrative-data-used');
      expect(shown).toContain('AoW1 — Breeding for Tomorrow');
      expect(shown).toContain('3 of 8 KPIs reported (38%');
      expect(shown).toContain('HLO 1 — Improved varieties: 3 pending of 5 KPIs');
      expect(query(fixture, 'narrative-data-used-toggle')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('renders the prompt as text, never as markup', async () => {
      // Fail input (MRF-T-7): an `innerHTML` render would make this `<b>` disappear into a tag.
      const { fixture } = await mount({ promptTemplate: 'Summarise <b>{{aow}}</b> now' });

      query(fixture, 'narrative-data-used-toggle')!.click();
      fixture.detectChanges();

      const prompt = query(fixture, 'narrative-prompt')!;
      expect(prompt.textContent).toContain('<b>AoW1 — Breeding for Tomorrow</b>');
      expect(prompt.querySelector('b')).toBeNull();
    });
  });

  describe('failure states (MRF-R-9.2, MRF-AC-9)', () => {
    it('an unparseable completion becomes the error state and the raw JSON is never rendered', async () => {
      const raw = 'Sure! Here is the narrative you asked for.';
      const { fixture, component } = await mount({ engine: { complete: jest.fn().mockResolvedValue(raw) } });

      expect(component.state()).toBe('error');
      expect(text(fixture, 'narrative-error')).toContain(NARRATIVE_COPY.errorUnparseable);
      expect(query(fixture, 'narrative-panel')!.textContent).not.toContain(raw);
      expect(query(fixture, 'narrative-text')).toBeNull();
    });

    it.each([
      ['network-blocked', new Error('Failed to fetch model shard')],
      ['oom', new Error('Out of memory allocating buffer')],
      ['webgpu-lost', new Error('WebGPU device lost')],
      ['unknown', new Error('something odd happened')]
    ])('classifies an engine failure as %s and shows that message', async (kind, thrown) => {
      const { fixture, component } = await mount({ engine: { complete: jest.fn().mockRejectedValue(thrown) } });

      expect(component.state()).toBe('error');
      expect(text(fixture, 'narrative-error')).toContain(NARRATIVE_COPY.errorByKind[kind as 'unknown']);
    });

    it('an engine that reports itself unsupported lands in the unsupported state, not error', async () => {
      const { fixture, component } = await mount({
        engine: { init: jest.fn().mockRejectedValue(new AssistantEngineError('unsupported', 'no webgpu')) }
      });

      expect(component.state()).toBe('unsupported');
      expect(query(fixture, 'narrative-error')).toBeNull();
    });

    it('the error state offers a retry that re-runs the engine', async () => {
      const complete = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(VALID_COMPLETION);
      const { fixture, component } = await mount({ engine: { complete } });

      expect(component.state()).toBe('error');
      query(fixture, 'narrative-retry')!.click();
      await settle(fixture);

      expect(component.state()).toBe('ready');
      expect(text(fixture, 'narrative-text')).toBe(DRAFT);
    });
  });

  describe('interrupt-first supersede (MRF-R-9.3)', () => {
    it('Regenerate interrupts the engine BEFORE asking for a new completion', async () => {
      const { fixture, calls, engine } = await mount();
      calls.length = 0;

      query(fixture, 'narrative-regenerate')!.click();
      await settle(fixture);

      expect(calls.indexOf('interrupt')).toBeGreaterThanOrEqual(0);
      expect(calls.indexOf('interrupt')).toBeLessThan(calls.indexOf('complete'));
      expect(engine.complete).toHaveBeenCalledTimes(2);
    });

    it('switching AoW mid-generation interrupts the in-flight run and drops its result', async () => {
      const inFlight = deferred<string>();
      const complete = jest
        .fn()
        .mockReturnValueOnce(inFlight.promise)
        .mockResolvedValue(JSON.stringify({ narrative: 'Second draft.' }));
      const { fixture, component, engine } = await mount({ engine: { complete } });

      expect(component.state()).toBe('generating');

      fixture.componentRef.setInput('aow', OTHER_AOW);
      fixture.detectChanges();
      await settle(fixture);

      expect(engine.interrupt).toHaveBeenCalled();

      // The superseded run resolves late — its narrative must never reach the panel.
      inFlight.resolve(JSON.stringify({ narrative: 'First draft — stale.' }));
      await settle(fixture);

      expect(component.narrative()).not.toContain('stale');
      expect(component.aowFact()).toBe('AoW2 — Seed Systems');
    });

    it('closing the panel interrupts and emits closed', async () => {
      const { fixture, engine } = await mount();
      const closed = jest.fn();
      fixture.componentInstance.closed.subscribe(closed);

      query(fixture, 'narrative-close')!.click();
      await settle(fixture);

      expect(engine.interrupt).toHaveBeenCalled();
      expect(closed).toHaveBeenCalledTimes(1);
    });

    it('destroying the panel interrupts the engine', async () => {
      const { fixture, engine } = await mount();
      expect(engine.interrupt).not.toHaveBeenCalled();

      fixture.destroy();

      expect(engine.interrupt).toHaveBeenCalledTimes(1);
    });
  });

  describe('no persistence (MRF-AC-8 BUT clause)', () => {
    it('touches no API service across the whole generate → copy → regenerate path', async () => {
      const { fixture, apiTouched } = await mount();

      query(fixture, 'narrative-copy')!.click();
      query(fixture, 'narrative-regenerate')!.click();
      await settle(fixture);

      expect(apiTouched).toEqual([]);
    });
  });

  describe('accessibility surface (MRF-R-9.1)', () => {
    it('exposes a labelled region with a polite live area for the completed draft', async () => {
      const { fixture } = await mount();

      const region = query(fixture, 'narrative-panel')!;
      expect(region.getAttribute('role')).toBe('region');
      expect(region.getAttribute('aria-label')).toBe(NARRATIVE_COPY.panelLabel);

      const live = query(fixture, 'narrative-live')!;
      expect(live.getAttribute('aria-live')).toBe('polite');
      expect(live.textContent).toContain(DRAFT);
    });
  });
});
