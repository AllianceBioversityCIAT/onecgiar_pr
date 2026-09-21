import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../../shared/services/api/api.service';
import { IpsrDataControlService } from './ipsr-data-control.service';
import { FieldsManagerService } from '../../../shared/services/fields-manager.service';
@Injectable({
  providedIn: 'root'
})
export class IpsrCompletenessStatusService {
  flatList = {};

  /**
   * P2-3748 — the green-check response, kept whole.
   *
   * It always named every failing tab and every failing step, and only `validResult` was read
   * from it: the one bit that greys out Submit. So the browser knew the package was blocked by
   * "Step 1" and showed the reporter a dead button with no explanation, while they walked the
   * four pathway screens hunting for the old "N alerts" chip.
   *
   * `flatList` stays exactly as it was — the tab green checks index into it by position
   * (`mainSection.0`, `ipsr-green-check.component.html:3`) and nothing here changes that.
   */
  readonly status = signal<IpsrCompletenessResponse | null>(null);

  constructor(private api: ApiService, private ipsrDataControlSE: IpsrDataControlService, private fieldsManagerSE: FieldsManagerService) {}
  flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (typeof obj[k] === 'object') {
        Object.assign(acc, this.flattenObject(obj[k], pre + k));
      } else if (k === 'validation') {
        acc[pre.slice(0, -1)] = Boolean(Number(obj[k]));
      }
      return acc;
    }, {});
  }

  updateGreenChecks(): any {
    this.api.resultsSE.getCompletenessStatus(this.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.ipsrDataControlSE.detailData.validResult = response?.validResult;
      this.flatList = this.flattenObject(response, '');
      this.status.set(response ?? null);
    });
  }
}

/** Shape of the green-check payload, as the validation module returns it. */
export interface IpsrCompletenessSubSection {
  subSection?: string;
  sectionName?: string;
  validation?: boolean | number;
}

export interface IpsrCompletenessSection {
  step?: number;
  sectionName?: string;
  validation?: boolean | number;
  stepSubSections?: IpsrCompletenessSubSection[];
}

export interface IpsrCompletenessResponse {
  validResult?: boolean | number;
  mainSection?: IpsrCompletenessSection[];
  stepSections?: IpsrCompletenessSection[];
}
