import { Component, Input } from '@angular/core';
import { ApiService } from '../../services/api/api.service';
import { DataControlService } from '../../services/data-control.service';

export interface ResultMetadataRow {
  label: string;
  value: string;
}

/**
 * The six RESULT METADATA fields, rendered once and reused in both places they appear: docked in
 * the result-detail header and inside the floating card. Purely presentational — it owns no state
 * and issues no request; the values already come from state the detail page fetches today
 * (`CurrentResultService.GET_resultById` → `DataControlService.currentResult`, and
 * `api.resultsSE.currentResultCode`, set by `ResultDetailComponent.getData()`).
 *
 * Change detection is deliberately DEFAULT: both sources are plain (non-signal) service fields, so
 * an OnPush view would render the previous result's metadata after a switch and never repaint.
 */
@Component({
  selector: 'app-result-metadata-list',
  standalone: true,
  templateUrl: './result-metadata-list.component.html'
})
export class ResultMetadataListComponent {
  /** `inline` wraps the pairs across the content column; `stacked` is the narrow card layout. */
  @Input() orientation: 'inline' | 'stacked' = 'inline';

  constructor(
    public readonly api: ApiService,
    public readonly dataControlSE: DataControlService
  ) {}

  get listClass(): string {
    return this.orientation === 'stacked'
      ? 'm-0 flex flex-col gap-[4px]'
      : 'm-0 flex flex-wrap items-baseline gap-x-[20px] gap-y-[6px]';
  }

  get rowClass(): string {
    return this.orientation === 'stacked'
      ? 'flex items-baseline justify-between gap-[8px] text-[10px]'
      : 'flex items-baseline gap-[6px] text-[10px]';
  }

  /**
   * The exact six bindings the sidebar footer used to carry — moved, not re-derived, so the card
   * keeps reading the same fields it always did.
   */
  get rows(): ResultMetadataRow[] {
    const result = this.dataControlSE.currentResult;
    const initiativeName = result?.initiative_name ? ` · ${result.initiative_name}` : '';
    return [
      // `currentResultCode` is typed `string | number` — coerced here so the row type stays simple.
      { label: 'Code', value: String(this.api.resultsSE.currentResultCode ?? '') },
      { label: 'Status', value: result?.status_name ?? '' },
      { label: 'Level', value: result?.result_level_name ?? '' },
      { label: 'Category', value: result?.result_type_name ?? '' },
      { label: 'Submitter', value: `${result?.initiative_official_code ?? ''}${initiativeName}` },
      { label: 'Funding', value: result?.source_name ?? '' }
    ];
  }
}
