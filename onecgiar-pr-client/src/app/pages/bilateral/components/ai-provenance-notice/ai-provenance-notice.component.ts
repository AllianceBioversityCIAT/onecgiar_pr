import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `APF-R-12` / `APF-DD-10` — the single AI-transparency copy constant. Every one of the five
 * provenance surfaces (drafts list header, draft card, promoted result editor, result detail,
 * completion dialog) renders this exact sentence — as visible text (banner/line) or as the
 * accessible name of the badge — so the wording can never drift surface to surface.
 *
 * `APF-OQ-2` may override this text before the transparency task closes; presence rules do not
 * change if it does.
 */
export const AI_PROVENANCE_NOTICE_TEXT =
  'Generated with AI assistance from your sources. Review and edit before submitting.';

export type AiProvenanceNoticeVariant = 'banner' | 'badge' | 'line';

/**
 * `AiProvenanceNoticeComponent` (`APF-R-12`, `APF-DD-10`) — presentational, no inputs beyond the
 * variant. Callers decide WHEN to render it (the presence predicate: draft-ness OR
 * `creation_method === 'AI'`, normalized so `'0'` / `0` / `null` never read as AI via truthiness);
 * this component only decides HOW.
 *
 * - `banner`: dismissible-per-session info banner (dismiss state is the host's responsibility —
 *   only the promoted result editor needs it).
 * - `badge`: pill carrying the full sentence as `aria-label`/`title`, short visible label.
 * - `line`: 12.5px secondary-text line with the icon, no info-pair background.
 */
@Component({
  selector: 'app-ai-provenance-notice',
  standalone: true,
  templateUrl: './ai-provenance-notice.component.html',
  styleUrl: './ai-provenance-notice.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiProvenanceNoticeComponent {
  readonly variant = input<AiProvenanceNoticeVariant>('badge');

  readonly noticeText = AI_PROVENANCE_NOTICE_TEXT;

  /** Short visible label for the badge variant — the full sentence lives in its accessible name. */
  readonly badgeLabel = computed(() => 'AI Result');
}
