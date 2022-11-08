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
  otherList: any[] = [];
  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    window.scrollTo(100, 0);
  }
  getSectionInformation() {}
  onSaveSection() {}
  alertInfoText() {
    return `Please fill in the following fields that are required based on the result type. <br>
    Please provide evidence of use claims in the <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultId}/general-information" class="open_route" target="_blank">General information</a> section. `;
  }
  onAddMore() {
    console.log('onAddMore');
    this.otherList.push({});
  }
  onRemoveOne(index) {
    this.otherList.splice(index, 1);
  }
}
