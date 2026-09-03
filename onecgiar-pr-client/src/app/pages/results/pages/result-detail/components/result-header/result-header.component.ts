import { ChangeDetectionStrategy, Component, DoCheck, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { PdfExportService } from '../../../../../../shared/services/pdf-export.service';
import { ResultMetadataPanelService } from '../../../../../../shared/components/result-metadata/result-metadata-panel.service';

interface MetaRow {
  label: string;
  value: string;
  /** Sin dato disponible todavía: la fila se muestra con la etiqueta `Coming soon`. */
  pending?: boolean;
}

/** Owning Area of Work resolved from the primary / first planned submitter ToC mapping. */
interface AowMapping {
  code: string;
  name: string;
  /** Set only when exactly one contributing indicator id is known for that row (RIBL-R-10). */
  kpi: string | null;
}

/**
 * Program-level ToC buckets — never a real Area of Work. Mirrors `INTERMEDIATE_OUTCOMES_CODE` /
 * `OUTCOMES_2030_CODE` in `dashboard-lab.component.ts` (duplicated, not imported, to avoid a
 * cross-feature dependency for two string literals).
 * @akili-spec changes/result-indicator-back-link
 */
const AOW_SENTINEL_CODES = new Set(['intermediate-outcomes', '2030-outcomes', 'intermediate outcomes', '2030 outcomes']);

/** `work_package_id` only counts as a WP field when it looks like a stored program-unit code
 *  (e.g. `AOW01`, `SGP-02`) — not a raw numeric ToC id (design.md §5). */
function looksLikeAowCode(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return !!trimmed && !/^\d+$/.test(trimmed);
}

/** First non-empty WP field on a `result_toc_results[]` row, per design.md §5 field order. */
function resolveAowRowCode(row: any): string {
  if (typeof row?.work_package_code === 'string' && row.work_package_code.trim()) return row.work_package_code.trim();
  if (typeof row?.aow_code === 'string' && row.aow_code.trim()) return row.aow_code.trim();
  if (looksLikeAowCode(row?.work_package_id)) return String(row.work_package_id).trim();
  return '';
}

/**
 * Maps a `GET_ContributorsPartners` response to the owning Area of Work for the primary / first
 * planned **submitter** mapping (`result_toc_result.result_toc_results[]`) — never
 * `contributors_result_toc_result` (Center-contributor mappings, RIBL-R-1). Fail-soft: any
 * unexpected shape returns `null` (hide the control) rather than throwing or guessing a code from
 * the HLO title.
 * @akili-spec changes/result-indicator-back-link
 */
function mapAowFromContributorsPartners(resp: any): AowMapping | null {
  const tocResult = resp?.response?.result_toc_result;
  if (!tocResult || tocResult.planned_result === false) return null;

  const rows: any[] = Array.isArray(tocResult.result_toc_results) ? tocResult.result_toc_results : [];
  const row = rows.find(r => resolveAowRowCode(r));
  if (!row) return null;

  const code = resolveAowRowCode(row);
  if (AOW_SENTINEL_CODES.has(code.toLowerCase())) return null;

  const name = String(row?.work_package_name ?? row?.aow_name ?? '').trim();

  const ids = new Set<string>(
    (row?.indicators ?? [])
      .map((indicator: any) => indicator?.toc_results_indicator_id ?? indicator?.related_node_id)
      .filter((id: unknown) => id !== null && id !== undefined)
      .map((id: unknown) => String(id))
  );

  return { code, name, kpi: ids.size === 1 ? [...ids][0] : null };
}

/** Palette per `status_id`, from the status token pairs in `styles/colors.scss`. */
const STATUS_TOKENS: Record<string, { fg: string; bg: string }> = {
  1: { fg: 'var(--pr-status-in-progress-fg)', bg: 'var(--pr-status-in-progress-bg)' },
  2: { fg: 'var(--pr-status-approved-fg)', bg: 'var(--pr-status-approved-bg)' },
  3: { fg: 'var(--pr-status-submitted-fg)', bg: 'var(--pr-status-submitted-bg)' }
};

/**
 * Result-detail header: the way back, the result's title, the result-level actions (PDF export and
 * the ⋮ menu) and a one-line identity strip — code, category, level, funding and the status chip.
 *
 * Built from the approved mockup ("PRMS Reporting.dc.html", the `pageOpen` header). It replaces the
 * docked "RESULT METADATA" card: the same six fields now live behind the ⓘ next to the code, which
 * is what the mockup does, and the card that could be popped out of it stays reachable from inside
 * that popover.
 *
 * Change detection is DEFAULT, not OnPush, for the same reason `ResultMetadataListComponent`
 * documents: `dataControlSE.currentResult` and `api.resultsSE.currentResultCode` are plain
 * (non-signal) service fields, so an OnPush view would keep painting the previous result after a
 * switch.
 */
@Component({
  selector: 'app-result-header',
  templateUrl: './result-header.component.html',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.Default
})
export class ResultHeaderComponent implements DoCheck {
  readonly pdfSE = inject(PdfExportService);
  readonly metadataPanelSE = inject(ResultMetadataPanelService);
  private readonly api = inject(ApiService);
  private readonly dataControlSE = inject(DataControlService);
  private readonly rolesSE = inject(RolesService);
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);

  readonly metaOpen = signal(false);
  readonly actionsOpen = signal(false);

  /** Async owning-AOW mapping (RIBL-DD-1). `null` = not resolved / hidden. */
  private readonly aowMapping = signal<AowMapping | null>(null);
  /** Result id the mapping was fetched for — guards the "once per result id" GET (design.md §8). */
  private aowMappingLoadedFor: number | string | null = null;

  get title(): string {
    return this.dataControlSE.currentResult?.title ?? '';
  }

  get code(): string {
    return String(this.api.resultsSE.currentResultCode ?? '');
  }

  get category(): string {
    return this.dataControlSE.currentResult?.result_type_name ?? '';
  }

  get level(): string {
    return this.dataControlSE.currentResult?.result_level_name ?? '';
  }

  get funding(): string {
    return this.dataControlSE.currentResult?.source_name ?? '';
  }

  /** Stored `initiative_official_code`, trimmed. Never normalized (`SGP-02` stays `SGP-02`). */
  get officialCode(): string {
    return (this.dataControlSE.currentResult?.initiative_official_code ?? '').trim();
  }

  /**
   * Submitter value for the identity-strip link: `{code} - {name}`, or the code alone when the
   * result carries no name. Never fabricates a name.
   * @akili-spec changes/result-submitter-back-link
   */
  get submitterValue(): string {
    const name = (this.dataControlSE.currentResult?.initiative_name ?? '').trim();
    return name ? `${this.officialCode} - ${name}` : this.officialCode;
  }

  /**
   * Area of Work value for the identity-strip link: `{code} - {name}`, or the code alone when the
   * mapping carries no name. Empty when official code or owning AOW is missing / empty /
   * whitespace, unmapped, a program-level bucket, or the GET failed (RIBL-R-1, R-3).
   * @akili-spec changes/result-indicator-back-link
   */
  get aowValue(): string {
    const mapping = this.aowMapping();
    if (!mapping) return '';
    return mapping.name ? `${mapping.code} - ${mapping.name}` : mapping.code;
  }

  /** By AOW query params for the Area of Work link. `kpi` only when exactly one id is known. */
  get aowQueryParams(): Record<string, string> | null {
    const mapping = this.aowMapping();
    if (!mapping) return null;
    const params: Record<string, string> = { tocView: 'byAow', tocAow: mapping.code };
    if (mapping.kpi) params['kpi'] = mapping.kpi;
    return params;
  }

  get statusLabel(): string {
    return this.dataControlSE.currentResult?.status_name ?? '';
  }

  get statusFg(): string {
    return STATUS_TOKENS[String(this.dataControlSE.currentResult?.status_id)]?.fg ?? 'var(--pr-status-not-started-fg)';
  }

  get statusBg(): string {
    return STATUS_TOKENS[String(this.dataControlSE.currentResult?.status_id)]?.bg ?? 'var(--pr-status-not-started-bg)';
  }

  /**
   * Las filas que el mockup pone en este popover: Center, Phase, Portfolio, Origin, Created by.
   *
   * Ya NO repite Status / Level / Category / Funding: los cuatro están a la vista en la tira de
   * identidad, a un centímetro del ⓘ, y el mockup los saca de aquí justamente por eso. Code
   * tampoco, que es el texto al que este botón está pegado.
   *
   * Tres de las cinco no tienen dato en `GET /api/results/get/:id` y van marcadas `pending`:
   *  · Center — el payload trae la Science Program (`initiative_*`), que es otra cosa;
   *  · Origin — no existe ningún campo equivalente;
   *  · Created by — sólo llega `created_by` como id numérico, sin forma de resolver el nombre.
   * Se muestran igual, con la etiqueta `Coming soon`, porque esconderlas dejaría el popover
   * mintiendo por omisión sobre lo que la pantalla va a ofrecer.
   */
  get metaRows(): MetaRow[] {
    const result = this.dataControlSE.currentResult;
    const phase = result?.phase_name ?? '';
    const portfolio = result?.portfolio ?? '';
    return [
      { label: 'Center', value: '', pending: true },
      { label: 'Phase', value: [phase, portfolio].filter(Boolean).join(' - ') },
      // El acrónimo, que es el dato real. El mockup escribe el nombre largo ("CGIAR Portfolio
      // 2025-2030") y el payload no lo trae: inventar la cadena sería escribir contenido.
      { label: 'Portfolio', value: portfolio },
      { label: 'Origin', value: '', pending: true },
      { label: 'Created by', value: '', pending: true }
    ];
  }

  /**
   * "Change result type" is offered here only where it actually works: the modal it opens
   * (`app-change-result-type-modal`) is rendered by the General information section and needs that
   * section's form body, so the flag is inert anywhere else. Same role/phase gating the in-section
   * button carried.
   */
  get canChangeResultType(): boolean {
    return !this.rolesSE.readOnly && !!this.dataControlSE.currentResult?.is_phase_open && this.currentSection() === 'general-information';
  }

  /** Last path segment of the current route, without the query string. */
  private readonly currentSection = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.sectionFromUrl())
    ),
    { initialValue: this.sectionFromUrl() }
  );

  private sectionFromUrl(): string {
    return this.router.url.split('?')[0].split('/').filter(Boolean).pop() ?? '';
  }

  /**
   * Keeps the Area of Work mapping in sync with the loaded result. `dataControlSE.currentResult`
   * and `api.resultsSE.currentResultId` are plain fields (same reason this component runs Default
   * CD, not OnPush), so `ngDoCheck` — not an `effect()` — is what notices a result switch.
   * @akili-spec changes/result-indicator-back-link
   */
  ngDoCheck(): void {
    const resultId = this.api.resultsSE.currentResultId;
    if (!this.officialCode || resultId === null || resultId === undefined) {
      if (this.aowMapping() !== null) this.aowMapping.set(null);
      this.aowMappingLoadedFor = null;
      return;
    }
    if (this.aowMappingLoadedFor === resultId) return;
    this.aowMappingLoadedFor = resultId;
    this.api.resultsSE.GET_ContributorsPartners().subscribe({
      next: (resp: any) => this.aowMapping.set(mapAowFromContributorsPartners(resp)),
      // Fail-soft (RIBL-DD-1 / design.md §7): hide the control, no toast, no log.
      error: () => this.aowMapping.set(null)
    });
  }

  openChangeResultType(): void {
    this.dataControlSE.changeResultTypeModal = true;
    this.actionsOpen.set(false);
  }

  copyLink(): void {
    this.pdfSE.copy();
    this.actionsOpen.set(false);
  }

  toggleMeta(): void {
    this.metaOpen.update(v => !v);
  }

  toggleActions(): void {
    this.actionsOpen.update(v => !v);
  }

  popOutMetadata(): void {
    this.metadataPanelSE.open();
    this.metaOpen.set(false);
  }

  /** Any click outside a popover closes it — three of them share this one listener. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const host = this.elementRef.nativeElement as HTMLElement;
    const inside = (selector: string) => host.querySelector(selector)?.contains(event.target as Node);
    if (this.metaOpen() && !inside('[data-testid="result-header-meta-wrap"]')) this.metaOpen.set(false);
    if (this.actionsOpen() && !inside('[data-testid="result-header-actions-wrap"]')) this.actionsOpen.set(false);
    if (this.pdfSE.menuOpen() && !inside('[data-testid="result-header-pdf"]')) this.pdfSE.close();
  }
}
