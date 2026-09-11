import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';
import { BrnCommandImports, BrnCommand } from '@spartan-ng/brain/command';
import { HlmDialogImports } from '@spartan/dialog';
import { HlmNativeSelectImports } from '@spartan/native-select';
import { GlobalSearchPaletteService, PaletteProgramRow, PaletteResultRow } from './global-search-palette.service';

/**
 * Fixed `--pr-status-*` fg/bg PAIRS, copied verbatim from `result-header.component.ts:17` (and its
 * duplicate at `programme-results.component.ts:99`) so a status looks identical everywhere.
 * `status_id 1` is what the API returns for "Editing". Never recombine a fg with another bg, never
 * add a sixth colour (UI-RULES rule 9); an unknown id falls back to `not-started`.
 */
const STATUS_TOKENS: Record<string, { fg: string; bg: string }> = {
  1: { fg: 'var(--pr-status-in-progress-fg)', bg: 'var(--pr-status-in-progress-bg)' },
  2: { fg: 'var(--pr-status-approved-fg)', bg: 'var(--pr-status-approved-bg)' },
  3: { fg: 'var(--pr-status-submitted-fg)', bg: 'var(--pr-status-submitted-bg)' }
};

/**
 * Deliberate local copy of `reporting-nav-sidebar.component.ts:595-614`. That palette lives as a
 * PRIVATE member of a live component, so it cannot be injected; lifting it into a shared helper
 * would mean editing the sidebar, which is out of scope here. Same values, same index-by-number
 * rule (a character hash collided in practice — SP01 and SP12 landed on the same swatch).
 * Follow-up, own PR: lift both into `shared/utils/program-dot-color.ts`.
 */
const PROGRAM_DOT_PALETTE: readonly string[] = [
  'var(--pr-chart-3)',
  'var(--pr-color-green-500)',
  'var(--pr-color-blue-500)',
  'var(--pr-sidebar-accent)',
  'var(--pr-color-yellow-300)',
  'var(--pr-chart-4)',
  'var(--pr-color-orange-500)',
  'var(--pr-color-red-100)'
];

export function programDotColor(code: string | null | undefined): string {
  if (!code) return PROGRAM_DOT_PALETTE[0];
  const digits = code.match(/\d+/)?.[0];
  const index = digits ? Number(digits) : [...code].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return PROGRAM_DOT_PALETTE[index % PROGRAM_DOT_PALETTE.length];
}

/**
 * Global search palette — the command-palette overlay behind the topbar Search button.
 *
 * Groups: RESULTS (server-side `?title=` search), INDICATORS (visible-but-disabled, `Coming soon`,
 * P2-3402) and PROGRAMS (in-memory filter). See this folder's CLAUDE.md for the traps.
 */
@Component({
  selector: 'app-global-search-palette',
  standalone: true,
  imports: [...HlmDialogImports, ...BrnCommandImports, ...HlmNativeSelectImports, NgIcon],
  providers: [GlobalSearchPaletteService, provideIcons({ lucideSearch })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-search-palette.component.html'
})
export class GlobalSearchPaletteComponent {
  private readonly router = inject(Router);
  readonly search = inject(GlobalSearchPaletteService);

  readonly open = signal(false);
  protected readonly listId = 'pr-palette-list';
  protected readonly resultsHeadingId = 'pr-palette-results-heading';
  protected readonly programsHeadingId = 'pr-palette-programs-heading';

  private readonly command = viewChild(BrnCommand);

  /**
   * `brnCommand`'s built-in filter matches its `search` model against each item's `value`. Our rows
   * are already filtered — the server for Results, a computed for Programs — so leaving it on would
   * DOUBLE-filter and silently drop legitimate server hits whose `value` (a stable id) never
   * contains the typed text. We neutralise it and own visibility with `@for`.
   *
   * ⚠️ The corollary is that we must NOT render misses at all: Brain's key manager skips on
   * `item.disabled || !item.visible()`, and `visible()` is only this filter's return value — so a
   * row hidden with CSS would still be reachable with the arrow keys.
   */
  protected readonly alwaysVisible = () => true;

  /** The active option's accessible name, mirrored into a live region for VoiceOver. */
  protected readonly activeLabel = signal('');

  constructor() {
    // Brain keeps DOM focus on the input and tracks the active row with aria-activedescendant.
    // VoiceOver + Safari is historically unreliable at announcing those changes, so the active
    // option's name is mirrored into one polite live region — on ACTIVE-ROW change only, never per
    // keystroke, which would be chatty and would double-speak the group name.
    effect((onCleanup) => {
      const cmd = this.command();
      if (!cmd) return;
      const sub = cmd.keyManager.change.subscribe(() => {
        const active = cmd.keyManager.activeItem;
        this.activeLabel.set(active ? this.labelForValue(active.value()) : '');
      });
      onCleanup(() => sub.unsubscribe());
    });

    // The design draws the FIRST row highlighted, and Enter must work without pressing ↓ first.
    // Brain's key manager starts with no active item and only activates on a key press, so the
    // first row is activated here whenever the rendered set changes (new query, new scope, opened).
    // Reading the row fingerprint is what makes this re-run; the activation itself is untracked so
    // it cannot feed back into the effect.
    effect(() => {
      const fingerprint = this.rowsFingerprint();
      const cmd = this.command();
      if (!cmd) return;

      untracked(() => {
        if (!fingerprint) {
          this.activeLabel.set('');
          return;
        }
        // Deferred one turn: `contentChildren` for the new rows have not been collected yet at the
        // moment this effect runs, so activating now would target the OLD first row.
        queueMicrotask(() => {
          if (!this.open()) return;
          cmd.keyManager.setFirstItemActive();
          const active = cmd.keyManager.activeItem;
          this.activeLabel.set(active ? this.labelForValue(active.value()) : '');
        });
      });
    });
  }

  /** Changes whenever the rendered row set changes — the trigger for re-activating the first row. */
  private readonly rowsFingerprint = computed(() =>
    [
      ...this.search.resultRows().map((r) => this.resultValue(r)),
      ...this.search.programHits().map((p) => this.programValue(p))
    ].join('|')
  );

  private labelForValue(value: string): string {
    const result = this.search.resultRows().find((r) => this.resultValue(r) === value);
    if (result) return this.resultAriaLabel(result);
    const program = this.search.programHits().find((p) => this.programValue(p) === value);
    return program ? this.programAriaLabel(program) : '';
  }

  // ── open / close ───────────────────────────────────────────────────────────────────────────────

  openPalette(): void {
    this.search.reset();
    this.activeLabel.set('');
    this.open.set(true);
  }

  closePalette(): void {
    this.open.set(false);
  }

  toggle(): void {
    this.open() ? this.closePalette() : this.openPalette();
  }

  /** `hlm-dialog` reports its own closes (Esc, backdrop) — keep our signal in step with them. */
  protected onDialogState(state: 'open' | 'closed'): void {
    if (state === 'closed' && this.open()) this.open.set(false);
  }

  // ── rows ───────────────────────────────────────────────────────────────────────────────────────

  /** Stable ids, never the title: activation routes by id and the value is not the accessible name. */
  resultValue(row: PaletteResultRow): string {
    return `result:${row.id}`;
  }
  programValue(row: PaletteProgramRow): string {
    return `program:${row.code}`;
  }

  statusFg(statusId: number): string {
    return STATUS_TOKENS[String(statusId)]?.fg ?? 'var(--pr-status-not-started-fg)';
  }
  statusBg(statusId: number): string {
    return STATUS_TOKENS[String(statusId)]?.bg ?? 'var(--pr-status-not-started-bg)';
  }
  dotColor(code: string): string {
    return programDotColor(code);
  }

  /**
   * Title FIRST: the code and status lead visually but the title is what the user is hunting.
   * Parts are trimmed because some programme names come back with trailing whitespace, which would
   * otherwise be read as "Sustainable Farming , SP02".
   */
  resultAriaLabel(row: PaletteResultRow): string {
    return [row.title, row.submitterCode, row.statusName].map((p) => p?.trim()).filter(Boolean).join(', ');
  }
  programAriaLabel(row: PaletteProgramRow): string {
    return [row.name, row.code].map((p) => p?.trim()).filter(Boolean).join(', ');
  }

  readonly resultsCount = computed(() => this.search.resultRows().length);
  readonly programsCount = computed(() => this.search.programHits().length);

  // ── activation ─────────────────────────────────────────────────────────────────────────────────

  openResult(row: PaletteResultRow): void {
    this.closePalette();
    this.router.navigate(['/result', 'result-detail', row.code, 'general-information'], {
      queryParams: { phase: row.versionId }
    });
  }

  openProgram(row: PaletteProgramRow): void {
    this.closePalette();
    this.router.navigate(['/result-framework-reporting', 'entity-details', row.code, 'overview']);
  }

  /**
   * `hlm-native-select` takes a string. `null` (All programs) maps to the empty option's value.
   * Built here rather than in the template because Angular templates have no `String()`.
   */
  protected readonly scopeValue = computed(() => {
    const s = this.search.scope();
    return s === null ? '' : String(s);
  });

  protected onScopeChange(value: string): void {
    this.search.scope.set(value ? Number(value) : null);
  }
}
