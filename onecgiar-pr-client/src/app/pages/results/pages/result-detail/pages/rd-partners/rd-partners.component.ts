import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { PartnersBody } from './models/partnersBody';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { RdPartnersService } from './rd-partners.service';

@Component({
  selector: 'app-rd-partners',
  templateUrl: './rd-partners.component.html',
  styleUrls: ['./rd-partners.component.scss']
})
export class RdPartnersComponent {
  constructor(public api: ApiService, public institutionsSE: InstitutionsService, public rolesSE: RolesService, private rdPartnersSE: RdPartnersService) {}
  ngOnInit(): void {
    this.rdPartnersSE.partnersBody = new PartnersBody();
    this.rdPartnersSE.getSectionInformation();
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
  }

  onSyncSection() {
    this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
      this.rdPartnersSE.getSectionInformation();
    });
  }

  onSaveSection() {
    // console.log(this.rdPartnersSE.partnersBody);
    this.api.resultsSE.PATCH_partnersSection(this.rdPartnersSE.partnersBody).subscribe(resp => {
      // console.log(resp);
      this.rdPartnersSE.getSectionInformation();
    });
  }
}
