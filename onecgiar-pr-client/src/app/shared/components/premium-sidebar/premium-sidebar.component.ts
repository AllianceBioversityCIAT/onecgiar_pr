import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * A single navigation entry rendered by {@link PremiumSidebarComponent}.
 * Mirrors the shape already used by the admin section shells.
 */
export interface PremiumSidebarOption {
  /** Visible label. */
  name: string;
  /** material-icons-round glyph name (optional). */
  icon?: string;
  /** Router link target. */
  path: string;
  /** Shows the work-in-progress badge when truthy. */
  underConstruction?: boolean | number;
}

/**
 * Reusable "command console" sidebar — the premium dark surface first introduced
 * for Result Detail (fixed full-height column, indigo glow, raised active item).
 *
 * It is purely presentational: pass an `eyebrow`, a `title` and the `options` to
 * render. It reserves the left column via `position: fixed`, so the host shell
 * must leave a matching `margin-left` on its content AND the route must declare
 * `data: { sidebar: { width: 300 } }` so the global navbar shifts to its right.
 */
@Component({
  selector: 'app-premium-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './premium-sidebar.component.html',
  styleUrls: ['./premium-sidebar.component.scss']
})
export class PremiumSidebarComponent {
  /** Small uppercase label above the title (e.g. "Administration"). */
  readonly eyebrow = input<string>('');
  /** Large sidebar heading (e.g. "Admin module"). */
  readonly title = input<string>('');
  /** Navigation entries. */
  readonly options = input<PremiumSidebarOption[]>([]);
}
