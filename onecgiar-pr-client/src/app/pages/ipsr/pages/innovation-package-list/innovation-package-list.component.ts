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
  constructor(private api: ApiService) {}
  ngOnInit(): void {
    this.api.resultsSE.GETAllInnovationPackages().subscribe(({ response }) => {
      console.log(this.innovationPackagesList);
      this.innovationPackagesList = response;
      this.innovationPackagesList.map((inno: any) => (inno.full_name = inno.title));
    });
  }
}
