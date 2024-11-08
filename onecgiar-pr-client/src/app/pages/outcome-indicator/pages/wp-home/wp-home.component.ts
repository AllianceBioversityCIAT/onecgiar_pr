import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-wp-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './wp-home.component.html',
  styleUrl: './wp-home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WpHomeComponent {}
