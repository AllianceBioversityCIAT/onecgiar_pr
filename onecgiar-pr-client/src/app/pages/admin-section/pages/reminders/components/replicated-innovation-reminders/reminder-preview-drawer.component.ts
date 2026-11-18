// @akili-spec changes/replicated-innovation-reminders (RIR-T-6, RIR-R-9)
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HlmSheetImports } from '@spartan/sheet';
import { HlmButtonImports } from '@spartan/button';
import { HlmSkeleton } from '@spartan/skeleton';
import { HlmTableImports } from '@spartan/table';
import { REPLICATED_INNOVATION_REMINDERS_COPY } from '../../../../../../internationalization/replicated-innovation-reminders.copy';
import {
  ReminderMessageType,
  ReminderPreview,
  ReminderPreviewMessage,
  ReminderUnreachableItem
} from '../../../../../../shared/interfaces/replicated-innovation-reminders.interface';

const TYPE_ORDER: ReminderMessageType[] = ['DEVELOPER', 'MELIA_SUMMARY', 'CENTER'];

interface MessageGroup {
  type: ReminderMessageType;
  label: string;
  counts: string;
  messages: ReminderPreviewMessage[];
}

/** Dry-run preview sheet: totals, digests (To / CC / results), unreachable table, redirect banner. */
@Component({
  selector: 'app-reminder-preview-drawer',
  imports: [HlmSheetImports, HlmButtonImports, HlmSkeleton, HlmTableImports],
  templateUrl: './reminder-preview-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReminderPreviewDrawerComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly preview = input<ReminderPreview | null>(null);
  readonly closed = output<void>();

  protected readonly copy = REPLICATED_INNOVATION_REMINDERS_COPY.preview;
  protected readonly noValue = REPLICATED_INNOVATION_REMINDERS_COPY.noValue;
  protected readonly actionCopy = REPLICATED_INNOVATION_REMINDERS_COPY.actions;
  protected readonly reasons = REPLICATED_INNOVATION_REMINDERS_COPY.unreachableReasons;
  protected readonly totalsText = computed(() => {
    const t = this.preview()?.totals;
    return t ? this.copy.totals(t.messages, t.results, t.cc_addresses) : '';
  });
  /** One section per message type, always in the same order, with the counts from `totals.by_type`. */
  protected readonly groups = computed<MessageGroup[]>(() => {
    const p = this.preview();
    if (!p) return [];
    return TYPE_ORDER.map(type => {
      const messages = p.digests.filter(d => d.type === type);
      const c = p.totals.by_type[type];
      return { type, label: REPLICATED_INNOVATION_REMINDERS_COPY.messageTypes[type], counts: this.copy.groupCounts(c.messages, c.results), messages };
    });
  });

  /** Program/Accelerator for W1/W2 rows, lead center for W3 rows (those carry a center and no SP role). */
  protected scopeOf(r: ReminderUnreachableItem): string {
    if (r.reason === 'NO_CENTER_MEL') return r.lead_center_name || r.lead_center_code || this.noValue;
    if (r.reason === 'NO_CENTER') return this.noValue;
    return r.initiative_short_name ? `${r.initiative_code} - ${r.initiative_short_name}` : r.initiative_code;
  }
}
