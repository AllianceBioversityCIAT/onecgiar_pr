import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../../../services/bilateral-context.service';
import { BilateralProject } from '../../../../services/bilateral-creation.interfaces';

@Component({
  selector: 'app-bilateral-projects-panel',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './bilateral-projects-panel.component.html',
  styleUrl: './bilateral-projects-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralProjectsPanelComponent implements OnInit {
  private readonly bilateralApiService = inject(BilateralApiService);
  readonly ctx = inject(BilateralContextService);

  readonly projects = signal<BilateralProject[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);

  ngOnInit(): void {
    const centerId = this.ctx.centerId();
    if (!centerId) return;

    this.loading.set(true);
    this.bilateralApiService.GET_bilateralProjects(centerId).subscribe({
      next: ({ response }) => {
        this.projects.set(response?.projects ?? response ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }
}
