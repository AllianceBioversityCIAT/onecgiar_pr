import { Injector } from '@angular/core';

/**
 * Contract for a tool the in-browser assistant can execute. The registry
 * (`ASSISTANT_TOOLS`) is the single source from which we derive: the tool
 * section of the system prompt, the JSON schema enum the model is constrained
 * to, and the runtime dispatch. Adding a capability = adding one object.
 */

/** A clickable result card rendered directly in the chat (NOT fed to the model). */
export interface ResultCard {
  code: string;
  title: string;
  status?: string;
  /** Deep link to open on click. */
  url: string;
}

/** Result of running a tool, appended to the conversation. */
export interface ToolResult {
  ok: boolean;
  /** Short bilingual-friendly summary shown to the user. */
  summaryForUser: string;
  /**
   * Structured data fed BACK to the model for a conversational answer
   * (retrieval synthesis). Keep small — never dump large lists here.
   */
  dataForModel?: unknown;
  /**
   * Data rendered as clickable UI in the chat and deliberately NOT shown to the
   * model — this is how we surface lists (e.g. the user's results) without
   * saturating a small model with their content.
   */
  cards?: ResultCard[];
}

export interface AssistantTool<TArgs = Record<string, unknown>> {
  /** Stable identifier — becomes part of the `tool` enum in the JSON schema. */
  readonly name: string;
  /** One-line description injected into the system prompt. */
  readonly description: string;
  /**
   * JSON-schema fragment for this tool's `args` object (enums only, no free
   * strings) — merged into the response schema so the model cannot invent
   * argument values.
   */
  readonly argsSchema: Record<string, unknown>;
  /** Natural-language aliases per language, used in the prompt (and by a future regex fallback). */
  readonly aliases: { en: string[]; es: string[] };
  /** Optional status shown to the user while this tool runs (e.g. "Checking the glossary…"). */
  readonly activityLabel?: string;
  /** Optional visibility gate (e.g. hide admin tools from non-admins). */
  isVisible?(injector: Injector): boolean;
  /** Semantic validation of parsed args before dispatch. Return an error string to reject. */
  validate(args: TArgs, injector: Injector): { ok: true } | { ok: false; error: string };
  /** Execute the tool. Only called after `validate` passes. */
  run(args: TArgs, injector: Injector): Promise<ToolResult>;
}

/** The shape the model is constrained to emit each turn. */
export interface AssistantModelOutput {
  reply: string;
  tool: string; // 'none' | <registered tool name>
  args: Record<string, unknown>;
}
