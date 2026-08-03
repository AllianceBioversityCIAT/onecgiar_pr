import { Component, inject, computed, signal, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BilateralCreationService } from '../../services/bilateral-creation.service';

@Component({
  selector: 'app-bilateral-sp-selector',
  imports: [CommonModule],
  templateUrl: './bilateral-sp-selector.component.html',
  styleUrl: './bilateral-sp-selector.component.scss'
})
export class BilateralSpSelectorComponent {
  readonly creationService = inject(BilateralCreationService);

  showPrimaryDropdown = signal(false);
  showSecondaryDropdown = signal(false);
  primarySelected = output<void>();

  availableSps = computed(() => this.creationService.selectedProject()?.sciencePrograms ?? []);

  availableSecondarySps = computed(() =>
    this.availableSps().filter(s => s.programId !== this.creationService.selectedPrimarySp()?.programId)
  );

  selectedPrimaryLabel = computed(() => {
    const sp = this.creationService.selectedPrimarySp();
    if (!sp) return 'Select primary SP';
    const spData = this.availableSps().find(s => s.programId === sp.programId);
    const pct = spData?.allocation ? ` (${this.formatAllocation(spData.allocation)}%)` : '';
    return `${sp.programCode} — ${spData?.spShortName ?? ''}${pct}`;
  });

  selectedPrimaryIcon = computed(() => {
    const sp = this.creationService.selectedPrimarySp();
    if (!sp) return null;
    return `assets/result-framework-reporting/SPs-Icons/${sp.programCode}.png`;
  });

  spIconSrc(programCode: string): string {
    return `assets/result-framework-reporting/SPs-Icons/${programCode}.png`;
  }

  formatAllocation(value: string | null | undefined): string {
    if (!value) return '';
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric)) return value;
    return String(Math.round(numeric));
  }

  togglePrimary(): void {
    this.showPrimaryDropdown.update(v => !v);
  }

  selectPrimary(programId: number, programCode: string, allocation: string): void {
    this.creationService.selectPrimarySp({ programId, programCode, allocation: allocation ?? '' });
    this.showPrimaryDropdown.set(false);
    this.primarySelected.emit();
  }

  isSecondarySelected(programId: number): boolean {
    return this.creationService.selectedSecondarySps().some(s => s.programId === programId);
  }

  toggleSecondary(programId: number, programCode: string, allocation: string): void {
    this.creationService.toggleSecondarySp({ programId, programCode, allocation: allocation ?? '' });
  }

  closeDropdowns(): void {
    this.showPrimaryDropdown.set(false);
    this.showSecondaryDropdown.set(false);
  }

  constructor() {
    effect(() => {
      const sps = this.availableSps();
      const currentPrimary = this.creationService.selectedPrimarySp();
      if (sps.length === 1 && !currentPrimary) {
        const sp = sps[0];
        this.selectPrimary(sp.programId, sp.programCode, sp.allocation ?? '');
      }
    });
  }
}
