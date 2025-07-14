import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
    selector: 'app-whats-new-page-details-loading',
    imports: [SkeletonModule],
    templateUrl: './whats-new-page-details-loading.component.html',
    styleUrls: ['../../whats-new-page-details.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatsNewPageDetailsLoadingComponent {}
