import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { GlobalCompletenessStatusComponent } from '../../../../shared/components/global-completeness-status/global-completeness-status.component';

@Component({
  selector: 'app-completeness-status',
  standalone: true,
  templateUrl: './completeness-status.component.html',
  styleUrls: ['./completeness-status.component.scss'],
  imports: [CommonModule, GlobalCompletenessStatusComponent]
})
export class CompletenessStatusComponent {}
