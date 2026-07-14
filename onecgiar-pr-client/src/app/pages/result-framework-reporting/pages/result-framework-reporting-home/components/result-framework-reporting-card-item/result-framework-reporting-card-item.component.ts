import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { SPProgress } from '../../../../../../shared/interfaces/SP-progress.interface';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-result-framework-reporting-card-item',
  imports: [RouterLink],
  templateUrl: './result-framework-reporting-card-item.component.html',
  styleUrl: './result-framework-reporting-card-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingCardItemComponent {
  @Input() item: SPProgress;
  imageLoadError = signal(false);
}
