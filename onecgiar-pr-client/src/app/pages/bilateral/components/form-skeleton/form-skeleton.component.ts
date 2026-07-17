import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-skeleton',
  standalone: true,
  templateUrl: './form-skeleton.component.html',
  styleUrl: './form-skeleton.component.scss'
})
export class FormSkeletonComponent {
  rows = input<number>(4);
  extraRows = input<number>(5);
  hasExtra = input(false);
  hasLabel = input(false);

  counter(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }
}
