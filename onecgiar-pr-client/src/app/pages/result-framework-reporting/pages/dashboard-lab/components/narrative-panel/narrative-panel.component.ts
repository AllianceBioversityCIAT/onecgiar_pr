// @akili-spec changes/mass-reporting-flow
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideChevronUp,
  lucideCircleAlert,
  lucideCopy,
  lucideDownload,
  lucideRefreshCw,
  lucideSparkles,
  lucideX
} from '@ng-icons/lucide';
import {
  ASSISTANT_ENGINE,
  ChatMessage,
  EngineErrorKind,
  EngineProgress,
  classifyEngineError
} from '../../../../../../shared/components/ai-assistant/engine/assistant-engine.types';
import { AssistantTier, MODEL_TIERS } from '../../../../../../shared/components/ai-assistant/engine/model-tiers';
import { DeviceCapabilityService } from '../../../../../../shared/components/ai-assistant/device-capability.service';
import { DEFAULT_NARRATIVE_PROMPT, NARRATIVE_COPY, NARRATIVE_SYSTEM_PROMPT } from './narrative-copy';

/** The AoW the draft is about — `plannedAowBanner()`'s identity half. */
export interface NarrativeAowFact {
  code: string;
  name: string;
}

/** `plannedAowBanner()`'s KPI half, already under the MRF-R-7 zero-target rule. */
export interface NarrativeStatsFact {
  total: number;
  done: number;
  pct: number;
  zeroTarget: number;
}

/** One HLO/outcome group of `plannedByAowSections()`, reduced to counts. */
export interface NarrativeHloFact {
  section: string;
  title: string;
  total: number;
  pending: number;
}

/**
 * The panel's own state enum (MRF-R-9.2) — deliberately NOT the assistant's `AssistantStatus`:
 * this surface has no chat, and `needs-optin` here gates a download the panel itself owns.
 */
export type NarrativeState = 'idle' | 'checking' | 'needs-optin' | 'downloading' | 'generating' | 'ready' | 'error' | 'unsupported';

/** How long the Copy button stays on its "Copied" label before reverting. */
export const COPY_FEEDBACK_MS = 1500;

/**
 * The REQUIRED schema for `AssistantEngine.complete` (MRF-R-9). The engine returns a JSON *string*;
 * the panel parses it and renders `narrative` only — a raw completion is never shown.
 */
export const NARRATIVE_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: { narrative: { type: 'string' } },
  required: ['narrative']
};

/**
 * Text-only interpolation of `{{aow}} {{stats}} {{hlos}}` (MRF-R-9). Split/join rather than
 * `String.replace`, so a fact containing `$&`/`$1` cannot turn into a replacement pattern.
 */
export function interpolateNarrativePrompt(template: string, facts: Record<'aow' | 'stats' | 'hlos', string>): string {
  return (Object.keys(facts) as ('aow' | 'stats' | 'hlos')[]).reduce(
    (acc, key) => acc.split(`{{${key}}}`).join(facts[key]),
    template
  );
}

/**
 * Reads `narrative` out of a schema-constrained completion. Returns `null` for anything the panel
 * cannot render as prose — the caller turns that into the error state, never raw JSON (MRF-AC-8).
 */
export function parseNarrativeCompletion(raw: string): string | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const narrative = (parsed as { narrative?: unknown }).narrative;
    if (typeof narrative !== 'string' || !narrative.trim()) return null;
    return narrative.trim();
  } catch {
    return null;
  }
}

/**
 * AI narrative panel for the By-AOW banner (MRF-R-9, design §6/§12 MRF-DD-1).
 *
 * Runs entirely in the browser on the existing `ASSISTANT_ENGINE` (WebLLM): it injects **no API
 * service**, writes nothing, and persists nothing — the draft lives in a signal until the panel
 * closes. The double gate (`environment.aiAssistant.enabled` + `ai_narrative_enabled`) lives in the
 * host, which simply does not render the trigger or this component when either is off (MRF-AC-7).
 */
@Component({
  selector: 'app-narrative-panel',
  standalone: true,
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideChevronUp,
      lucideCircleAlert,
      lucideCopy,
      lucideDownload,
      lucideRefreshCw,
      lucideSparkles,
      lucideX
    })
  ],
  templateUrl: './narrative-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NarrativePanelComponent implements OnInit {
  private readonly engine = inject(ASSISTANT_ENGINE);
  private readonly capability = inject(DeviceCapabilityService);
  private readonly clipboard = inject(Clipboard);
  private readonly destroyRef = inject(DestroyRef);

  readonly aow = input.required<NarrativeAowFact>();
  readonly stats = input.required<NarrativeStatsFact>();
  readonly hlos = input<NarrativeHloFact[]>([]);
  /** `ai_narrative_prompt`; empty falls back to `DEFAULT_NARRATIVE_PROMPT` (same placeholders). */
  readonly promptTemplate = input<string>('');

  readonly closed = output<void>();

  readonly copy = NARRATIVE_COPY;

  readonly state = signal<NarrativeState>('idle');
  readonly narrative = signal<string>('');
  readonly progress = signal<EngineProgress | null>(null);
  readonly errorMessage = signal<string>('');
  readonly justCopied = signal(false);
  readonly dataUsedOpen = signal(false);
  private readonly tier = signal<AssistantTier | null>(null);

  /**
   * Supersede token (MRF-R-9.3): every run captures it, and any callback whose token is stale — an
   * AoW switch, a Regenerate, a close — drops its result instead of racing the newer run.
   */
  private runToken = 0;
  private lastAowCode: string | null = null;
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  readonly progressPct = computed(() => Math.round((this.progress()?.progress ?? 0) * 100));

  /** One-time download size for the consent step — the user must see it before accepting. */
  readonly downloadMB = computed(() => {
    const tier = this.tier();
    return !tier || tier === 'unsupported' ? 0 : MODEL_TIERS[tier].downloadMB;
  });

  readonly aowFact = computed(() => {
    const aow = this.aow();
    return aow.name ? `${aow.code} — ${aow.name}` : aow.code;
  });

  readonly statsFact = computed(() => {
    const s = this.stats();
    const base = `${s.done} of ${s.total} KPIs reported (${s.pct}% of the Area of Work)`;
    return s.zeroTarget > 0 ? `${base}; ${s.zeroTarget} KPI(s) excluded because no target is set` : base;
  });

  readonly hlosFact = computed(() => {
    const rows = this.hlos();
    if (!rows.length) return 'No High Level Outputs match the current filters.';
    return rows.map(h => `- ${h.section} · ${h.title}: ${h.pending} pending of ${h.total} KPIs`).join('\n');
  });

  /** Exactly what the model is asked — shown verbatim under "Data used" (MRF-R-12). */
  readonly interpolatedPrompt = computed(() =>
    interpolateNarrativePrompt(this.promptTemplate()?.trim() || DEFAULT_NARRATIVE_PROMPT, {
      aow: this.aowFact(),
      stats: this.statsFact(),
      hlos: this.hlosFact()
    })
  );

  constructor() {
    // MRF-R-9.3 — a second AoW's generation supersedes the first: the in-flight run is interrupted
    // and the panel resets rather than rendering a draft about the AoW the user just left.
    effect(() => {
      const code = this.aow()?.code ?? '';
      untracked(() => {
        if (this.lastAowCode === null) {
          this.lastAowCode = code;
          return;
        }
        if (this.lastAowCode === code) return;
        this.lastAowCode = code;
        this.supersede();
        void this.start();
      });
    });

    this.destroyRef.onDestroy(() => {
      this.clearCopyTimer();
      this.engine.interrupt();
    });
  }

  ngOnInit(): void {
    // The host mounts this component only when the user activates the trigger, so opening the
    // panel IS the request to generate. Nothing downloads before the consent step below.
    void this.start();
  }

  /** MRF-R-9.2 — capability + cache decide unsupported / consent / straight-to-generate. */
  async start(): Promise<void> {
    const token = ++this.runToken;
    this.state.set('checking');
    this.narrative.set('');
    this.errorMessage.set('');
    this.progress.set(null);
    try {
      const { tier } = await this.capability.detect();
      if (token !== this.runToken) return;
      this.tier.set(tier);
      if (tier === 'unsupported') {
        this.state.set('unsupported');
        return;
      }
      const cached = await this.engine.isModelCached(tier);
      if (token !== this.runToken) return;
      if (!cached) {
        // MRF-R-9.4 — stop here. `init` is called only from `acceptDownload()`.
        this.state.set('needs-optin');
        return;
      }
      await this.run(token, tier, true);
    } catch (err) {
      this.fail(token, err);
    }
  }

  /** The consent step's accept — the ONLY path that may trigger a cold-cache download. */
  async acceptDownload(): Promise<void> {
    const tier = this.tier();
    if (this.state() !== 'needs-optin' || !tier || tier === 'unsupported') return;
    await this.run(++this.runToken, tier, false);
  }

  /** Decline the download: nothing is fetched, the panel closes. */
  declineDownload(): void {
    this.close();
  }

  /**
   * MRF-R-9.3 — interrupt the in-flight completion BEFORE asking for a new one, then go back
   * through `start()`.
   *
   * Regenerate deliberately re-runs the capability + cache probe instead of calling `run()`
   * directly. `run()` always calls `init()`, so a shortcut here is a download with no consent
   * whenever the cache state is not what the last run assumed — reachable when `isModelCached()`
   * itself rejects (private browsing, blocked storage) and the user hits "Try again", or when a
   * consented download dies part-way. One extra cache probe per regenerate buys the guarantee that
   * MRF-R-9.4's opt-in step is the ONLY door to `init()`.
   */
  async regenerate(): Promise<void> {
    this.engine.interrupt();
    this.resetCopied();
    await this.start();
  }

  copyNarrative(): void {
    const text = this.narrative();
    if (!text) return;
    this.clipboard.copy(text);
    this.justCopied.set(true);
    this.clearCopyTimer();
    this.copyResetTimer = setTimeout(() => {
      this.copyResetTimer = null;
      this.justCopied.set(false);
    }, COPY_FEEDBACK_MS);
  }

  toggleDataUsed(): void {
    this.dataUsedOpen.update(open => !open);
  }

  close(): void {
    this.supersede();
    this.closed.emit();
  }

  private async run(token: number, tier: Exclude<AssistantTier, 'unsupported'>, cached: boolean): Promise<void> {
    this.narrative.set('');
    this.errorMessage.set('');
    this.resetCopied();
    this.progress.set(null);
    this.state.set(cached ? 'generating' : 'downloading');
    try {
      await this.engine.init(tier, (p: EngineProgress) => {
        if (token === this.runToken) this.progress.set(p);
      });
      if (token !== this.runToken) return;
      this.state.set('generating');
      const raw = await this.engine.complete(this.buildMessages(), NARRATIVE_JSON_SCHEMA);
      if (token !== this.runToken) return;
      const narrative = parseNarrativeCompletion(raw);
      if (narrative === null) {
        // Unparseable completion is an error state, never a raw-JSON render (MRF-AC-8).
        this.state.set('error');
        this.errorMessage.set(this.copy.errorUnparseable);
        return;
      }
      this.narrative.set(narrative);
      this.state.set('ready');
    } catch (err) {
      this.fail(token, err);
    }
  }

  private buildMessages(): ChatMessage[] {
    return [
      { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
      { role: 'user', content: this.interpolatedPrompt() }
    ];
  }

  /** Generation failure never breaks the banner — it only paints this panel (MRF-R-9.2). */
  private fail(token: number, err: unknown): void {
    if (token !== this.runToken) return;
    const kind: EngineErrorKind = classifyEngineError(err).kind;
    this.state.set(kind === 'unsupported' ? 'unsupported' : 'error');
    this.errorMessage.set(this.copy.errorByKind[kind]);
  }

  /** Abandon whatever is in flight and stop any late callback from landing. */
  private supersede(): void {
    this.runToken++;
    this.engine.interrupt();
    this.state.set('idle');
    this.narrative.set('');
    this.progress.set(null);
    this.resetCopied();
  }

  private resetCopied(): void {
    this.clearCopyTimer();
    this.justCopied.set(false);
  }

  private clearCopyTimer(): void {
    if (this.copyResetTimer === null) return;
    clearTimeout(this.copyResetTimer);
    this.copyResetTimer = null;
  }
}
