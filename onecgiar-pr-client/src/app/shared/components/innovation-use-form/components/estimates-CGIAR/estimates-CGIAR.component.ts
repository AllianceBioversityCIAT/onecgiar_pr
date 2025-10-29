import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../services/api/api.service';
import { TerminologyService } from '../../../../../internationalization/terminology.service';

@Component({
    selector: 'app-estimates-cgiar',
    templateUrl: './estimates-cgiar.component.html',
    styleUrls: ['./estimates-cgiar.component.scss'],
    standalone: false
})
export class EstimatesCgiarComponent {
    @Input() body: any = {};

    constructor(
        public api: ApiService,
        private readonly terminologyService: TerminologyService
    ) { }

    resultCode = this.api.dataControlSE?.currentResult?.result_code;
    versionId = this.api.dataControlSE?.currentResult?.version_id;

    headerDescriptions() {
        const n1 = `<ul>
    <li>Innovation use team estimates the total investment (in-cash + in-kind) in innovation use made by the leading Science Program/Accelerator and the contributing Science Program/Accelerator during the reporting period.</li>
    <li>Includes Science Program/Accelerator funds allocated to CGIAR and/or partners.</li>
    <li>Innovation use team works with contributing Science Program/Accelerator to estimate the total (co-) investment (in-cash + in-kind) in innovation use made by each of the contributing Science Program/Accelerator during the reporting period</li>
    </ul>`;
        const n2 = `<ul>
    <li>Innovation use team works with W3/ bilateral projects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each of the contributing W3/ Bilaterals during the reporting period</li>
    <li>Includes W3/ Bilateral funds allocated to CGIAR and/or partners</li>
    </ul>`;
        const n3 = `<ul>
    <li>Innovation use team works with partnersprojects to estimate the total (co-) investment (in-cash + in-kind) in innovation development made by each partner during the reporting period</li>
    <li>This concerns the investment of partner resources (in-cash and/or in-kind) that were not provided by CGIAR Science Program/Accelerator or projects</li>
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

    onRadioChange(item: any) {
        if (item.is_determined) {
            item.kind_cash = null;
        }
    }

    onInputChange(item: any) {
        if (item.kind_cash) {
            item.is_determined = null;
        }
    }
}
