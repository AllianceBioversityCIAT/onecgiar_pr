import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'app-skeleton-notification-item',
  standalone: true,
  imports: [CommonModule, SkeletonModule],
  templateUrl: './skeleton-notification-item.component.html',
  styleUrl: './skeleton-notification-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonNotificationItemComponent {}
