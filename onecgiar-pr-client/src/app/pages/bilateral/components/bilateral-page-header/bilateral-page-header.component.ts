import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BilateralContextService } from '../../services/bilateral-context.service';

@Component({
  selector: 'app-bilateral-page-header',
  standalone: true,
  imports: [],
  templateUrl: './bilateral-page-header.component.html',
  styleUrl: './bilateral-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralPageHeaderComponent {
  readonly ctx = inject(BilateralContextService);
}
