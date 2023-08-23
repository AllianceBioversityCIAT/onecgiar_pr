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

  ngOnInit(): void {}

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
}
