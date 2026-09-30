// @akili-spec bilateral/ai-processing-queue (AIQ-T-7, AIQ-T-8)
/**
 * Bilateral "AI processes" queue — centralized user-facing copy (NFR i18n), mirroring
 * `bilateral-manual-create.copy.ts`'s shape (a plain exported const, grouped by surface, functions
 * for templated strings). `AIQ-T-8` extends this same object with the drawer/job-card strings —
 * keep it one object others can add sections to, never split it.
 *
 * `AIQ-T-8` attempt 2 (a11y + spec review): every card/drawer string moved in here, including the
 * stage labels, the "(estimated)" suffix, "text notes", the live-region "moved to" sentence, the
 * still-running "Checking every 30 seconds" line and the retrying explanation/last-error prefix.
 * `waitReasonCopy`'s own three strings stay in `bilateral-ai-job.model.ts` (that function IS the
 * copy source for wait reasons — the fix was making the card CALL it instead of duplicating its
 * `switch` inline, not moving those strings a second time).
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
  /** `ai-processes-drawer` (`AIQ-R-9`, `AIQ-R-12`). */
  drawer: {
    title: 'AI processes',
    closeLabel: 'Close AI processes',
    subtitle: 'You can keep working or leave this page. Each job finishes on its own and its results go to My drafts.',
    lanesInUse: (busy: number, total: number): string => `${busy} of ${total} lanes in use`,
    othersWaiting: (count: number): string => `${count} job${count === 1 ? '' : 's'} from other users ${count === 1 ? 'is' : 'are'} waiting`,
    groupRunning: 'Running',
    groupWaiting: 'Waiting',
    groupFinished: 'Finished',
    footer:
      "Time depends on the evidence: from about 30 seconds to a few minutes, longer with audio. You'll get a notification in the bell when each job finishes.",
    refreshError: "Couldn't refresh. Retrying…",
    emptyTitle: 'No AI processes yet',
    emptyBody: 'Upload evidence for a project and the AI will draft results for you. Jobs you start will show up here.',
    emptyCta: 'Start with evidence',
    skeletonLabel: 'Loading AI processes…',
    /** `AIQ-R-9` H live-region announcement on a group change. */
    movedTo: (label: string, group: string): string => `${label} moved to ${group}.`,
  },
  /** `ai-job-card` (`AIQ-R-9` B–H, parity list `AIQ-DD-8`). */
  card: {
    elapsedLabel: 'elapsed',
    inQueueLabel: 'in queue',
    finishedLabel: 'finished',
    nextPosition: 'Next',
    aheadPosition: (n: number): string => `${n} ahead`,
    stillWorkingTitle: 'Still working',
    stillWorkingBody: "You don't need to do anything; we'll notify you.",
    /** `AIQ-DD-8` parity: "Checking every 30 seconds" on the still-running card. */
    checkingEvery30Seconds: 'Checking every 30 seconds',
    draftsReady: (n: number): string => `${n} draft${n === 1 ? '' : 's'} ready`,
    viewDrafts: (n: number): string => `View ${n} draft${n === 1 ? '' : 's'}`,
    /** "took 1 min 52 s" (mockup) — `duration` is the pre-formatted "Xm Ys"/"Ns" label. */
    took: (duration: string): string => `took ${duration}`,
    noCandidatesTitle: 'No results found in this evidence',
    noCandidatesHint: 'Try evidence that describes outputs or outcomes',
    reportManually: 'Report manually',
    tryAgain: 'Try again',
    tryAgainHint: 'Uses the same files, no re-upload',
    uploadDifferentFiles: 'Upload different files',
    attemptBadge: (attempt: number, max: number): string => `Attempt ${attempt} of ${max}`,
    expectedRangeFallback: 'This usually takes a few minutes; audio takes longer',
    expectedRange: (p25: number, p75: number): string => `Usually ${p25}–${p75} min`,
    /** `AIQ-DD-8` parity: retrying explanation + "Last error: …" (`ai-processing-panel`'s copy). */
    retryingExplanation: 'The AI service did not answer in time. Your job is queued again automatically — nothing to do.',
    lastError: (message: string): string => `Last error: ${message}`,
    /** Current-stage labels (`AIQ-R-9` B) — moved out of the template per client `CLAUDE.md` §10. */
    stage: {
      queued: 'Queued',
      uploading: 'Uploading your sources to the AI service',
      readingDocuments: 'Reading your documents',
      transcribingAudio: 'Transcribing audio',
      readingAndTranscribing: 'Reading and transcribing your sources',
      extracting: 'Extracting results',
      validating: 'Validating and mapping',
      creatingDrafts: 'Creating drafts',
    },
    /** Steps PRMS pre-sets from the source mix rather than observes (`APF-DD-1`). */
    estimatedSuffix: '(estimated)',
    /** Source-mix line fallback when neither documents nor audio are present but `hasText` is. */
    textNotes: 'text notes',
    /** Non-color highlight cue (`AIQ-R-8` D) — visually-hidden text alongside the ring/offset. */
    highlightedSrText: 'Opened from link',
  },
} as const;
