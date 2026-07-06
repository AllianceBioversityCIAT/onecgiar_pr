import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-center-report-stub',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="center-report-stub">
      <h1>Center reporting</h1>
      <p>Reporting for center <strong>{{ centerCode }}</strong> will be available in a future release.</p>
      <a routerLink="/result-framework-reporting/home">Back to home</a>
    </div>
  `,
  styles: [
    `
      .center-report-stub {
        padding: 40px;
        max-width: 720px;
        margin: 0 auto;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CenterReportStubComponent {
  private readonly route = inject(ActivatedRoute);

  centerCode = this.route.snapshot.paramMap.get('centerCode') ?? '';
}
