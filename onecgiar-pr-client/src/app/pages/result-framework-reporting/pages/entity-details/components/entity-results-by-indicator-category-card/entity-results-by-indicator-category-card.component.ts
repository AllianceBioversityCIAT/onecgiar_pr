import { ChangeDetectionStrategy, Component, Input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-entity-results-by-indicator-category-card',
  imports: [ButtonModule],
  templateUrl: './entity-results-by-indicator-category-card.component.html',
  styleUrl: './entity-results-by-indicator-category-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityResultsByIndicatorCategoryCardComponent {
  @Input() item: any;
  readonly reportRequested = output<void>();

  onReportClick(): void {
    this.reportRequested.emit();
  }

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
