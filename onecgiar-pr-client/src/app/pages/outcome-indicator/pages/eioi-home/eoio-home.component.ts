import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-eioi-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './eoio-home.component.html',
  styleUrl: './eoio-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EoioHomeComponent {}
