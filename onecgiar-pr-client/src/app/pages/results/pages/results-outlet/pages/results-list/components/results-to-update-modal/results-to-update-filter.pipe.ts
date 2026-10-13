import { Pipe, PipeTransform } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Pipe({
  name: 'resultsToUpdateFilter',
  standalone: false
})
export class ResultsToUpdateFilterPipe implements PipeTransform {
  constructor(private api: ApiService) {
    this.api.dataControlSE.getCurrentPhases().subscribe();
  }

  transform(list, word: string) {
    const isBilateralNonAvisa = (item: any): boolean => {
      if (item?.source_name !== 'W3/Bilaterals') return false;
      const code = item?.submitter ?? item?.initiative_official_code ?? '';
      return code !== 'SGP-02' && code !== 'SGP02';
    };
    const isP25 = this.api.dataControlSE?.reportingCurrentPhase?.portfolioAcronym === 'P25';

    const canShow = (item: any): boolean => {
      // Same rule as the row menu (results-list.component.ts onPressAction, P2-3229): a W3/Bilateral
      // result (AVISA SGP-02 excluded) is only carried forward by its lead centre, and only once Approved.
      if (isBilateralNonAvisa(item)) return this.api.canUpdateBilateral(item, this.api.dataControlSE.reportingCurrentPhase);
      if (isP25) return this.api.shouldShowUpdate(item, this.api.dataControlSE.reportingCurrentPhase);

      if (this.api.rolesSE.isAdmin) return true;
      return Boolean(item?.role_id);
    };

    list = list?.filter(
      (item: any) =>
        item.result_type_id != 6 && item.phase_year < this.api.dataControlSE.reportingCurrentPhase.phaseYear && !item?.phase_status && canShow(item)
    );
    if (!word) return list;
    if (!list?.length) return [];
    return list.filter((item: any) => (item?.joinAll ? item?.joinAll.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }
}
