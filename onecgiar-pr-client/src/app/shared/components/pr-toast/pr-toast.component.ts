import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject } from '@angular/core';
import { PrToastService, PrToastSeverity } from './pr-toast.service';

/**
 * app-pr-toast — PRMS toast host (PrimeNG p-toast replacement).
 * Renders the toasts pushed to PrToastService that match this host's `key`
 * (mirrors PrimeNG's per-key p-toast filtering). Fixed top-right, auto-stacked.
 *
 *   <app-pr-toast key="globalUserNotification"></app-pr-toast>
 */
@Component({
  selector: 'app-pr-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pr-toast.component.html',
  styleUrl: './pr-toast.component.scss'
})
export class PrToastComponent {
  private readonly svc = inject(PrToastService);

  /** Only show toasts added with this key (matches PrimeNG p-toast `key`). */
  @Input() key?: string;

  readonly visible = computed(() => this.svc.toasts().filter(t => (t.key ?? '') === (this.key ?? '')));

  private readonly icons: Record<PrToastSeverity, string> = {
    success: 'check_circle',
    info: 'info',
    warn: 'warning',
    error: 'error'
  };

  iconFor(severity: PrToastSeverity | undefined): string {
    return this.icons[severity ?? 'info'];
  }

  remove(id: number): void {
    this.svc.remove(id);
  }
}
