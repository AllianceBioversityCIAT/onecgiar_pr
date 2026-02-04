import { Injectable } from '@angular/core';
import { ApiService } from '../../../shared/services/api/api.service';
import { IpsrDataControlService } from './ipsr-data-control.service';
import { FieldsManagerService } from '../../../shared/services/fields-manager.service';
@Injectable({
  providedIn: 'root'
})
export class IpsrCompletenessStatusService {
  flatList = {};

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
    });
  }
}
