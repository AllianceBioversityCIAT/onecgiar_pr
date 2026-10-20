// @akili-spec changes/replicated-innovation-reminders (RIR-T-6)
import { ChangeDetectionStrategy, Component, DestroyRef, InjectionToken, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButtonImports } from '@spartan/button';
import { HlmBadge } from '@spartan/badge';
import { HlmDialogImports } from '@spartan/dialog';
import { HlmInputImports } from '@spartan/input';
import { HlmSkeleton } from '@spartan/skeleton';
import { HlmTableImports } from '@spartan/table';
import { REPLICATED_INNOVATION_REMINDERS_COPY } from '../../../../../../internationalization/replicated-innovation-reminders.copy';
import {
  ReminderCampaignList,
  ReminderCampaignView,
  ReminderKind,
  ReminderPreview,
  ReminderSendOutcome,
  ReminderStatus
} from '../../../../../../shared/interfaces/replicated-innovation-reminders.interface';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { OffsetAt, localInputToUtcIso, offsetLabel, utcIsoToLocalInput } from './reminder-time.util';
import { ReminderPreviewDrawerComponent } from './reminder-preview-drawer.component';

/** Override point: the admin's UTC offset AT a given instant (`Date#getTimezoneOffset` semantics, DST aware). Tests pin it; production reads the platform. */
export const REMINDER_TZ_OFFSET_MINUTES = new InjectionToken<OffsetAt>('REMINDER_TZ_OFFSET_MINUTES');

const KINDS: ReminderKind[] = ['Q4_NOTICE', 'FINAL_REMINDER'];

interface PendingConfirm {
  campaign: ReminderCampaignView;
  leads: number;
}

/**
 * Phase management -> Reporting: schedule, edit, cancel, preview and send the replicated innovation
 * reminder campaigns of the active Reporting phase. Any in-flight mutation locks every action so a
 * double click cannot create a duplicate campaign or a double send (RIR-T-5 recorded risk).
 */
@Component({
  selector: 'app-replicated-innovation-reminders',
  imports: [HlmButtonImports, HlmBadge, HlmDialogImports, HlmInputImports, HlmSkeleton, HlmTableImports, ReminderPreviewDrawerComponent],
  templateUrl: './replicated-innovation-reminders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReplicatedInnovationRemindersComponent implements OnInit {
  private readonly api = inject(ResultsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tzResolver = inject(REMINDER_TZ_OFFSET_MINUTES, { optional: true });

  protected readonly copy = REPLICATED_INNOVATION_REMINDERS_COPY;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly outcomeMessage = signal<string | null>(null);
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
  /** A CANCELLED campaign does not block a new one of the same kind (server rule). */
  readonly missingKinds = computed(() => KINDS.filter(k => !this.campaigns().some(c => c.kind === k && c.status !== 'CANCELLED')));
  readonly subtitle = computed(() => {
    const l = this.list();
    return l ? this.copy.subtitle(l.phase.phase_name, l.pending_total, l.unreachable_total) : '';
  });

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
  statusVariant(status: ReminderStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'SENT':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'PENDING':
        return 'secondary';
      default:
        return 'outline';
    }
  }
  /** Scheduled instant in the admin's local time. */
  displayDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  // Row state ---------------------------------------------------------------------------------
  canEditOrCancel(c: ReminderCampaignView): boolean {
    return c.status === 'PENDING' && !this.busy();
  }
  canPreviewOrSend(c: ReminderCampaignView): boolean {
    return (c.status === 'PENDING' || c.status === 'FAILED') && !this.busy();
  }

  // Schedule ----------------------------------------------------------------------------------
  setDraft(kind: ReminderKind, value: string): void {
    this.drafts.update(d => ({ ...d, [kind]: value }));
  }
  draftOf(kind: ReminderKind): string {
    return this.drafts()[kind] ?? '';
  }

  schedule(kind: ReminderKind): void {
    if (this.busy()) return;
    const iso = this.validate(this.draftOf(kind), msg => this.draftError.update(e => ({ ...e, [kind]: msg })));
    if (!iso) return;
    this.draftError.update(e => ({ ...e, [kind]: undefined }));
    this.mutate(this.api.POST_reminderCampaign({ kind, scheduled_at: iso }), () => this.drafts.update(d => ({ ...d, [kind]: '' })));
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
    this.busy.set(true);
    this.api
      .GET_reminderCampaignPreview(c.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.busy.set(false);
          this.confirm.set({ campaign: c, leads: res?.response?.totals?.leads ?? 0 });
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
          if (o) this.outcomeMessage.set(this.copy.outcome(o.sent, o.skipped, o.failed));
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
