import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResultFrameworkReportingHomeService } from '../result-framework-reporting-home/services/result-framework-reporting-home.service';
import { SPProgress, Version } from '../../../../shared/interfaces/SP-progress.interface';

/**
 * DASHBOARD LAB (experimental) — route: /result-framework-reporting/dashboard-lab
 *
 * Isolated sandbox to explore a master–detail layout for the reporting home:
 * a left sidebar lists the user's Science Programs, the right panel shows the
 * selected program's dashboard. Consumes the REAL Science Programs API through
 * the existing home service (singleton), so no new endpoints are introduced.
 * Nothing here is wired into the production home yet.
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

  /** Currently selected program id; null → fall back to the first available. */
  readonly selectedId = signal<number | null>(null);
  /** Free-text filter for the sidebar list. */
  readonly query = signal<string>('');
  /** Program codes whose SP icon failed to load → render the fallback glyph. */
  readonly iconErrors = signal<Set<string>>(new Set());

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

  ngOnInit(): void {
    if (this.allPrograms().length === 0) {
      this.homeSE.getScienceProgramsProgress();
    }
  }

  select(sp: SPProgress): void {
    this.selectedId.set(sp.initiativeId);
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
}
