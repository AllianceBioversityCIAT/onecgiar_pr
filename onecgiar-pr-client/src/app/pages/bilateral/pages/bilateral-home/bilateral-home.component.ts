import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BilateralPageHeaderComponent } from '../../components/bilateral-page-header/bilateral-page-header.component';
import { BilateralProjectsPanelComponent } from './components/bilateral-projects-panel/bilateral-projects-panel.component';

@Component({
  selector: 'app-bilateral-home',
  standalone: true,
  imports: [BilateralPageHeaderComponent, BilateralProjectsPanelComponent],
  templateUrl: './bilateral-home.component.html',
  styleUrl: './bilateral-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralHomeComponent {}
