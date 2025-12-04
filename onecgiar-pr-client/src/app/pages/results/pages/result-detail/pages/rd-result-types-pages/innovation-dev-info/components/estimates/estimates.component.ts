import { Component, Input, inject } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { TerminologyService } from '../../../../../../../../../internationalization/terminology.service';
import { FieldsManagerService } from '../../../../../../../../../shared/services/fields-manager.service';

@Component({
  selector: 'app-estimates',
  templateUrl: './estimates.component.html',
  styleUrls: ['./estimates.component.scss'],
  standalone: false
})
export class EstimatesComponent {
  @Input() body = new InnovationDevInfoBody();
  fieldsManagerSE = inject(FieldsManagerService);

  constructor(
    public api: ApiService,
    private terminologyService: TerminologyService
  ) {}

  resultCode = this.api.dataControlSE?.currentResult?.result_code;
  versionId = this.api.dataControlSE?.currentResult?.version_id;

  headerDescriptions() {
    const n1 = `<ul>
    <li>Innovation development team estimates the total investment (in-cash + in-kind) in innovation development made by the leading ${this.terminologyService.t('term.entity.singular', this.api.dataControlSE?.currentResult?.portfolio)} and the contributing ${this.terminologyService.t('term.entity.plural', this.api.dataControlSE?.currentResult?.portfolio)} during the reporting period.</li>
    <li>Includes ${this.terminologyService.t('term.entity.singular', this.api.dataControlSE?.currentResult?.portfolio)} funds allocated to CGIAR and/or partners.</li>
    <li>Innovation development team works with contributing ${this.terminologyService.t('term.entity.plural', this.api.dataControlSE?.currentResult?.portfolio)} to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each of the contributing ${this.terminologyService.t('term.entity.plural', this.api.dataControlSE?.currentResult?.portfolio)} during the reporting period.</li>
    </ul>`;
    const n2 = `<ul>
    <li>Innovation development team works with W3/ bilateral projects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each of the contributing W3/ Bilaterals during the reporting period</li>
    <li>Includes W3/ Bilateral funds allocated to CGIAR and/or partners</li>
    </ul>`;
    const n3 = `<ul>
    <li>Innovation development team works with partnersprojects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each partner during the reporting period</li>
    <li>This concerns the investment of partner resources (in-cash and/or in-kind) that were not provided by CGIAR ${this.terminologyService.t('term.entity.plural', this.api.dataControlSE?.currentResult?.portfolio)} or projects</li>
    </ul>`;

    return { n1, n2, n3 };
  }

  checkValueAlert(item) {
    if (item.is_determined) {
      return true;
    }

    if (item.kind_cash) {
      return true;
    }

    return false;
  }
}
