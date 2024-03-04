import { Component, Input } from '@angular/core';
import { RolesService } from '../../shared/services/global/roles.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pr-field-header',
  standalone: true,
  templateUrl: './pr-field-header.component.html',
  styleUrls: ['./pr-field-header.component.scss'],
  imports: [CommonModule]
})
export class PrFieldHeaderComponent {
  @Input() simpleStyle: boolean;
  @Input() label: string;
  @Input() description: string;
  @Input() required: boolean = true;
  @Input() readOnly: boolean;
  @Input() useColon: boolean = true;
  @Input() showDescriptionLabel: boolean = true;
  @Input() descInlineStyles?: string = '';

  constructor(public rolesSE: RolesService) {}

  get descriptionLabel() {
    return this.showDescriptionLabel && !this.rolesSE.readOnly
      ? `<strong class="description_header">Description:</strong>`
      : '';
  }
}
