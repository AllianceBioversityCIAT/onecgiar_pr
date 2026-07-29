import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { BilateralProjectsPanelComponent } from './components/bilateral-projects-panel/bilateral-projects-panel.component';

@Component({
  selector: 'app-bilateral-home',
  standalone: true,
  imports: [RouterModule, BilateralPageHeaderComponent, BilateralProjectsPanelComponent],
  templateUrl: './bilateral-home.component.html',
  styleUrl: './bilateral-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralHomeComponent {
  readonly bilateralAiService = inject(BilateralAiService);
  readonly ctx = inject(BilateralContextService);
}
