import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-skeleton-notification-item',
    imports: [CommonModule],
    templateUrl: './skeleton-notification-item.component.html',
    styleUrl: './skeleton-notification-item.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonNotificationItemComponent {}
