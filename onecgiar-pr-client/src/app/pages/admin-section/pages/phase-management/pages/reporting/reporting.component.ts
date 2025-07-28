import { Component, OnInit } from '@angular/core';
import { ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-reporting',
  templateUrl: './reporting.component.html',
  styleUrls: ['./reporting.component.scss']
})
export class ReportingComponent implements OnInit {
  moduleType = ModuleTypeEnum.REPORTING;
  appModuleId = 1;

  constructor(public api: ApiService) {}

  ngOnInit(): void {}

  onPhaseUpdate(): void {}
}
