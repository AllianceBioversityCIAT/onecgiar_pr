import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-center-report-stub',
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CenterReportStubComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.router.navigate(['/bilateral'], { replaceUrl: true });
  }
}
