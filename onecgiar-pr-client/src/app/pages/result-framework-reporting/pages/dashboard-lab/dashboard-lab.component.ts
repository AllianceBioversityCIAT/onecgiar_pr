import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress, Version } from '../../../../shared/interfaces/SP-progress.interface';
import { ApiService } from '../../../../shared/services/api/api.service';
import { Unit } from '../entity-details/interfaces/entity-details.interface';

/** Vibrant, high-contrast palette for the status charts (no pastels). */
const STATUS_COLOR: Record<number, string> = {
  1: '#f59e0b', // Editing — amber
  2: '#3b82f6', // QAed — blue
  3: '#22c55e', // Submitted — green
  4: '#ef4444', // Discontinued — red
  5: '#94a3b8' // Pending — slate
};
const STATUS_LABEL: Record<number, string> = {
  1: 'Editing',
  2: 'QAed',
  3: 'Submitted',
  4: 'Discontinued',
  5: 'Pending'
};
const STATUS_ORDER: Record<number, number> = { 2: 1, 3: 2, 5: 3, 1: 4, 4: 5 };
const REPORTED_STATUS_IDS = [2, 3];
const FALLBACK_ACCENT = '#f2660d';

interface StatusRow {
  statusId: number;
  label: string;
  count: number;
  color: string;
  order: number;
  /** Height share relative to the tallest bar (0–100). */
  barPct: number;
  /** Share of the total (0–100), for the stacked breakdown bar. */
  sharePct: number;
  /** Subtle top-lit gradient for the bar fill. */
  barGradient: string;
}

/** Accent palette derived from a program's icon dominant color. */
interface AccentTheme {
  solid: string;
  soft: string;
  gradient: string;
  glow: string;
  buttonShadow: string;
  cardShadow: string;
}

/**
 * DASHBOARD LAB (experimental) — route: /result-framework-reporting/dashboard-lab
 *
 * Isolated sandbox exploring a master–detail layout for the reporting home:
 * a premium left sidebar lists the Science Programs; the right panel is a bento
 * grid of metadata cards for the selected program. The accent color is derived
 * at runtime from each program's icon (dominant vibrant color). Consumes the
 * REAL Science Programs API through the existing home service — no new endpoints.
 */
@Component({
  selector: 'app-dashboard-lab',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-lab.component.html',
  styleUrls: ['./dashboard-lab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardLabComponent implements OnInit {
  readonly homeSE = inject(ResultFrameworkReportingHomeService);
  private readonly api = inject(ApiService);

  /** Currently selected program id; null → fall back to the first available. */
  readonly selectedId = signal<number | null>(null);
  /** Free-text filter for the sidebar list. */
  readonly query = signal<string>('');
  /** Program codes whose SP icon failed to load → render the fallback glyph. */
  readonly iconErrors = signal<Set<string>>(new Set());
  /** Dominant accent color extracted from each program's icon, keyed by code. */
  readonly accentColors = signal<Map<string, string>>(new Map());

  /** Areas of Work for the selected program (loaded on demand, cached by code). */
  readonly aows = signal<Unit[]>([]);
  readonly loadingAows = signal<boolean>(false);
  private readonly aowCache = new Map<string, Unit[]>();

  constructor() {
    // Load the selected program's Areas of Work whenever the selection changes.
    effect(() => {
      const code = this.selected()?.initiativeCode;
      if (code) this.loadAows(code);
      else this.aows.set([]);
    });
  }

  readonly myPrograms = computed(() => this.filter(this.homeSE.mySPsList()));
  readonly otherPrograms = computed(() => this.filter(this.homeSE.otherSPsList()));
  /** AVISA-type initiatives, partitioned out of the Science Programs by the home service. */
  readonly otherProjects = computed(() => this.filter(this.homeSE.otherProjectsList()));

  /** Sidebar groups (only the non-empty ones are rendered). */
  readonly groups = computed(() =>
    [
      { label: 'My programs', items: this.myPrograms() },
      { label: 'Other programs', items: this.otherPrograms() },
      { label: 'Other projects', items: this.otherProjects() }
    ].filter(group => group.items.length)
  );

  private readonly allPrograms = computed(() => [
    ...this.homeSE.mySPsList(),
    ...this.homeSE.otherSPsList(),
    ...this.homeSE.otherProjectsList()
  ]);

  readonly selected = computed<SPProgress | null>(() => {
    const list = this.allPrograms();
    const id = this.selectedId();
    if (id == null) return list[0] ?? null;
    return list.find(sp => sp.initiativeId === id) ?? list[0] ?? null;
  });

  /** Phase chip taken from the first program's latest version. */
  readonly phaseLabel = computed(() => {
    const v = this.latestVersion(this.allPrograms()[0]);
    return v ? `${v.phaseName} · ${v.phaseYear}` : '';
  });

  /** Ordered, colored status breakdown for the selected program's latest version. */
  readonly statusRows = computed<StatusRow[]>(() => {
    const statuses = this.latestVersion(this.selected())?.statuses ?? [];
    if (!statuses.length) return [];
    const max = Math.max(...statuses.map(s => s.count), 1);
    const total = statuses.reduce((acc, s) => acc + s.count, 0) || 1;
    return statuses
      .map(s => {
        const color = STATUS_COLOR[s.statusId] ?? '#94a3b8';
        return {
          statusId: s.statusId,
          label: STATUS_LABEL[s.statusId] ?? s.statusName,
          count: s.count,
          color,
          order: STATUS_ORDER[s.statusId] ?? 99,
          barPct: Math.round((s.count / max) * 100),
          sharePct: (s.count / total) * 100,
          barGradient: `linear-gradient(180deg, ${this.shade(color, 0.26)} 0%, ${color} 100%)`
        };
      })
      .sort((a, b) => a.order - b.order);
  });

  readonly selectedTotal = computed(() => {
    const sp = this.selected();
    return sp ? this.totalResults(sp) : 0;
  });

  /** % of results in a "reported" state (QAed / Submitted). */
  readonly submittedPct = computed(() => {
    const statuses = this.latestVersion(this.selected())?.statuses ?? [];
    const total = statuses.reduce((acc, s) => acc + s.count, 0);
    if (!total) return 0;
    const reported = statuses.filter(s => REPORTED_STATUS_IDS.includes(s.statusId)).reduce((acc, s) => acc + s.count, 0);
    return Math.round((reported / total) * 100);
  });

  /** Number of distinct status categories present. */
  readonly statusCategories = computed(() => this.statusRows().length);

  /** Aggregate stats over the selected program's Areas of Work. */
  readonly aowStats = computed(() => {
    const list = this.aows();
    if (!list.length) return { count: 0, avgProgress: 0, active: 0 };
    const sum = list.reduce((acc, u) => acc + (u.progress || 0), 0);
    const active = list.filter(u => (u.resultsCount?.editing || 0) + (u.resultsCount?.submitted || 0) > 0).length;
    return { count: list.length, avgProgress: Math.round(sum / list.length), active };
  });

  /** Accent hex for the selected program (icon-derived, orange fallback). */
  readonly accent = computed(() => {
    const sp = this.selected();
    return (sp && this.accentColors().get(sp.initiativeCode)) || FALLBACK_ACCENT;
  });

  /** Ready-to-bind accent surfaces derived from the current accent. */
  readonly accentTheme = computed<AccentTheme>(() => {
    const base = this.accent();
    return {
      solid: base,
      soft: this.rgba(base, 0.14),
      gradient: `linear-gradient(150deg, ${this.shade(base, 0.2)} 0%, ${this.shade(base, -0.14)} 100%)`,
      glow: `radial-gradient(58% 58% at 28% 18%, ${this.rgba(base, 0.42)} 0%, ${this.rgba(base, 0)} 72%)`,
      buttonShadow: `0 8px 20px ${this.rgba(base, 0.42)}`,
      cardShadow: `0 14px 30px ${this.rgba(base, 0.32)}`
    };
  });

  ngOnInit(): void {
    if (this.allPrograms().length === 0) {
      this.homeSE.getScienceProgramsProgress();
    }
  }

  select(sp: SPProgress): void {
    this.selectedId.set(sp.initiativeId);
  }

  /** Fetch (and cache) the Areas of Work for a program by its official code. */
  private loadAows(code: string): void {
    const cached = this.aowCache.get(code);
    if (cached) {
      this.aows.set(cached);
      this.loadingAows.set(false);
      return;
    }
    this.loadingAows.set(true);
    this.aows.set([]);
    this.api.resultsSE.GET_ClarisaGlobalUnits(code).subscribe({
      next: ({ response }) => {
        const units = response?.units ?? [];
        this.aowCache.set(code, units);
        if (this.selected()?.initiativeCode === code) {
          this.aows.set(units);
          this.loadingAows.set(false);
        }
      },
      error: () => {
        if (this.selected()?.initiativeCode === code) {
          this.aows.set([]);
          this.loadingAows.set(false);
        }
      }
    });
  }

  onQuery(value: string): void {
    this.query.set(value);
  }

  /** Per-program SP icon (same asset set used by the home cards). */
  iconSrc(sp: SPProgress): string {
    return `/assets/result-framework-reporting/SPs-Icons/${sp.initiativeCode}.png`;
  }

  onIconError(code: string): void {
    this.iconErrors.update(set => new Set(set).add(code));
  }

  /**
   * Extract the dominant *vibrant* color from a loaded icon and cache it by code.
   * Samples a 32×32 draw, drops near-white/near-black/low-saturation pixels, and
   * picks the color bucket with the highest saturation×mid-luminance weight.
   */
  extractAccent(event: Event, code: string): void {
    if (this.accentColors().has(code)) return;
    const img = event.target as HTMLImageElement;
    try {
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      const buckets = new Map<string, { r: number; g: number; b: number; w: number }>();
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 128) continue;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        if (lum > 0.92 || lum < 0.08 || sat < 0.25) continue;
        const weight = sat * (1 - Math.abs(lum - 0.5));
        const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
        const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, w: 0 };
        cur.r += r * weight;
        cur.g += g * weight;
        cur.b += b * weight;
        cur.w += weight;
        buckets.set(key, cur);
      }

      let best: { r: number; g: number; b: number; w: number } | null = null;
      for (const bucket of buckets.values()) if (!best || bucket.w > best.w) best = bucket;
      if (!best || best.w <= 0) return;

      const hex = this.toHex(best.r / best.w, best.g / best.w, best.b / best.w);
      this.accentColors.update(map => new Map(map).set(code, hex));
    } catch {
      // Tainted canvas / decode failure → keep the orange fallback.
    }
  }

  latestVersion(sp: SPProgress | null | undefined): Version | null {
    if (!sp?.versions?.length) return null;
    return sp.versions.reduce((latest, v) => (v.phaseYear > latest.phaseYear ? v : latest), sp.versions[0]);
  }

  totalResults(sp: SPProgress): number {
    return this.latestVersion(sp)?.totalResults ?? sp.totalResults ?? 0;
  }

  isActive(sp: SPProgress): boolean {
    return this.selected()?.initiativeId === sp.initiativeId;
  }

  private filter(list: SPProgress[]): SPProgress[] {
    const q = this.query().trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      sp =>
        sp.initiativeCode?.toLowerCase().includes(q) ||
        sp.initiativeName?.toLowerCase().includes(q) ||
        sp.initiativeShortName?.toLowerCase().includes(q)
    );
  }

  /** Blend a hex toward white (pct>0) or black (pct<0). */
  private shade(hex: string, pct: number): string {
    const n = parseInt(hex.slice(1), 16);
    const target = pct < 0 ? 0 : 255;
    const p = Math.abs(pct);
    const r = (target - ((n >> 16) & 255)) * p + ((n >> 16) & 255);
    const g = (target - ((n >> 8) & 255)) * p + ((n >> 8) & 255);
    const b = (target - (n & 255)) * p + (n & 255);
    return this.toHex(r, g, b);
  }

  private rgba(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  private toHex(r: number, g: number, b: number): string {
    const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
    return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
  }
}
