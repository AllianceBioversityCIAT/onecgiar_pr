// @akili-spec bilateral/ai-processing-queue (AIQ-T-7)
/**
 * Bilateral "AI processes" queue — centralized user-facing copy (NFR i18n), mirroring
 * `bilateral-manual-create.copy.ts`'s shape (a plain exported const, grouped by surface, functions
 * for templated strings). `AIQ-T-8` extends this same object with the drawer/job-card strings —
 * keep it one object others can add sections to, never split it.
 */

export const BILATERAL_AI_PROCESSES_COPY = {
  /** `bilateral-ai-upload`'s post-submit confirmation card (`AIQ-R-7` B). */
  confirmation: {
    title: (project: string): string => `${project} was added to the AI queue`,
    subtitle: 'It keeps running in the background — you can keep reporting while it works.',
    openAiProcesses: 'Open AI processes',
    chooseAnotherProject: 'Choose another project',
  },
  /** The action toast fired on the same 202 (`AIQ-R-7` B "a toast confirms with a View action"). */
  toast: {
    summary: (project: string): string => `${project} was added to the AI queue`,
    detail: "We'll notify you when it finishes. You can keep working in the meantime.",
    viewAction: 'View',
  },
} as const;
