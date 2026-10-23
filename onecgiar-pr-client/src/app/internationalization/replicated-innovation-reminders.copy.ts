// @akili-spec changes/replicated-innovation-reminders (RIR-T-6)
import type {
  ReminderKind,
  ReminderMessageType,
  ReminderStatus,
  ReminderUnreachableReason
} from '../shared/interfaces/replicated-innovation-reminders.interface';

/** Admin copy for the replicated innovation reminders section (Phase management → Reporting). */
export const REPLICATED_INNOVATION_REMINDERS_COPY = {
  title: 'Replicated innovation reminders',
  subtitle: (phaseName: string, pending: number, unreachable: number): string =>
    `${phaseName}: ${pending} pending replicated innovation(s), ${unreachable} without a reachable recipient.`,
  loading: 'Loading campaigns',
  empty: 'No campaigns scheduled for this phase',
  loadError: 'The campaigns could not be loaded.',
  retry: 'Retry',
  noValue: '-',
  genericError: 'The request failed. Try again.',
  previewUnavailable: 'The preview could not be loaded. Nothing was sent.',
  kinds: {
    Q4_NOTICE: 'Q4 notice',
    FINAL_REMINDER: 'Final reminder'
  } as Record<ReminderKind, string>,
  statuses: {
    PENDING: 'Pending',
    SENDING: 'Sending',
    SENT: 'Sent',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled'
  } as Record<ReminderStatus, string>,
  columns: {
    kind: 'Reminder',
    scheduled: 'Scheduled for',
    sentAt: 'Sent at',
    status: 'Status',
    sent: 'Sent',
    skipped: 'Skipped',
    failed: 'Failed',
    unreachable: 'Unreachable',
    actions: 'Actions'
  },
  actions: {
    preview: 'Preview',
    editDate: 'Edit date',
    cancel: 'Cancel',
    sendNow: 'Send now',
    save: 'Save date',
    discard: 'Discard',
    schedule: 'Schedule',
    scheduling: 'Scheduling',
    sending: 'Sending',
    close: 'Close'
  },
  schedule: {
    heading: 'Schedule a reminder',
    dateLabel: 'Date and time',
    kindLabel: 'Reminder',
    timeZoneHint: (zone: string, offset: string): string => `Your local time (${zone}, ${offset}). The server runs in UTC.`,
    required: 'Pick a date and time.',
    past: 'The date must be in the future.'
  },
  confirm: {
    title: 'Send this reminder now?',
    description: (messages: number): string => `${messages} ${messages === 1 ? 'message' : 'messages'} will be sent. This cannot be undone.`,
    confirm: 'Send now',
    cancel: 'Go back'
  },
  messageTypes: {
    DEVELOPER: 'Developer digests',
    MELIA_SUMMARY: 'MELIA summaries (per Program/Accelerator)',
    CENTER: 'Center MEL emails (bilateral)'
  } as Record<ReminderMessageType, string>,
  unreachableReasons: {
    NO_MELIA: 'No MELIA focal point for the Program/Accelerator',
    NO_CENTER: 'No lead center',
    NO_CENTER_MEL: 'No Center MEL focal point for the center'
  } as Record<ReminderUnreachableReason, string>,
  preview: {
    title: 'Reminder preview',
    description: 'Dry run. Nothing is sent from this view.',
    loading: 'Loading preview',
    totals: (messages: number, results: number, cc: number): string => `${messages} message(s), ${results} result(s), ${cc} CC address(es)`,
    groupCounts: (messages: number, results: number): string => `${messages} message(s), ${results} result(s)`,
    redirectBanner: 'Non-production: every email is redirected to the test address instead of the real recipients.',
    to: 'To',
    cc: 'CC',
    ccCount: (n: number): string => `${n} CC`,
    greeting: 'Greeting',
    results: 'Results',
    developerText: 'Developer (free text)',
    noMessages: 'There are no messages to send.',
    unreachableTitle: 'Unreachable (no recipient)',
    unreachableEmpty: 'Every pending result has a recipient.',
    colCode: 'Code',
    colTitle: 'Title',
    colScope: 'Program/Accelerator or center',
    colReason: 'Reason',
    colDeveloper: 'Developer (free text)'
  },
  outcome: (sent: number, skipped: number, failed: number): string => `Dispatch finished: ${sent} sent, ${skipped} skipped, ${failed} failed.`,
  outcomeByType: (type: ReminderMessageType, sent: number): string => `${REPLICATED_INNOVATION_REMINDERS_COPY.messageTypes[type]}: ${sent} sent`
} as const;
