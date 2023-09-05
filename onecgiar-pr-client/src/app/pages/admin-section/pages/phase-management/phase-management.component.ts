import { Component, OnInit, ViewChild } from '@angular/core';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../shared/enum/api.enum';
import { Phase } from '../../../../shared/interfaces/phase.interface';
import { Table } from 'primeng/table';
import { CustomizedAlertsFeService } from '../../../../shared/services/customized-alerts-fe.service';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-phase-management',
  templateUrl: './phase-management.component.html',
  styleUrls: ['./phase-management.component.scss']
})
export class PhaseManagementComponent implements OnInit {
  ngOnInit(): void {}
}
