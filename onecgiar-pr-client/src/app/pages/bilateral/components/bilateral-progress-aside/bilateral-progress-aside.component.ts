import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  model,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { fromEvent, merge } from 'rxjs';
import { BilateralMdsTrackerService, MdsFieldItem, MdsSectionStatus } from '../../services/bilateral-mds-tracker.service';
import { MdsProgressRingComponent } from '../mds-progress-ring/mds-progress-ring.component';

const GROUP_LABELS: Record<string, string> = {
  partners: 'Partners',
  toc: 'Theory of Change',
};

const DESKTOP_MIN_WIDTH = 1400;
const ASIDE_BOTTOM_GAP = 28;
const NAVBAR_FALLBACK_HEIGHT = 80;
const NAVBAR_EXTRA_GAP = 12;

@Component({
  selector: 'app-bilateral-progress-aside',
  imports: [CommonModule, MdsProgressRingComponent],
  templateUrl: './bilateral-progress-aside.component.html',
  styleUrl: './bilateral-progress-aside.component.scss',
})
export class BilateralProgressAsideComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly mdsTracker = inject(BilateralMdsTrackerService);

  /** Two-way: which accordion is open. */
  openSectionName = model<string | null>(null);
  drawerOpen = signal(false);

  /** Desktop fixed top — synced to section-zero so tops stay aligned. */
  asideTopPx = signal(140);

  readonly asideMaxHeight = computed(
    () => `calc(100vh - ${this.asideTopPx() + ASIDE_BOTTOM_GAP}px)`,
  );

  readonly sectionStatuses = this.mdsTracker.sectionStatus;
  readonly overallPct = this.mdsTracker.overallPercentage;
  readonly overallStatus = this.mdsTracker.overallStatus;

  readonly activeSection = computed<MdsSectionStatus | null>(() => {
    const open = this.openSectionName();
    const statuses = this.sectionStatuses();
    if (open) {
      return statuses.find(s => s.sectionName === open) ?? statuses[0] ?? null;
    }
    return statuses[0] ?? null;
  });

  readonly activeFieldGroups = computed(() => {
    const fields = this.activeSection()?.fields ?? [];
    const groups = new Map<string | undefined, MdsFieldItem[]>();
    for (const field of fields) {
      const key = field.group;
      const list = groups.get(key) ?? [];
      list.push(field);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([group, items]) => ({
      group,
      label: group ? (GROUP_LABELS[group] ?? group) : null,
      items,
    }));
  });

  constructor() {
    afterNextRender(() => {
      this.syncAsideTop();
      merge(
        fromEvent(window, 'scroll', { passive: true }),
        fromEvent(window, 'resize', { passive: true }),
      )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.syncAsideTop());
    });
  }

  syncAsideTop(): void {
    if (typeof window === 'undefined' || window.innerWidth < DESKTOP_MIN_WIDTH) {
      return;
    }
    const zero = document.getElementById('bcr-section-zero');
    if (!zero) return;
    const minTop = this.getNavbarClearancePx();
    // Match section-zero while visible; never climb above the sticky navbar.
    const top = Math.round(zero.getBoundingClientRect().top);
    this.asideTopPx.set(Math.max(minTop, top));
  }

  /** Sticky header height + gap — aside must stay below `app-header-panel`. */
  getNavbarClearancePx(): number {
    const navbar =
      document.querySelector('app-header-panel') ||
      document.querySelector('.header_panel_container');
    const height = navbar?.getBoundingClientRect().height ?? NAVBAR_FALLBACK_HEIGHT;
    return Math.round(height + NAVBAR_EXTRA_GAP);
  }

  selectSection(sectionName: string): void {
    this.openSectionName.set(sectionName);
    this.drawerOpen.set(false);
    setTimeout(() => {
      const el = document.querySelector(`[data-section="${sectionName}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  toggleDrawer(): void {
    this.drawerOpen.update(v => !v);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  trackSection(_index: number, s: MdsSectionStatus): string {
    return s.sectionName;
  }
}
