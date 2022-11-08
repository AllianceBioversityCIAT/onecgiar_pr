import { Component } from '@angular/core';

@Component({
  selector: 'app-test-environment-label',
  templateUrl: './test-environment-label.component.html',
  styleUrls: ['./test-environment-label.component.scss']
})
export class TestEnvironmentLabelComponent {
  horizonalPosition = true;
  constructor() {}
  moveToggle() {
    this.horizonalPosition = !this.horizonalPosition;
  }
}
