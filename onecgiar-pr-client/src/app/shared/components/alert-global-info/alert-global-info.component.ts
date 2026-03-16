import { Component, Input } from '@angular/core';
import { GlobalVariablesService } from '../../services/global-variables.service';

@Component({
  selector: 'app-alert-global-info',
  templateUrl: './alert-global-info.component.html',
  styleUrls: ['./alert-global-info.component.scss'],
  standalone: false
})
export class AlertGlobalInfoComponent {
  @Input() className?: string;
  @Input() inlineStyles?: string;

  constructor(public globalVariablesSE: GlobalVariablesService) {}
}
