import { Component, OnInit } from '@angular/core';
import { ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-innovation-package',
  templateUrl: './innovation-package.component.html',
  styleUrls: ['./innovation-package.component.scss']
})
export class InnovationPackageComponent implements OnInit {
  moduleType = ModuleTypeEnum.IPSR;
  appModuleId = 2;

  constructor(public api: ApiService) {}

  ngOnInit(): void {}

  onPhaseUpdate(): void {}
}
