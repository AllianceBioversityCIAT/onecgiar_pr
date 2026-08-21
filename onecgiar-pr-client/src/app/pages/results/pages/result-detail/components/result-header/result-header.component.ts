import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
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
export class ResultHeaderComponent {
  readonly pdfSE = inject(PdfExportService);
  readonly metadataPanelSE = inject(ResultMetadataPanelService);
  private readonly api = inject(ApiService);
  private readonly dataControlSE = inject(DataControlService);
  private readonly rolesSE = inject(RolesService);
  private readonly elementRef = inject(ElementRef);
  private readonly router = inject(Router);

  readonly metaOpen = signal(false);
  readonly actionsOpen = signal(false);

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

  get statusLabel(): string {
    return this.dataControlSE.currentResult?.status_name ?? '';
  }

  get statusFg(): string {
    return STATUS_TOKENS[String(this.dataControlSE.currentResult?.status_id)]?.fg ?? 'var(--pr-status-not-started-fg)';
  }

  get statusBg(): string {
    return STATUS_TOKENS[String(this.dataControlSE.currentResult?.status_id)]?.bg ?? 'var(--pr-status-not-started-bg)';
  }

  /** The six fields the docked RESULT METADATA card used to show, unchanged. */
  get metaRows(): MetaRow[] {
    const result = this.dataControlSE.currentResult;
    const initiativeName = result?.initiative_name ? ` · ${result.initiative_name}` : '';
    return [
      { label: 'Code', value: this.code },
      { label: 'Status', value: result?.status_name ?? '' },
      { label: 'Level', value: result?.result_level_name ?? '' },
      { label: 'Category', value: result?.result_type_name ?? '' },
      { label: 'Submitter', value: `${result?.initiative_official_code ?? ''}${initiativeName}` },
      { label: 'Funding', value: result?.source_name ?? '' }
    ];
  }

  /**
   * "Change result type" is offered here only where it actually works: the modal it opens
   * (`app-change-result-type-modal`) is rendered by the General information section and needs that
   * section's form body, so the flag is inert anywhere else. Same role/phase gating the in-section
   * button carried.
   */
  get canChangeResultType(): boolean {
    return (
      !this.rolesSE.readOnly && !!this.dataControlSE.currentResult?.is_phase_open && this.currentSection() === 'general-information'
    );
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
