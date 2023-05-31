import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { InnovationUseInfoBody } from './model/innovationUseInfoBody';

@Component({
  selector: 'app-innovation-use-info',
  templateUrl: './innovation-use-info.component.html',
  styleUrls: ['./innovation-use-info.component.scss']
})
export class InnovationUseInfoComponent implements OnInit {
  innovationUseInfoBody = new InnovationUseInfoBody();
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getSectionInformation();
  }
  getSectionInformation() {
    this.api.resultsSE.GET_innovationUse().subscribe(
      ({ response }) => {
        this.innovationUseInfoBody = response;
        //(response);
      },
      err => {
        console.error(err);
      }
    );
  }
  onSaveSection() {
    //(this.innovationUseInfoBody);
    this.api.resultsSE.PATCH_innovationUse(this.innovationUseInfoBody).subscribe(
      resp => {
        this.getSectionInformation();
      },
      err => {
        console.error(err);
      }
    );
  }
  alertInfoText() {
    return `Please fill in the following fields that are required based on the result type. <br>
    Please provide evidence of use claims in the <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/general-information" class="open_route" target="_blank">General information</a> section. `;
  }
  onAddMore() {
    //('onAddMore');
    this.innovationUseInfoBody.other.push({});
  }
  onRemoveOne(index) {
    this.innovationUseInfoBody.other.splice(index, 1);
  }
}
