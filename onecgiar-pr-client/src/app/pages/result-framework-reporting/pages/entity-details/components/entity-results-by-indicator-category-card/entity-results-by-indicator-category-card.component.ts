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
      case 1:
        return 'pi pi-flag';
      case 2:
        return 'pi pi-book';
      case 3:
        return 'pi pi-users';
      case 4:
        return 'pi pi-sun';
      case 5:
        return 'pi pi-folder-open';
      default:
        return 'pi pi-folder';
    }
  }
}
