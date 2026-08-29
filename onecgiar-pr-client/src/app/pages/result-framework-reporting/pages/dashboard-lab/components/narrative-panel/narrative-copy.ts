/**
 * `NarrativePanelComponent` — every user-facing string, centralised (same accepted deviation as
 * `hub-copy.ts`: `dashboard-lab` templates use literal English, so a later i18n pass is a single
 * edit here instead of a template hunt).
 *
 * `docs/specs/changes/mass-reporting-flow/requirements.md` MRF-R-9.x / `design.md` §6.
 *
 * @akili-spec changes/mass-reporting-flow
 */

import { EngineErrorKind } from '../../../../../../shared/components/ai-assistant/engine/assistant-engine.types';

export const NARRATIVE_COPY = {
  /** Host-rendered trigger in the By-AOW banner (double-gated — MRF-R-8). */
  trigger: 'Generate narrative',
  panelLabel: 'AI narrative draft',
  close: 'Close narrative',

  /** MRF-R-9.1 — mandatory, verbatim. Never reword without changing the requirement. */
  caption: 'AI-generated draft — review before use',

  copy: 'Copy',
  copied: 'Copied',
  regenerate: 'Regenerate',
  retry: 'Try again',

  checkingTitle: 'Checking this device…',
  checkingBody: 'Looking for the hardware the on-device model needs.',

  /** MRF-R-9.4 — the panel owns the opt-in; nothing downloads before `consentAccept`. */
  consentTitle: 'Run this on your device',
  consentBody: (downloadMB: number) =>
    `The draft is written in your browser — no page data leaves this device and nothing is saved. ` +
    `The first run downloads a one-time model of about ${downloadMB} MB.`,
  consentAccept: 'Download model and generate',
  consentDecline: 'Not now',

  downloadingTitle: 'Downloading the on-device model…',
  downloadingHint: 'One time only — later drafts start straight away.',

  generatingTitle: 'Writing the draft…',
  generatingHint: 'This runs on your device and can take a moment.',

  unsupportedTitle: 'This device cannot run the on-device model',
  unsupportedBody: 'The narrative needs WebGPU and a little free storage. The reporting numbers above are unaffected.',

  dataUsed: 'Data used',
  dataUsedHint: 'These are the only facts sent to the model.',
  dataUsedAow: 'Area of Work',
  dataUsedProgress: 'Progress',
  dataUsedHlos: 'High Level Outputs',
  dataUsedPrompt: 'Prompt sent',

  errorTitle: 'The draft could not be generated',
  /** Unparseable completion — MRF-R-9 (never render the raw JSON). */
  errorUnparseable: 'The model replied in a format this panel could not read. Try again.',
  errorByKind: {
    'webgpu-lost': 'The browser lost access to the graphics device. Reload the page and try again.',
    oom: 'This device ran out of memory for the model. Close some tabs and try again.',
    'network-blocked': 'The model files could not be downloaded. Check the connection and try again.',
    unsupported: 'This device cannot run the on-device model.',
    unknown: 'Something went wrong while generating the draft.'
  } satisfies Record<EngineErrorKind, string>
};

/**
 * System turn — facts-only guardrail (MRF-R-9). The user turn is the admin-managed
 * `ai_narrative_prompt` with `{{aow}} {{stats}} {{hlos}}` interpolated.
 */
export const NARRATIVE_SYSTEM_PROMPT =
  'You write short reporting summaries for CGIAR science programs. Use ONLY the facts given to you. ' +
  'Never invent numbers, names, dates or causes. Reply as JSON: {"narrative": "<2-4 sentences of plain prose>"}.';

/**
 * Fallback used only when `ai_narrative_prompt` is missing/empty (the seed migration ships a real
 * one). Keeps the same three placeholders so the interpolation contract holds either way.
 */
export const DEFAULT_NARRATIVE_PROMPT =
  'Write a short reporting progress narrative for this Area of Work.\n\n' +
  'Area of Work: {{aow}}\n' +
  'Progress: {{stats}}\n' +
  'High Level Outputs:\n{{hlos}}\n\n' +
  'Two to four sentences. State where reporting stands and which High Level Outputs still have pending KPIs.';
