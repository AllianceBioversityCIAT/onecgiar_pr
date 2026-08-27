import { Component, Input } from '@angular/core';
import { RolesService } from '../../shared/services/global/roles.service';

@Component({
  selector: 'app-pr-field-header',
  templateUrl: './pr-field-header.component.html',
  styleUrls: ['./pr-field-header.component.scss'],
  standalone: false
})
export class PrFieldHeaderComponent {
  @Input() simpleStyle: boolean;
  @Input() label: string;
  @Input() description: string;
  // P2-3061: optional info tooltip shown as a material-icons "info" next to the label (project line: material-icons-round + pTooltip).
  @Input() tooltip?: string = '';
  @Input() required: boolean = true;
  @Input() readOnly: boolean;
  @Input() useColon: boolean = true;
  @Input() showDescriptionLabel: boolean = true;
  @Input() descInlineStyles?: string = '';
  @Input() labelDescInlineStyles?: string = '';
  @Input() labelDescStyleClass?: string = '';

  constructor(public rolesSE: RolesService) {}

  get descriptionLabel() {
    return this.showDescriptionLabel && !this.rolesSE.readOnly ? `<strong class="mr-5 font-weight-600 text-black">Description:</strong>` : '';
  }
}
