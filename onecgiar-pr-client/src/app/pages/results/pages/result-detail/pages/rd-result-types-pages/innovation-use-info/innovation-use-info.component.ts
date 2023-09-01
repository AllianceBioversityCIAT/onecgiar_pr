import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationUseInfoBody } from './model/innovationUseInfoBody';
import { IpsrStep1Body } from 'src/app/pages/ipsr/pages/innovation-package-detail/pages/ipsr-innovation-use-pathway/pages/step-n1/model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-innovation-use-info',
  templateUrl: './innovation-use-info.component.html',
  styleUrls: ['./innovation-use-info.component.scss']
})
export class InnovationUseInfoComponent implements OnInit {
  innovationUseInfoBody = new IpsrStep1Body();
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_innovationUse().subscribe(
      ({ response }) => {
        this.innovationUseInfoBody.innovatonUse = response;
        console.log(response);
        //(response);
        // console.log(this.innovationUseInfoBody);
      },
      err => {
        console.error(err);
      }
    );
  }
  onSaveSection() {
    //(this.innovationUseInfoBody);
    console.log({ innovationUse: this.innovationUseInfoBody.innovatonUse });
    this.api.resultsSE.PATCH_innovationUse({ innovationUse: this.innovationUseInfoBody.innovatonUse }).subscribe(
      resp => {
        this.getSectionInformation();
      },
      err => {
        console.error(err);
      }
    );
  }
}
