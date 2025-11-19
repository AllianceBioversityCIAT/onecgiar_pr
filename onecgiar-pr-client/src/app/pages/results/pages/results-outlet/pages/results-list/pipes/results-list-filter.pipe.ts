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
    selectedPhases: any[],
    selectedSubmitters: any[],
    selectedIndicatorCategories: any[],
    selectedStatus: any[],
    selectedClarisaPortfolios: any[]
  ): any {
    return this.convertList(
      this.filterByPhase(
        this.filterBySubmitters(
          this.filterByIndicatorCategories(
            this.filterByClarisaPortfolios(this.filterByStatus(this.filterByText(resultList, word), selectedStatus), selectedClarisaPortfolios),
            selectedIndicatorCategories
          ),
          selectedSubmitters
        ),
        selectedPhases
      ),

      combine
    );
  }

  filterByClarisaPortfolios(resultList: any[], selectedClarisaPortfolios: any[]) {
    if (!selectedClarisaPortfolios.length) return resultList;

    const resultsFilter = resultList.filter(result => selectedClarisaPortfolios.some(clarisaPortfolio => clarisaPortfolio.id == result.portfolio_id));

    if (!resultsFilter.length && selectedClarisaPortfolios.length === 0) return resultList;

    console.log(resultsFilter.length);

    console.log('retorna');
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

  filterByPhase(resultList: any[], selectedPhases: any[]) {
    if (!selectedPhases.length) return resultList;

    const resultsFilter = resultList.filter(result => selectedPhases.some(phase => phase.attr == result.phase_name));

    if (!resultsFilter.length && selectedPhases.length === 0) return resultList;

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
