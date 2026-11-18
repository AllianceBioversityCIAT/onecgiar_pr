// @akili-spec changes/replicated-innovation-reminders (RIR-T-6)
import { ChangeDetectionStrategy, Component, DestroyRef, InjectionToken, OnInit, computed, inject, linkedSignal, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButtonImports } from '@spartan/button';
import { HlmBadge } from '@spartan/badge';
import { HlmDialogImports } from '@spartan/dialog';
import { HlmInputImports } from '@spartan/input';
import { HlmNativeSelectImports } from '@spartan/native-select';
import { HlmPopover, HlmPopoverContent, HlmPopoverPortal } from '@spartan/popover';
import { HlmSkeleton } from '@spartan/skeleton';
import { HlmTableImports } from '@spartan/table';
import { REPLICATED_INNOVATION_REMINDERS_COPY } from '../../../../../../internationalization/replicated-innovation-reminders.copy';
import {
  ReminderCampaignList,
  ReminderCampaignView,
  ReminderKind,
  ReminderMessageType,
  ReminderPreview,
  ReminderSendOutcome,
  ReminderStatus
} from '../../../../../../shared/interfaces/replicated-innovation-reminders.interface';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { OffsetAt, localInputToUtcIso, offsetLabel, utcClock, utcIsoToLocalInput } from './reminder-time.util';
import { ReminderPreviewDrawerComponent } from './reminder-preview-drawer.component';
import { DeliveryBarComponent } from './delivery-bar/delivery-bar.component';

/** Override point: the admin's UTC offset AT a given instant (`Date#getTimezoneOffset` semantics, DST aware). Tests pin it; production reads the platform. */
export const REMINDER_TZ_OFFSET_MINUTES = new InjectionToken<OffsetAt>('REMINDER_TZ_OFFSET_MINUTES');

const KINDS: ReminderKind[] = ['Q4_NOTICE', 'FINAL_REMINDER'];
const OPEN_STATUSES: ReminderStatus[] = ['PENDING', 'SENDING', 'FAILED'];
const MESSAGE_TYPES: ReminderMessageType[] = ['DEVELOPER', 'MELIA_SUMMARY', 'CENTER'];

interface PendingConfirm {
  campaign: ReminderCampaignView;
  messages: number;
}

/**
 * Phase management -> Reporting: schedule, edit, cancel, preview and send the replicated innovation
 * reminder campaigns of the active Reporting phase. Any in-flight mutation locks every action so a
 * double click cannot create a duplicate campaign or a double send (RIR-T-5 recorded risk).
 */
@Component({
  selector: 'app-replicated-innovation-reminders',
  imports: [
    NgTemplateOutlet,
    HlmButtonImports,
    HlmBadge,
    HlmDialogImports,
    HlmInputImports,
    HlmNativeSelectImports,
    HlmPopover,
    HlmPopoverContent,
    HlmPopoverPortal,
    HlmSkeleton,
    HlmTableImports,
    ReminderPreviewDrawerComponent,
    DeliveryBarComponent
  ],
  templateUrl: './replicated-innovation-reminders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReplicatedInnovationRemindersComponent implements OnInit {
  private readonly api = inject(ResultsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tzResolver = inject(REMINDER_TZ_OFFSET_MINUTES, { optional: true });

  protected readonly copy = REPLICATED_INNOVATION_REMINDERS_COPY;

  /** Asks the page to open the Center focal points tab (the unreachable card link). */
  readonly fixFocalPoints = output<void>();

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly outcomeMessage = signal<string | null>(null);
  readonly outcomeByType = signal<string[]>([]);
  readonly list = signal<ReminderCampaignList | null>(null);
  /** True while any mutation (or the pre-send preview) is in flight. */
  readonly busy = signal(false);

  readonly drafts = signal<Partial<Record<ReminderKind, string>>>({});
  readonly draftError = signal<Partial<Record<ReminderKind, string>>>({});
  readonly editing = signal<{ id: number; value: string } | null>(null);
  readonly editError = signal<string | null>(null);

  readonly confirm = signal<PendingConfirm | null>(null);
  readonly previewOpen = signal(false);
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);
  readonly previewData = signal<ReminderPreview | null>(null);

  readonly campaigns = computed(() => this.list()?.campaigns ?? []);
  /**
   * Only an open campaign blocks a new one of the same kind (server rule, RIR-R-5): PENDING, SENDING and
   * FAILED (retryable via Send now). SENT and CANCELLED stay as history rows and do not block.
   */
  readonly missingKinds = computed(() => KINDS.filter(k => !this.campaigns().some(c => c.kind === k && OPEN_STATUSES.includes(c.status))));
  /** Kind selected in the single scheduler (ARP-DD-5): the first missing kind, reset when the selected one stops being missing. */
  readonly scheduleKind = linkedSignal<ReminderKind[], ReminderKind | null>({
    source: this.missingKinds,
    computation: (kinds, prev) => (prev?.value && kinds.includes(prev.value) ? prev.value : (kinds[0] ?? null))
  });
  /** Kind the admin chose with "Send again": highlights its create form and shows the helper text. */
  readonly sendAgainKind = signal<ReminderKind | null>(null);
  /** Earliest open campaign by `scheduled_at` (card 3); view-only, no API. */
  readonly nextCampaign = computed<ReminderCampaignView | null>(() => {
    const open = this.campaigns().filter(c => OPEN_STATUSES.includes(c.status));
    if (!open.length) return null;
    return open.reduce((a, b) => (Date.parse(b.scheduled_at) < Date.parse(a.scheduled_at) ? b : a));
  });
  /** Which row-actions overflow menu is open (`<prefix>-<campaign id>`); one at a time. */
  readonly menuFor = signal<string | null>(null);

  /** Offset in force at `at`, so a date past a DST change uses its own offset, not today's. */
  protected readonly offsetAt: OffsetAt = at => (this.tzResolver ? this.tzResolver(at) : at.getTimezoneOffset());
  protected get zoneName(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
    } catch {
      return 'local';
    }
  }
  /** Time-zone hint for the date being entered (or today when none yet). */
  timeZoneHintFor(local: string | undefined): string {
    const iso = local ? localInputToUtcIso(local, this.offsetAt) : null;
    const at = iso ? new Date(iso) : new Date();
    return this.copy.schedule.timeZoneHint(this.zoneName, offsetLabel(this.offsetAt(at)));
  }

  /** "Sends at HH:MM UTC" for the entered date (that date's own offset); empty until the input is a valid date-time. */
  utcHintFor(local: string | undefined): string {
    const iso = local ? localInputToUtcIso(local, this.offsetAt) : null;
    return iso ? this.copy.schedule.sendsAtUtc(utcClock(iso)) : '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .GET_reminderCampaigns()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.list.set(res?.response ?? null);
          this.loading.set(false);
        },
        error: err => {
          this.loadError.set(this.messageOf(err, this.copy.loadError));
          this.loading.set(false);
        }
      });
  }

  /** Silent re-fetch after a mutation: keeps the table on screen. */
  private reload(): void {
    this.api
      .GET_reminderCampaigns()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => this.list.set(res?.response ?? null),
        error: err => this.actionError.set(this.messageOf(err, this.copy.loadError))
      });
  }

  kindLabel(kind: ReminderKind): string {
    return this.copy.kinds[kind] ?? kind;
  }
  statusLabel(status: ReminderStatus): string {
    return this.copy.statuses[status] ?? status;
  }
  /** Status badge colours from the design §6.4 token pairs; the badge TEXT carries the status (ARP-NFR-1). */
  statusClass(status: ReminderStatus): string {
    switch (status) {
      case 'SENT':
        return '!bg-[var(--pr-color-green-50)] !text-[var(--pr-color-green-700)]';
      case 'FAILED':
        return '!bg-[var(--pr-color-red-50)] !text-[var(--pr-color-red-300)]';
      case 'PENDING':
        return '!bg-[var(--pr-color-blue-50)] !text-[var(--pr-color-blue-700)]';
      case 'SENDING':
        return '!bg-[var(--pr-color-yellow-50)] !text-[var(--pr-color-yellow-800)] animate-pulse';
      default:
        return '!bg-[var(--pr-color-accents-1)] !text-[var(--pr-color-accents-5)]';
    }
  }
  /** Zone line above the history table: the admin's zone and its UTC offset today. */
  protected zoneLine(): string {
    return this.copy.history.zoneLine(this.zoneName, offsetLabel(this.offsetAt(new Date())));
  }
  /** "in 3 days" / "2 hours ago" for the next-send card. */
  relativeTime(iso: string): string {
    const diffMs = Date.parse(iso) - Date.now();
    if (Number.isNaN(diffMs)) return '';
    const fmt = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const abs = Math.abs(diffMs);
    if (abs >= 86_400_000) return fmt.format(Math.round(diffMs / 86_400_000), 'day');
    if (abs >= 3_600_000) return fmt.format(Math.round(diffMs / 3_600_000), 'hour');
    return fmt.format(Math.round(diffMs / 60_000), 'minute');
  }
  /** SENT campaign dispatched before its schedule (strictly earlier): an admin used Send now. */
  sentBeforeSchedule(c: ReminderCampaignView): boolean {
    if (c.status !== 'SENT' || !c.sent_at) return false;
    return Date.parse(c.sent_at) < Date.parse(c.scheduled_at);
  }
  /** Scheduled instant in the admin's local time. */
  displayDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  // Row state ---------------------------------------------------------------------------------
  // `show*` = which actions a status allows (rendered or not, ARP-R-5); `can*` adds the in-flight lock
  // that guards the handlers and disables the visible buttons.
  showEditOrCancel(c: ReminderCampaignView): boolean {
    return c.status === 'PENDING';
  }
  showPreviewOrSend(c: ReminderCampaignView): boolean {
    return c.status === 'PENDING' || c.status === 'FAILED';
  }
  showSendAgain(c: ReminderCampaignView): boolean {
    return c.status === 'SENT' && this.missingKinds().includes(c.kind);
  }
  toggleMenu(key: string): void {
    this.menuFor.update(k => (k === key ? null : key));
  }
  onMenuState(key: string, state: 'open' | 'closed'): void {
    if (state === 'closed') this.menuFor.update(k => (k === key ? null : k));
  }
  closeMenu(): void {
    this.menuFor.set(null);
  }
  canEditOrCancel(c: ReminderCampaignView): boolean {
    return c.status === 'PENDING' && !this.busy();
  }
  canPreviewOrSend(c: ReminderCampaignView): boolean {
    return (c.status === 'PENDING' || c.status === 'FAILED') && !this.busy();
  }

  /** Only when the kind is free: an open (PENDING/SENDING/FAILED) campaign of the same kind blocks a new one (RIR-R-5). */
  canSendAgain(c: ReminderCampaignView): boolean {
    return c.status === 'SENT' && !this.busy() && this.missingKinds().includes(c.kind);
  }
  /** "Send again": no new endpoint, it presets the normal create form (POST campaigns) to the row's kind. */
  sendAgain(c: ReminderCampaignView): void {
    if (!this.canSendAgain(c)) return;
    this.sendAgainKind.set(c.kind);
    this.scheduleKind.set(c.kind);
    setTimeout(() => (document.querySelector(`[data-testid="rir-draft-${c.kind}"]`) as HTMLElement | null)?.focus());
  }

  // Schedule ----------------------------------------------------------------------------------
  setDraft(kind: ReminderKind, value: string): void {
    this.drafts.update(d => ({ ...d, [kind]: value }));
  }
  draftOf(kind: ReminderKind): string {
    return this.drafts()[kind] ?? '';
  }

  onKindChange(value: string | null | undefined): void {
    const kind = this.missingKinds().find(k => k === value);
    if (kind) this.scheduleKind.set(kind);
  }

  schedule(kind: ReminderKind): void {
    if (this.busy()) return;
    const iso = this.validate(this.draftOf(kind), msg => this.draftError.update(e => ({ ...e, [kind]: msg })));
    if (!iso) return;
    this.draftError.update(e => ({ ...e, [kind]: undefined }));
    this.mutate(this.api.POST_reminderCampaign({ kind, scheduled_at: iso }), () => {
      this.drafts.update(d => ({ ...d, [kind]: '' }));
      if (this.sendAgainKind() === kind) this.sendAgainKind.set(null);
    });
  }

  // Edit date ---------------------------------------------------------------------------------
  startEdit(c: ReminderCampaignView): void {
    this.editError.set(null);
    this.editing.set({ id: c.id, value: utcIsoToLocalInput(c.scheduled_at, this.offsetAt) });
  }
  setEditValue(value: string): void {
    this.editing.update(e => (e ? { ...e, value } : e));
  }
  discardEdit(): void {
    this.editing.set(null);
    this.editError.set(null);
  }
  saveEdit(): void {
    const e = this.editing();
    if (!e || this.busy()) return;
    const iso = this.validate(e.value, msg => this.editError.set(msg));
    if (!iso) return;
    this.editError.set(null);
    this.mutate(this.api.PATCH_reminderCampaignDate(e.id, { scheduled_at: iso }), () => this.editing.set(null));
  }

  // Cancel ------------------------------------------------------------------------------------
  cancel(c: ReminderCampaignView): void {
    if (!this.canEditOrCancel(c)) return;
    this.mutate(this.api.PATCH_reminderCampaignCancel(c.id));
  }

  // Preview -----------------------------------------------------------------------------------
  openPreview(c: ReminderCampaignView): void {
    if (!this.canPreviewOrSend(c)) return;
    this.previewData.set(null);
    this.previewError.set(null);
    this.previewLoading.set(true);
    this.previewOpen.set(true);
    this.api
      .GET_reminderCampaignPreview(c.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.previewData.set(res?.response ?? null);
          this.previewLoading.set(false);
        },
        error: err => {
          this.previewError.set(this.messageOf(err, this.copy.genericError));
          this.previewLoading.set(false);
        }
      });
  }
  closePreview(): void {
    this.previewOpen.set(false);
  }

  // Send now ----------------------------------------------------------------------------------
  /** Fetches the preview to learn N, then asks for explicit confirmation stating N. */
  requestSend(c: ReminderCampaignView): void {
    if (!this.canPreviewOrSend(c)) return;
    this.actionError.set(null);
    this.outcomeMessage.set(null);
    this.outcomeByType.set([]);
    this.busy.set(true);
    this.api
      .GET_reminderCampaignPreview(c.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.busy.set(false);
          const messages = res?.response?.totals?.messages;
          if (typeof messages !== 'number' || !Number.isFinite(messages) || messages < 0) {
            this.actionError.set(this.copy.previewUnavailable);
            return;
          }
          this.confirm.set({ campaign: c, messages });
        },
        error: err => {
          this.busy.set(false);
          this.actionError.set(this.messageOf(err, this.copy.genericError));
        }
      });
  }
  dismissConfirm(): void {
    if (this.busy()) return;
    this.confirm.set(null);
  }
  confirmSend(): void {
    const pending = this.confirm();
    if (!pending || this.busy()) return;
    this.busy.set(true);
    this.actionError.set(null);
    this.api
      .POST_reminderCampaignSend(pending.campaign.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          const o = res?.response as ReminderSendOutcome | undefined;
          this.confirm.set(null);
          this.busy.set(false);
          if (o) {
            this.outcomeMessage.set(this.copy.outcome(o.sent, o.skipped, o.failed));
            this.outcomeByType.set(MESSAGE_TYPES.map(t => this.copy.outcomeByType(t, o.sent_by_type?.[t] ?? 0)));
          }
          this.reload();
        },
        error: err => {
          this.confirm.set(null);
          this.busy.set(false);
          this.actionError.set(this.messageOf(err, this.copy.genericError));
          this.reload();
        }
      });
  }

  // Helpers -----------------------------------------------------------------------------------
  private validate(local: string, onError: (msg: string) => void): string | null {
    if (!local) {
      onError(this.copy.schedule.required);
      return null;
    }
    const iso = localInputToUtcIso(local, this.offsetAt);
    if (!iso) {
      onError(this.copy.schedule.required);
      return null;
    }
    if (new Date(iso).getTime() <= Date.now()) {
      onError(this.copy.schedule.past);
      return null;
    }
    return iso;
  }

  private mutate(request$: ReturnType<ResultsApiService['POST_reminderCampaign']>, onDone?: () => void): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.outcomeMessage.set(null);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        onDone?.();
        this.busy.set(false);
        this.reload();
      },
      error: err => {
        this.busy.set(false);
        this.actionError.set(this.messageOf(err, this.copy.genericError));
      }
    });
  }

  private messageOf(err: any, fallback: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m)) return m.join('. ');
    return typeof m === 'string' && m ? m : fallback;
  }
}
