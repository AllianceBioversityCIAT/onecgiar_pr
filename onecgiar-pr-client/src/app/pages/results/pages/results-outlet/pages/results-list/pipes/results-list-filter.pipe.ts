import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'resultsListFilter',
  standalone: false
})
export class ResultsListFilterPipe implements PipeTransform {
  list: any[];
  word: string;

  transform(
    resultList: any[],
    word: string,
    combine: boolean,
    selectedSubmitters: any[],
    selectedIndicatorCategories: any[],
    selectedStatus: any[],
    selectedClarisaPortfolios: any[],
    selectedFundingSource: any[],
    selectedLeadCenters: any[] = []
  ): any {
    return this.convertList(
      this.filterByLeadCenter(
        this.filterByFundingSource(
            this.filterBySubmitters(
              this.filterByIndicatorCategories(
                this.filterByClarisaPortfolios(this.filterByStatus(this.filterByText(resultList, word), selectedStatus), selectedClarisaPortfolios),
                selectedIndicatorCategories
              ),
              selectedSubmitters
            ),
          selectedFundingSource
        ),
        selectedLeadCenters
      ),
      combine
    );
  }

  filterByLeadCenter(resultList: any[], selectedLeadCenters: any[]) {
    if (!selectedLeadCenters?.length) return resultList;
    const matchCenter = (result: any) => {
      const leadCenter = result.lead_center ?? '';
      return selectedLeadCenters.some(
        (c: any) => c?.acronym === leadCenter || c?.code === leadCenter
      );
    };
    return resultList.filter(matchCenter);
  }

  filterByFundingSource(resultList: any[], selectedFundingSource: any[]) {
    if (!selectedFundingSource.length) return resultList;

    const resultsFilter = resultList.filter(result => selectedFundingSource.some(fundingSource => fundingSource.name == result.source_name));

    if (!resultsFilter.length && selectedFundingSource.length === 0) return resultList;

    return resultsFilter;
  }

  filterByClarisaPortfolios(resultList: any[], selectedClarisaPortfolios: any[]) {
    if (!selectedClarisaPortfolios.length) return resultList;

    const resultsFilter = resultList.filter(result => selectedClarisaPortfolios.some(clarisaPortfolio => clarisaPortfolio.id == result.portfolio_id));

    if (!resultsFilter.length && selectedClarisaPortfolios.length === 0) return resultList;

    return resultsFilter;
  }

  filterByStatus(resultList: any[], selectedStatus: any[]) {
    if (!selectedStatus.length) return resultList;

    const resultsFilter = resultList.filter(result => selectedStatus.some(status => status.status_id == result.status_id));

    if (!resultsFilter.length && selectedStatus.length === 0) return resultList;

    return resultsFilter;
  }

  filterByIndicatorCategories(resultList: any[], selectedIndicatorCategories: any[]) {
    if (!selectedIndicatorCategories.length) return resultList;

    const resultsFilter = resultList.filter(result =>
      selectedIndicatorCategories.some(
        indicatorCategory => indicatorCategory.resultLevelId == result.result_level_id && indicatorCategory.id == result.result_type_id
      )
    );

    if (!resultsFilter.length && selectedIndicatorCategories.length === 0) return resultList;

    return resultsFilter;
  }

  filterBySubmitters(resultList: any[], selectedSubmitters: any[]) {
    if (!selectedSubmitters.length) return resultList;

    const resultsFilter = resultList.filter(result => selectedSubmitters.some(submitter => submitter.official_code == result.submitter));

    if (!resultsFilter.length && selectedSubmitters.length === 0) return resultList;

    return resultsFilter;
  }

  filterByText(resultList: any[], word: string): any[] {
    if (!resultList?.length || !word?.trim()) {
      return resultList || [];
    }

    const searchTerm = word.trim().toUpperCase();
    const excludedFields = new Set(['created_date', 'id']);

    return resultList.filter(item => {
      const searchableText = Object.keys(item)
        .filter(attr => !excludedFields.has(attr))
        .map(attr => item[attr] || '')
        .join(' ')
        .toUpperCase();

      return searchableText.includes(searchTerm);
    });
  }

  convertList(results, combine) {
    return combine ? this.combineRepeatedResults(results) : this.separateResultInList(results);
  }

  separateResultInList(results) {
    results.forEach(result => {
      result.results = [result];
    });
    return results;
  }

  combineRepeatedResults(results) {
    const resultMap: Record<number, any> = {};

    results.forEach(result => {
      if (!resultMap[result.result_code]) {
        resultMap[result.result_code] = {
          result_code: result.result_code,
          submitter: result.submitter,
          results: []
        };
      }
      resultMap[result.result_code].results.push({
        ...result
      });
    });

    const transformedData = Object.values(resultMap);

    return transformedData;
  }
}
