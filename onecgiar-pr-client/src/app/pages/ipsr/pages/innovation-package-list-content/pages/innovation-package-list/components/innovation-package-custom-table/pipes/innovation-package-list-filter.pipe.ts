import { Pipe, PipeTransform } from '@angular/core';
import { IpsrListFilterService } from '../../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../../services/ipsr-list.service';

@Pipe({
    name: 'innovationPackageListFilter',
    pure: false,
    standalone: false
})
export class InnovationPackageListFilterPipe implements PipeTransform {
  constructor(public ipsrListService: IpsrListService, public ipsrListFilterSE: IpsrListFilterService) {}
  transform(list, word: string) {
    return this.combineRepeatedResults(
      this.filterByPortfolio(this.filterByStatus(this.filterByInits(this.filterByText(this.filterByPhase(list), word))))
    );
  }

  filterByText(list, word) {
    return list.filter((item: any) => (item?.full_name ? item?.full_name.toUpperCase().indexOf(word?.toUpperCase()) > -1 : false));
  }

  /**
   * Program (initiative) facet — primary filter row, re-pointed at `IpsrListFilterService.selectedPrograms()`
   * (`IPSR-T-1`) instead of the removed `filters.general[0].options` chip-array. Empty selection = unfiltered
   * (`IPSR-DD-4`).
   */
  filterByInits(list) {
    const selectedPrograms = this.ipsrListFilterSE.selectedPrograms();
    if (!selectedPrograms?.length) return list;
    return list.filter(item => selectedPrograms.some(program => program?.official_code === item?.official_code));
  }

  /**
   * Phase facet — primary filter row, re-pointed at `IpsrListFilterService.selectedPhases()` (`IPSR-T-1`)
   * instead of the removed `filters.general[1].options` chip-array. Each selected phase option's `attr`
   * (the label `buildIpsrPhaseOptions()` derives) is matched against the row's `phase_name`, mirroring the
   * previous `filter.attr == result.phase_name` comparison. Empty selection = unfiltered (`IPSR-DD-4`).
   */
  filterByPhase(list) {
    const selectedPhases = this.ipsrListFilterSE.selectedPhases();
    if (!selectedPhases?.length) return list;
    return list.filter(item => selectedPhases.some(phase => phase?.attr === item?.phase_name));
  }

  /**
   * Package status facet (`IPSR-R-3`). `selectedStatus()` holds plain status strings (`statusOptions()`
   * is a `string[]`, unlike Program/Phase's option-object arrays) — matched directly against the row's
   * `status` field. Empty selection = unfiltered (`IPSR-DD-4`).
   */
  filterByStatus(list) {
    const selectedStatus = this.ipsrListFilterSE.selectedStatus();
    if (!selectedStatus?.length) return list;
    return list.filter(item => selectedStatus.includes(item?.status));
  }

  /**
   * Portfolio facet — "More filters" popover (`IPSR-R-10`/`IPSR-DD-3`). `selectedPortfolios()` holds
   * `GET_ClarisaPortfolios()` rows (`{ id, ... }`), matched against the row's `portfolio_id`
   * (`ci.portfolio_id` in `IpsrRepository.getAllInnovationPackages`, a confirmed `int` column —
   * hence the strict `===`), mirroring Results Center's own `filterByClarisaPortfolios`
   * (`clarisaPortfolio.id == result.portfolio_id`). Empty selection = unfiltered (`IPSR-DD-4`).
   */
  filterByPortfolio(list) {
    const selectedPortfolios = this.ipsrListFilterSE.selectedPortfolios();
    if (!selectedPortfolios?.length) return list;
    return list.filter(item => selectedPortfolios.some(portfolio => portfolio?.id === item?.portfolio_id));
  }

  combineRepeatedResults(results) {
    const uniqueResults = [];

    results.forEach(result => {
      if (!uniqueResults.find(r => r.result_code === result.result_code)) {
        result.results = results.filter(r => r.result_code === result.result_code);
        result.results.sort((a, b) => a.phase_year - b.phase_year);
        uniqueResults.push(result);
      }
    });

    return uniqueResults;
  }
}
