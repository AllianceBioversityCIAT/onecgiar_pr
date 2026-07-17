import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-mds-progress-ring',
  imports: [],
  templateUrl: './mds-progress-ring.component.html',
  styleUrl: './mds-progress-ring.component.scss'
})
export class MdsProgressRingComponent {
  percentage = input<number>(0);
  size = input<number>(80);
  strokeWidth = 8;
  radius: number;

  constructor() {
    this.radius = this.size() / 2 - this.strokeWidth;
  }

  circumference = computed(() => 2 * Math.PI * (this.size() / 2 - this.strokeWidth));

  dashOffset = computed(() => {
    return this.circumference() * (1 - this.percentage() / 100);
  });

  ringColor = computed(() => {
    const p = this.percentage();
    if (p < 40) return '#C62828';
    if (p < 80) return '#F57F17';
    return '#2E7D32';
  });
}
