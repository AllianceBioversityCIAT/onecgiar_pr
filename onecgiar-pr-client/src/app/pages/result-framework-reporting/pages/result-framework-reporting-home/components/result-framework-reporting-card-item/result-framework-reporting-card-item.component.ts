import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';
import { SPProgress } from '../../../../../../shared/interfaces/SP-progress.interface';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-result-framework-reporting-card-item',
  imports: [ProgressBarModule, RouterLink],
  templateUrl: './result-framework-reporting-card-item.component.html',
  styleUrl: './result-framework-reporting-card-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultFrameworkReportingCardItemComponent {
  @Input() item: SPProgress;
}
