import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-entity-results-by-indicator-category-card',
  imports: [],
  templateUrl: './entity-results-by-indicator-category-card.component.html',
  styleUrl: './entity-results-by-indicator-category-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityResultsByIndicatorCategoryCardComponent {
  @Input() item: any;

  getIcon(indicatorType: number) {
    switch (indicatorType) {
      case 7:
        return 'pi pi-flag';
      case 6:
        return 'pi pi-book';
      case 5:
        return 'pi pi-users';
      case 2:
        return 'pi pi-sun';
      case 1:
        return 'pi pi-folder-open';
      default:
        return 'pi pi-folder';
    }
  }
}
