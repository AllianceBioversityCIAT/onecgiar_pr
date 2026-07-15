import { inject, Injectable, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ASSISTANT_ENGINE, AssistantEngineError, ChatMessage, EngineProgress } from './engine/assistant-engine.types';
import { AssistantTier, demoteTier } from './engine/model-tiers';
import { buildSystemPrompt } from './engine/system-prompt';
import { DeviceCapabilityService } from './device-capability.service';
import { UserContextService } from './user-context.service';
import { ASSISTANT_TOOLS, toolNameEnum } from './tools/assistant-tools';
import { AssistantModelOutput, ResultCard } from './tools/assistant-tool.types';

export type AssistantStatus = 'idle' | 'detecting' | 'unsupported' | 'needs-optin' | 'downloading' | 'ready' | 'thinking' | 'error';

export interface ChatUiMessage {
  role: 'user' | 'assistant';
  text: string;
  /** Optional action chip, e.g. "→ Navigating to Results Center". */
  action?: string;
  /** Clickable result cards rendered under the message (not fed to the model). */
  cards?: ResultCard[];
}

const HISTORY_TURNS = 8;
/** Max model calls per user turn: 1 to decide, +1 to synthesize a retrieval result. */
const MAX_TOOL_ROUNDS = 2;

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly engine = inject(ASSISTANT_ENGINE);
  private readonly deviceSE = inject(DeviceCapabilityService);
  private readonly userCtx = inject(UserContextService);
  private readonly injector = inject(Injector);

  readonly isOpen = signal(false);
  readonly status = signal<AssistantStatus>('idle');
  readonly progress = signal<EngineProgress | null>(null);
  readonly messages = signal<ChatUiMessage[]>([]);
  readonly tier = signal<AssistantTier>('unsupported');
  readonly errorKind = signal<string | null>(null);
  readonly errorDetail = signal<string | null>(null);
  /** Transient status shown while a tool runs, e.g. "Checking the CLARISA glossary…". */
  readonly activity = signal<string | null>(null);

  private ready = false;

  open(): void {
    this.isOpen.set(true);
    if (this.status() === 'idle') void this.detect();
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen() ? this.close() : this.open();
  }

  /** Detect device tier and decide whether to fast-start or show the opt-in card. */
  async detect(): Promise<void> {
    this.status.set('detecting');
    const { tier } = await this.deviceSE.detect();
    this.tier.set(tier);
    if (tier === 'unsupported') {
      this.status.set('unsupported');
      return;
    }
    const cached = await this.engine.isModelCached(tier);
    if (cached) {
      await this.startModel();
    } else {
      this.status.set('needs-optin');
    }
  }

  /** Download (if needed) and load the model, then move to the chat state. */
  async startModel(): Promise<void> {
    this.status.set('downloading');
    this.errorKind.set(null);
    this.errorDetail.set(null);
    let tier = this.tier();
    // Retry once on OOM / device-lost by demoting a tier.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await this.engine.init(tier, p => this.progress.set(p));
        this.tier.set(tier);
        this.ready = true;
        this.status.set('ready');
        if (this.messages().length === 0) this.pushWelcome();
        return;
      } catch (err) {
        const kind = err instanceof AssistantEngineError ? err.kind : 'unknown';
        const message = err instanceof Error ? err.message : String(err);
        console.error('[ai-assistant] model load failed', { kind, tier, message, err });
        const next = kind === 'oom' || kind === 'webgpu-lost' ? demoteTier(tier) : null;
        if (next) {
          tier = next;
          continue;
        }
        this.status.set('error');
        this.errorKind.set(kind);
        this.errorDetail.set(`[${kind}] ${message}`);
        return;
      }
    }
  }

  /** Send a user message: build prompt → engine → parse/validate → dispatch. */
  async send(userText: string): Promise<void> {
    const text = userText.trim();
    if (!text || !this.ready || this.status() === 'thinking') return;

    this.appendMessage({ role: 'user', text });
    this.status.set('thinking');

    try {
      await this.runTurn();
    } catch (err) {
      const kind = err instanceof AssistantEngineError ? err.kind : 'unknown';
      this.errorKind.set(kind);
      this.appendMessage({ role: 'assistant', text: this.fallbackReply() });
    } finally {
      this.activity.set(null);
      if (this.status() === 'thinking') this.status.set('ready');
    }
  }

  dispose(): void {
    this.engine.dispose();
    this.ready = false;
    this.status.set('idle');
  }

  // --- internals ---------------------------------------------------------

  /**
   * One user turn, with a bounded multi-step loop: a retrieval tool (one that
   * returns `dataForModel`, e.g. the glossary lookup) feeds its result back to
   * the model for a conversational answer — context on demand, not preloaded.
   */
  private async runTurn(): Promise<void> {
    const toolContext: ChatMessage[] = [];
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const raw = await this.engine.complete([...this.buildMessages(), ...toolContext], this.responseSchema());
      const output = this.safeParse(raw);
      if (!output) {
        this.appendMessage({ role: 'assistant', text: this.fallbackReply() });
        return;
      }
      const reply = (output.reply || '').trim() || '…';

      if (!output.tool || output.tool === 'none') {
        this.appendMessage({ role: 'assistant', text: reply });
        return;
      }
      const tool = ASSISTANT_TOOLS.find(t => t.name === output.tool);
      if (!tool) {
        this.appendMessage({ role: 'assistant', text: this.fallbackReply() });
        return;
      }
      const args = output.args ?? {};
      const validation = tool.validate(args, this.injector);
      if (!validation.ok) {
        this.appendMessage({ role: 'assistant', text: 'error' in validation ? validation.error : this.fallbackReply() });
        return;
      }

      if (tool.activityLabel) this.activity.set(tool.activityLabel);
      const result = await tool.run(args, this.injector);
      if (result.cards?.length) {
        // Render the list as clickable cards — NOT fed to the model.
        this.appendMessage({ role: 'assistant', text: result.summaryForUser || reply, cards: result.cards });
        return;
      }
      if (result.dataForModel !== undefined) {
        // Retrieval tool: feed the fetched data back and let the model answer.
        toolContext.push({
          role: 'user',
          content: `[[TOOL_RESULT ${tool.name}]] ${JSON.stringify(result.dataForModel)}\nUsing ONLY this data, answer my previous question conversationally in my language. If "found" is false, say you don't have that term in the glossary. Do not call any tool now (use "none").`
        });
        continue;
      }
      // Terminal action tool (e.g. navigate): show reply + action chip, done.
      this.appendMessage({ role: 'assistant', text: reply, action: result.summaryForUser });
      return;
    }
    // Loop exhausted without a terminal answer.
    this.appendMessage({ role: 'assistant', text: this.fallbackReply() });
  }

  /** Navigate when a user clicks a result card. */
  openUrl(url: string): void {
    this.injector.get(Router).navigateByUrl(url);
  }

  private buildMessages(): ChatMessage[] {
    const history = this.messages()
      .slice(-HISTORY_TURNS)
      .map<ChatMessage>(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        // Fold the executed action into the assistant turn so the model remembers
        // where it took the user (enables follow-ups like "y ahora regrésame").
        content: m.action ? `${m.text} (${m.action})` : m.text
      }));
    return [{ role: 'system', content: buildSystemPrompt(this.userCtx.identity()) }, ...history];
  }

  /** JSON schema assembled from the tool registry — the model is constrained to it. */
  private responseSchema(): Record<string, unknown> {
    const argsProperties: Record<string, unknown> = {};
    for (const tool of ASSISTANT_TOOLS) Object.assign(argsProperties, tool.argsSchema);
    return {
      type: 'object',
      properties: {
        reply: { type: 'string' },
        tool: { type: 'string', enum: toolNameEnum() },
        args: { type: 'object', properties: argsProperties }
      },
      required: ['reply', 'tool']
    };
  }

  private safeParse(raw: string): AssistantModelOutput | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.tool === 'string') {
        return { reply: String(parsed.reply ?? ''), tool: parsed.tool, args: parsed.args ?? {} };
      }
    } catch {
      /* fall through */
    }
    return null;
  }

  private pushWelcome(): void {
    const name = this.userCtx.identity().firstName;
    const hi = name ? `Hi ${name}! ` : 'Hi! ';
    this.appendMessage({
      role: 'assistant',
      text: `${hi}I can take you around PRMS, show your results, or open one of them. Try "muéstrame mis resultados" or "take me to Quality Assurance".`
    });
  }

  private fallbackReply(): string {
    return 'Sorry, I could not do that. I can navigate you to sections like Results Center, Results Framework, Innovation Packages, Quality Assurance, What’s New or Notifications. / Puedo llevarte a esas secciones.';
  }

  private appendMessage(msg: ChatUiMessage): void {
    this.messages.update(list => [...list, msg]);
  }
}
