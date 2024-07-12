import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';
import { GlobalVariablesService } from '../../../../shared/services/global-variables.service';

@Component({
  selector: 'app-knowledge-products',
  templateUrl: './knowledge-products.component.html',
  styleUrls: ['./knowledge-products.component.scss']
})
export class KnowledgeProductsComponent implements OnInit {
  confidence_level: number;
  previous_confidence_level: number;
  isLoading: boolean = false;
  isLoadingConfidence: boolean = false;

  constructor(public api: ApiService, public exportTablesSE: ExportTablesService, public globalVariablesSE: GlobalVariablesService) {}

  ngOnInit(): void {
    this.confidence_level = Number(this.globalVariablesSE.get.kp_mqap_institutions_confidence);
    this.previous_confidence_level = Number(this.globalVariablesSE.get.kp_mqap_institutions_confidence);
    this.api.dataControlSE.getCurrentPhases();
  }

  onUpdateConfidenceLevel() {
    this.isLoadingConfidence = true;

    if (this.confidence_level === Number(this.globalVariablesSE.get.kp_mqap_institutions_confidence)) {
      this.isLoadingConfidence = false;
      return;
    }

    this.api.resultsSE
      .PUT_updateAdminKPConfidenceLevel({
        name: 'kp_mqap_institutions_confidence',
        value: this.confidence_level
      })
      .subscribe({
        next: ({ response }) => {
          this.isLoadingConfidence = false;
          this.confidence_level = response.value;
          this.previous_confidence_level = response.value;
          this.globalVariablesSE.get.kp_mqap_institutions_confidence = response.value;
        },
        error: err => {
          console.error(err);
          this.isLoadingConfidence = false;
        }
      });
  }

  onDownLoadTableAsExcel() {
    this.isLoading = true;

    this.api.resultsSE
      .POST_AdminKPExcelReport({
        phase_id: this.api.dataControlSE.reportingCurrentPhase.phaseId
      })
      .subscribe({
        next: ({ response }) => {
          const wscols = [
            { header: 'Result code', key: 'result_code', width: 14 },
            { header: 'Handle', key: 'kp_handle', width: 45 },
            { header: 'Author affiliation', key: 'author_affiliation', width: 60 },
            { header: 'CLARISA partner ID', key: 'partner_id', width: 27 },
            { header: 'CLARISA partner name', key: 'partner_name', width: 60 },
            { header: 'Matching type', key: 'matching_type', width: 20 },
            { header: 'Confidence level', key: 'confidence_level', width: 20 },
            { header: 'Is a correction', key: 'is_correction', width: 20 }
          ];
          this.exportTablesSE.exportExcelAdminKP(response, `KPs_${this.api.dataControlSE.reportingCurrentPhase.phaseYear}_Partner_Matching`, wscols);
          this.isLoading = false;
        },
        error: err => {
          console.error(err);
          this.isLoading = false;
        }
      });
  }
}
