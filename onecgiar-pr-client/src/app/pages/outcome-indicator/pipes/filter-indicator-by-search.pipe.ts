import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appFilterIndicatorBySearch',
  standalone: true
})
export class FilterIndicatorBySearchPipe implements PipeTransform {
  transform(list, searchFilter: string, isWPsTable: boolean = false): any[] {
    if (!searchFilter) {
      return list;
    }

    list.forEach(item => {
      item.joinAll = this.createJoinAllString(item, isWPsTable).trim();
    });

    return list.filter(item => item.joinAll.toUpperCase().includes(searchFilter.toUpperCase()));
  }

  private createJoinAllString(item, isWPsTable): string {
    return this.createDefaultString(item, isWPsTable);
  }

  private createDefaultString(item, isWPsTable): string {
    if (isWPsTable) {
      return `${item?.workpackage_name ?? ''}`;
    }

    return `${item?.toc_result_description ?? ''} ${item?.indicators?.[0]?.indicator_description ?? ''} ${!item?.indicators?.[0]?.indicator_name ? '' : item?.indicators?.[0]?.is_indicator_custom ? 'Custom -' : 'Standard -'} ${item?.indicators?.[0]?.indicator_name ?? ''}`;
  }
}
