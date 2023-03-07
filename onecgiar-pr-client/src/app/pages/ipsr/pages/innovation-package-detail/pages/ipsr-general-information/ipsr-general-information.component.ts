import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../../../../../shared/services/global/score.service';

@Component({
  selector: 'app-ipsr-general-information',
  templateUrl: './ipsr-general-information.component.html',
  styleUrls: ['./ipsr-general-information.component.scss']
})
export class IpsrGeneralInformationComponent {
  isKrs = null;
  constructor(public scoreSE: ScoreService) {}

  onChangeKrs() {
    if (this.isKrs === false) this.isKrs = null;
  }
  onSaveSection() {}
}
