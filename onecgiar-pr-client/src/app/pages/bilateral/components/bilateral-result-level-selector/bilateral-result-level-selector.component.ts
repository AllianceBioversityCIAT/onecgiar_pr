import { Component, input, output } from '@angular/core';

const RESULT_LEVELS = [
  { id: 3, label: 'Outcome', description: 'Long-term changes resulting from the research' },
  { id: 4, label: 'Output', description: 'Products, services or capacities delivered' }
];

@Component({
  selector: 'app-bilateral-result-level-selector',
  imports: [],
  templateUrl: './bilateral-result-level-selector.component.html',
  styleUrl: './bilateral-result-level-selector.component.scss'
})
export class BilateralResultLevelSelectorComponent {
  resultLevelId = input<number | null>(null);
  levelSelected = output<number>();

  levels = RESULT_LEVELS;

  selectLevel(id: number): void {
    this.levelSelected.emit(id);
  }
}
