import { Component } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-innovation-package-list',
  templateUrl: './innovation-package-list.component.html',
  styleUrls: ['./innovation-package-list.component.scss']
})
export class InnovationPackageListComponent {
  innovationPackagesList = [];
  constructor(private api: ApiService) {}
  ngOnInit(): void {
    this.api.resultsSE.GETAllInnovationPackages().subscribe(({ response }) => {
      console.log(response);
      this.innovationPackagesList = response;
    });
  }
}
