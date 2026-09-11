import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-step-two-basic-info',
    templateUrl: './step-two-basic-info.component.html',
    styleUrls: ['./step-two-basic-info.component.scss'],
    standalone: false
})
export class StepTwoBasicInfoComponent implements OnInit {
  informartion: any[] = [];
  selectOne: any[] = [];
  selectTow: any[] = [];
  cols: any = [];
  // P2-3322: signal-backed flag. `selectedOneLevel()` / `selectedTwo()` run from `(ngModelChange)` on the
  // enabler checkboxes and toggle this `false -> setTimeout -> true` so the checkbox list remounts with the
  // cascaded selection applied. As a plain field the delayed write notified nothing, so under zoneless
  // change detection the checkboxes (`*ngIf="update == true"` at html:23 and html:35) vanished after
  // ticking a parent enabler type and only came back on reload. The public API stays a plain boolean, so
  // the template and the existing specs are untouched.
  private readonly _update = signal<boolean>(false);
  get update(): boolean {
    return this._update();
  }
  set update(value: boolean) {
    this._update.set(value);
  }
  allInformation = true;
  innovationCompletary: any = [];
  bodyStep2: InnovationComplementary[] = [];
  init = false;

  constructor(public api: ApiService, public ipsrDataControlSE: IpsrDataControlService, private router: Router) {}

  ngOnInit(): void {
    this.api.isStepTwoTwo = true;
    this.api.isStepTwoOne = false;
    this.getInnovationComplementaries();
    this.getComplementaryTypes();
  }

  onSaveSection() {
    this.api.resultsSE.PostStepTwoComentariesInnovation(this.bodyStep2).subscribe(resp => {});
  }

  convertCols() {
    let contador = 0;
    let auxCols = [];
    this.innovationCompletary.forEach(element => {
      if (contador < 3) {
        auxCols.push(element);
      } else {
        if (contador == 3) {
          this.cols.push(auxCols);
          auxCols = [];
        }

        auxCols.push(element);
      }

      contador++;
    });

    this.cols.push(auxCols);
    this.update = true;
  }

  goToStep() {
    return `<a class='open_route' href='/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=${this.ipsrDataControlSE.resultInnovationPhase}' target='_blank'> Go to step 2.1</a>`;
  }

  selectedOneLevel(category, i, levels) {
    if (category.subCategories.length != 0) {
      if (this.bodyStep2[i].complementary_innovation_enabler_types_one.includes(category['complementary_innovation_enabler_types_id'])) {
        category.subCategories.forEach(element => {
          this.bodyStep2[i].complementary_innovation_enabler_types_two.push(element.complementary_innovation_enabler_types_id);
        });
      } else {
        category.subCategories.forEach(element => {
          const index = this.bodyStep2[i].complementary_innovation_enabler_types_two.findIndex(ele => ele == element.complementary_innovation_enabler_types_id);
          if (index != -1) {
            this.bodyStep2[i].complementary_innovation_enabler_types_two.splice(index, 1);
          }
        });
      }

      this.update = false;
      setTimeout(() => {
        this.update = true;
      }, 500);
    }
  }

  selectedTwo(category, i) {
    if (!this.bodyStep2[i].complementary_innovation_enabler_types_one.includes(category['complementary_innovation_enabler_types_id'])) {
      this.bodyStep2[i].complementary_innovation_enabler_types_one.push(category.complementary_innovation_enabler_types_id);
      this.update = false;
      setTimeout(() => {
        this.update = true;
      }, 50);
    }
  }

  async onSavePreviuosNext(descrip) {
    if (this.api.rolesSE.readOnly) {
      if (this.api.isStepTwoTwo && descrip == 'next') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }

      if (descrip == 'previous') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2/complementary-innovation'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }
      return;
    }
    this.api.resultsSE.PostStepTwoComentariesInnovationPrevius(this.bodyStep2, descrip).subscribe(resp => {
      if (this.api.isStepTwoTwo && descrip == 'next') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-3'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }

      if (descrip == 'previous') {
        this.router.navigate(['/ipsr/detail/' + this.ipsrDataControlSE.resultInnovationCode + '/ipsr-innovation-use-pathway/step-2/complementary-innovation'], {
          queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase }
        });
      }
    });
  }

  getInnovationComplementaries() {
    this.api.resultsSE.getStepTwoComentariesInnovationId().subscribe(resp => {
      this.informartion = resp['response']['results'];
      this.informartion.forEach(respe => {
        let complementary_enablers_two = [];
        let complementary_enablers_one = [];
        if (respe['complementary_enablers_one'] != null) {
          complementary_enablers_one = respe['complementary_enablers_one'].split(';');
        }
        if (respe['complementary_enablers_two'] != null) {
          complementary_enablers_two = respe['complementary_enablers_two'].split(';');
        }

        const aux = new InnovationComplementary();
        aux.result_by_innovation_package_id = respe.result_by_innovation_package_id;
        if (complementary_enablers_one.length != 0) {
          aux.complementary_innovation_enabler_types_one = complementary_enablers_one;
        }
        if (complementary_enablers_two.length != 0) {
          aux.complementary_innovation_enabler_types_two = complementary_enablers_two;
        }
        this.bodyStep2.push(aux);
        respe.open = true;
        this.informartion[0].open = false;
      });
    });
  }

  getComplementaryTypes() {
    this.api.resultsSE.getStepTwoComentariesInnovation().subscribe(resp => {
      this.innovationCompletary = resp['response']['comentaryPrincipals'];
      this.convertCols();
      this.init = true;
    });
  }
}

export class InnovationComplementary {
  result_by_innovation_package_id: string;
  complementary_innovation_enabler_types_one: any[] = new Array();
  complementary_innovation_enabler_types_two: any[] = new Array();
}
