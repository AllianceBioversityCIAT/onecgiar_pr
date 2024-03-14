import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { Router } from '@angular/router';

export class ComplementaryInnovation {
  climate_change_tag_level_id: string;
  created_date: string;
  description: string;
  gender_tag_level_id: string;
  initiative_id: number;
  initiative_name: string;
  initiative_official_code: string;
  initiative_short_name: string;
  lead_contact_person: string;
  result_code: string;
  result_id: string;
  result_level_name: string;
  result_type_id: number;
  result_type_name: string;
  title: string;
  selected: boolean;
}

@Component({
  selector: 'app-complementary-innovation',
  templateUrl: './complementary-innovation.component.html',
  styleUrls: ['./complementary-innovation.component.scss']
})
export class ComplementaryInnovationComponent implements OnInit {
  body: any;
  innovationPackageCreatorBody: ComplementaryInnovation[] = [];
  complemntaryFunction: any;
  status: boolean = false;
  informationComplementaryInnovations: any[] = [];
  cols = [];
  isInitiative: boolean = true;

  constructor(public api: ApiService, public ipsrDataControlSE: IpsrDataControlService, public router: Router) {}

  ngOnInit(): void {
    this.api.isStepTwoOne = true;
    this.api.isStepTwoTwo = false;

    this.innovationSving();

    this.api.resultsSE.GETComplementataryInnovationFunctions().subscribe(resp => {
      this.complemntaryFunction = resp['response'];
      this.columns();
    });

    this.getInformationInnovationComentary(false);
  }

  selectInnovationEvent(e) {
    this.innovationPackageCreatorBody.push(e);
  }

  innovationSving() {
    this.api.resultsSE.GETInnovationPathwayStepTwoInnovationSelect().subscribe(resp => {
      this.innovationPackageCreatorBody = resp['response'];
    });
  }

  createInnovationEvent(e) {
    this.innovationPackageCreatorBody.push(e);
    this.getInformationInnovationComentary(true);
  }

  columns() {
    let contador = 0;
    let auxCols = [];
    this.complemntaryFunction.forEach(element => {
      if (contador < 5) {
        auxCols.push(element);
      } else {
        if (contador == 5) {
          this.cols.push(auxCols);
          auxCols = [];
        }

        auxCols.push(element);
      }

      contador++;
    });

    this.cols.push(auxCols);
  }

  cancelInnovation(result_id: any) {
    const index = this.innovationPackageCreatorBody.findIndex(resp => resp.result_id == result_id);
    const innovationFind = this.informationComplementaryInnovations.find(resp => this.innovationPackageCreatorBody[index].result_code == resp.result_code);
    innovationFind.selected = false;
    this.innovationPackageCreatorBody.splice(index, 1);
  }

  regiterInnovationComplementary(complementaryInnovcation) {
    const seletedInnovation = [];
    complementaryInnovcation.forEach(element => {
      if (element.hasOwnProperty('result_id')) {
        seletedInnovation.push({
          result_id: element['result_id']
        });
      } else {
        seletedInnovation.push({
          result_id: element['id']
        });
      }
    });

    return seletedInnovation;
  }

  onSaveSection() {
    this.body = this.regiterInnovationComplementary(this.innovationPackageCreatorBody);

    this.api.resultsSE.PATCHComplementaryInnovation({ complementaryInovatins: this.body }).subscribe(resp => {});
  }

  onSavePreviuosNext(descrip) {
    if (this.api.rolesSE.readOnly) {
      if (descrip == 'next') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }

      if (descrip == 'previous') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-1'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }
      return;
    }
    this.body = this.regiterInnovationComplementary(this.innovationPackageCreatorBody);
    this.api.resultsSE.PATCHComplementaryInnovationPrevious({ complementaryInovatins: this.body }, descrip).subscribe(resp => {
      if (this.api.rolesSE.isAdmin && !this.api.isStepTwoTwo && descrip == 'next') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2/basic-info'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }
      if (this.api.isStepTwoTwo && descrip == 'next') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }

      if (descrip == 'previous') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-1'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }
    });
  }

  getInformationInnovationComentary(estado) {
    this.api.resultsSE.GETinnovationpathwayStepTwo().subscribe(resp => {
      this.informationComplementaryInnovations = resp['response'];
      this.innovationPackageCreatorBody.forEach(seleccionado => {
        const encontrado = this.informationComplementaryInnovations.find(tablaItem => tablaItem.result_code == seleccionado.result_code);
        encontrado.selected = true;
      });
      this.informationComplementaryInnovations.forEach((inno: any) => {
        inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.initiative_official_code} ${inno?.initiative_official_code} ${inno?.lead_contact_person} yes no `;
        this.isInitiative = this.api.rolesSE.validateInitiative(inno.initiative_id);
        inno.permissos = this.isInitiative;
      });
    });
  }

  saveEdit(e) {
    this.getInformationInnovationComentary(true);
    this.innovationSving();
  }
}
