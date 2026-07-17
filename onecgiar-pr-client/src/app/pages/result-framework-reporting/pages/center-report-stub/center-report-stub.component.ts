import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-center-report-stub',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="mx-auto flex max-w-[720px] flex-col items-start gap-4 px-8 py-12">
      <div class="flex size-10 items-center justify-center rounded-xl bg-brand-25" aria-hidden="true">
        <i class="material-icons-round text-[22px] text-brand-400">corporate_fare</i>
      </div>
      <h1 class="m-0 text-xl font-bold text-[var(--pr-color-secondary-400)]">Center reporting</h1>
      <p class="m-0 text-sm leading-relaxed text-[var(--pr-color-accents-6)]">
        Reporting for center <strong class="font-semibold text-[var(--pr-color-secondary-400)]">{{ centerCode }}</strong> will be available in a
        future release.
      </p>
      <a
        class="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-25 px-3 py-1.5 text-xs font-semibold text-brand-400 no-underline transition-colors hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
        routerLink="/result-framework-reporting/home">
        <i class="material-icons-round text-[15px]" aria-hidden="true">arrow_back</i>
        Back to home
      </a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CenterReportStubComponent {
  private readonly route = inject(ActivatedRoute);

  centerCode = this.route.snapshot.paramMap.get('centerCode') ?? '';
}
