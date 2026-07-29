import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';

@Component({
  selector: 'app-bilateral-home',
  standalone: true,
  imports: [RouterModule, BilateralPageHeaderComponent],
  templateUrl: './bilateral-home.component.html',
  styleUrl: './bilateral-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralHomeComponent {
  readonly bilateralAiService = inject(BilateralAiService);
}
