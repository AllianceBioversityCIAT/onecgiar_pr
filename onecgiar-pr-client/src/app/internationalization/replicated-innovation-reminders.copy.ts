// @akili-spec changes/replicated-innovation-reminders (RIR-T-6)
import type { ReminderKind, ReminderStatus } from '../shared/interfaces/replicated-innovation-reminders.interface';

/** Admin copy for the replicated innovation reminders section (Phase management → Reporting). */
export const REPLICATED_INNOVATION_REMINDERS_COPY = {
  title: 'Replicated innovation reminders',
  subtitle: (phaseName: string, pending: number, unreachable: number): string =>
    `${phaseName}: ${pending} pending replicated innovation(s), ${unreachable} without a reachable lead.`,
  loading: 'Loading campaigns',
  empty: 'No campaigns scheduled for this phase',
  loadError: 'The campaigns could not be loaded.',
  retry: 'Retry',
  noValue: '-',
  genericError: 'The request failed. Try again.',
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
    description: (leads: number): string => `${leads} ${leads === 1 ? 'lead' : 'leads'} will receive an email. This cannot be undone.`,
    leadsWillReceive: (leads: number): string => `${leads} leads will receive an email`,
    confirm: 'Send now',
    cancel: 'Go back'
  },
  preview: {
    title: 'Reminder preview',
    description: 'Dry run. Nothing is sent from this view.',
    loading: 'Loading preview',
    totals: (leads: number, results: number, cc: number): string => `${leads} lead(s), ${results} result(s), ${cc} CC address(es)`,
    redirectBanner: 'Non-production: every email is redirected to the test address instead of the real recipients.',
    to: 'To',
    cc: 'CC',
    results: 'Results',
    noDigests: 'There are no leads to email.',
    unreachableTitle: 'Unreachable (no lead email)',
    unreachableEmpty: 'Every pending result has a reachable lead.',
    colCode: 'Code',
    colTitle: 'Title',
    colInitiative: 'Initiative',
    colContact: 'Contact (free text)'
  },
  outcome: (sent: number, skipped: number, failed: number): string => `Dispatch finished: ${sent} sent, ${skipped} skipped, ${failed} failed.`
} as const;
