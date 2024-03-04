import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-test-environment-label',
  standalone: true,
  templateUrl: './test-environment-label.component.html',
  styleUrls: ['./test-environment-label.component.scss'],
  imports: [CommonModule]
})
export class TestEnvironmentLabelComponent {
  horizonalPosition = true;
  constructor() {}
  moveToggle() {
    this.horizonalPosition = !this.horizonalPosition;
  }
}
