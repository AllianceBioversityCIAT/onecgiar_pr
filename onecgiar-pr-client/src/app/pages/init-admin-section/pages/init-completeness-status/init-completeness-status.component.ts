import { Component } from '@angular/core';
import { GlobalCompletenessStatusComponent } from '../../../../shared/components/global-completeness-status/global-completeness-status.component';

@Component({
  selector: 'app-init-completeness-status',
  standalone: true,
  templateUrl: './init-completeness-status.component.html',
  styleUrls: ['./init-completeness-status.component.scss'],
  imports: [GlobalCompletenessStatusComponent]
})
export class InitCompletenessStatusComponent {}
