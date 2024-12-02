import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appFilterIndicatorBySearch',
  standalone: true
})
export class FilterIndicatorBySearchPipe implements PipeTransform {
  transform(list: any[], searchFilter: string, isWPsTable: boolean = false): any[] {
    if (!Array.isArray(list)) return [];

    const searchUpper = searchFilter?.toUpperCase() || '';

    list.forEach(item => {
      item.joinAll = isWPsTable ? this.createJoinAllStringForWPsTable(item) : this.createJoinAllStringDefault(item);
      if (isWPsTable) {
        this.processIndicators(item, searchUpper);
      }
    });

    if (!searchFilter) {
      if (isWPsTable) {
        this.resetIndicators(list);
      }
      return list;
    }

    return isWPsTable ? this.filterWPsTable(list, searchUpper) : this.filterList(list, searchUpper);
  }

  private processIndicators(item: any, searchUpper: string): void {
    item.toc_results.forEach(result => {
      result.originalIndicators = result.originalIndicators || [...result.indicators];
      result.isVisible = this.isResultVisible(result, searchUpper);
      result.indicators.forEach(indicator => {
        indicator.isVisible = result.isVisible || this.isIndicatorVisible(indicator, searchUpper, result);
      });
    });
  }

  private isIndicatorVisible(indicator: any, searchUpper: string, result: any): boolean {
    return (
      !searchUpper ||
      indicator.indicator_description.toUpperCase().includes(searchUpper) ||
      result.toc_result_title.toUpperCase().includes(searchUpper)
    );
  }

  private isResultVisible(result: any, searchUpper: string): boolean {
    return result.toc_result_title.toUpperCase().includes(searchUpper);
  }

  private resetIndicators(list: any[]): void {
    list.forEach(item => {
      item.toc_results.forEach(result => {
        result.indicators = [...result.originalIndicators];
      });
    });
  }

  private filterWPsTable(list: any[], searchUpper: string): any[] {
    return list.filter(item => {
      const hasVisibleIndicators = item.toc_results.some(result => result.indicators.some(indicator => indicator.isVisible));
      if (hasVisibleIndicators) {
        item.toc_results.forEach(result => {
          result.indicators = result.indicators.filter(indicator => indicator.isVisible);
        });
        return true;
      }
      return item.joinAll.toUpperCase().includes(searchUpper);
    });
  }

  private filterList(list: any[], searchUpper: string): any[] {
    return list.filter(item => item.joinAll.toUpperCase().includes(searchUpper));
  }

  private createJoinAllStringForWPsTable(item: any): string {
    return this.createWPsTableString(item);
  }

  private createJoinAllStringDefault(item: any): string {
    return this.createDefaultString(item);
  }

  private createWPsTableString(item: any): string {
    return item.toc_results.map(result => result.toc_result_title).join(', ');
  }

  private createDefaultString(item: any): string {
    const indicator = item?.indicators?.[0] || {};
    const indicatorName = indicator.indicator_name || '';
    let indicatorType = '';

    if (indicatorName) {
      indicatorType = indicator.is_indicator_custom ? 'Custom -' : 'Standard -';
    }

    return `${item?.toc_result_title || ''} ${indicator.indicator_description || ''} ${indicatorType} ${indicatorName}`;
  }
}
