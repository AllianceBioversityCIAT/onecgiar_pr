import { Component } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-innovation-package-list',
  templateUrl: './innovation-package-list.component.html',
  styleUrls: ['./innovation-package-list.component.scss']
})
export class InnovationPackageListComponent {
  innovationPackagesList = [];
  searchText = '';
  constructor(public api: ApiService) {}
  ngOnInit(): void {
    this.api.resultsSE.GETAllInnovationPackages().subscribe(({ response }) => {
      // console.log(response);
      this.innovationPackagesList = response;
      this.innovationPackagesList.map((inno: any) => (inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.official_code}`));
    });
  }

  onSelectChip(option) {
    option.selected = !option.selected;
  }

  get initsSelectedJoinText() {
    return JSON.stringify(this.api.dataControlSE?.myInitiativesList);
  }
  get everyDeselected() {
    return this.api.dataControlSE.myInitiativesList.every(item => item.selected != true);
  }

  deselectInits() {
    this.api.dataControlSE.myInitiativesList.map(item => (item.selected = false));
  }

  ngOnDestroy(): void {
    this.api.dataControlSE?.myInitiativesList.map(item => (item.selected = true));
  }
}
