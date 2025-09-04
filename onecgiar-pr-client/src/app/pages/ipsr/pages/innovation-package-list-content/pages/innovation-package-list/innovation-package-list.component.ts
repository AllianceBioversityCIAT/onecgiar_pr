import { Component, OnDestroy, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { IpsrListService } from './services/ipsr-list.service';
import { IpsrListFilterService } from './services/ipsr-list-filter.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';

@Component({
  selector: 'app-innovation-package-list',
  templateUrl: './innovation-package-list.component.html',
  styleUrls: ['./innovation-package-list.component.scss'],
  standalone: false
})
export class InnovationPackageListComponent implements OnInit, OnDestroy {
  totalResults: number = 0;

  constructor(
    public api: ApiService,
    public phaseServices: PhasesService,
    public ipsrDataControlSE: IpsrDataControlService,
    public ipsrListService: IpsrListService,
    public ipsrListFilterSE: IpsrListFilterService
  ) {}

  ngOnInit(): void {
    if (this.api.rolesSE.isAdmin) {
      this.deselectInits();
    } else {
      this.api.updateUserData(() => {});
    }

    this.GETAllInnovationPackages();
    this.api.dataControlSE.getCurrentIPSRPhase().subscribe();
    this.phaseServices.phases.ipsr.forEach(item => ({ ...item, selected: item.status }));
  }

  GETAllInnovationPackages() {
    this.api.resultsSE.GETAllInnovationPackages().subscribe(({ response }) => {
      this.ipsrDataControlSE.ipsrResultList = response;
      this.totalResults = response.filter((thing, index, self) => self.findIndex(t => t.result_code === thing.result_code) === index).length;

      this.ipsrDataControlSE.ipsrResultList.forEach((inno: any) => {
        inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.official_code}`;
        inno.result_code = Number(inno.result_code);
      });
    });
  }

  get initsSelectedJoinText() {
    const myInitiativesList = this.api.dataControlSE?.myInitiativesList;
    const options = this.ipsrListFilterSE.filters.general[1]?.options;
    return JSON.stringify([...myInitiativesList, ...options]);
  }

  get everyDeselected() {
    return this.api.dataControlSE.myInitiativesList.every(item => !item.selected);
  }

  deselectInits() {
    this.api.dataControlSE.myInitiativesList.forEach(item => (item.selected = false));
  }

  ngOnDestroy(): void {
    this.api.dataControlSE?.myInitiativesList.forEach(item => (item.selected = true));
  }
}
