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
  id: string;
}

@Component({
  selector: 'app-complementary-innovation',
  templateUrl: './complementary-innovation.component.html',
  styleUrls: ['./complementary-innovation.component.scss']
})
export class ComplementaryInnovationComponent implements OnInit {
  body: any;
  innovationPackageCreatorBody: ComplementaryInnovation[] = [];
  complementaryFunction: any;
  status = false;
  informationComplementaryInnovations: any[] = [];
  informationInnovationDevelopments: any[] = [];
  cols: any[] = [];
  isInitiative = true;
  linksToResultsBody: any;

  constructor(
    public api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.api.isStepTwoOne = true;
    this.api.isStepTwoTwo = false;

    this.loadInnovationPackage();
    this.loadComplementaryFunctions();
    this.loadInformationComplementaryInnovations();
    this.loadLinkedResults();
  }

  selectInnovationEvent(event: any): void {
    this.innovationPackageCreatorBody.push(event);
  }

  loadInnovationPackage(): void {
    this.api.resultsSE.GETInnovationPathwayStepTwoInnovationSelect().subscribe(resp => {
      this.innovationPackageCreatorBody = resp?.response;
    });
  }

  createInnovationEvent(event: ComplementaryInnovation): void {
    this.innovationPackageCreatorBody.push(event);
    this.loadInnovationPackage();
    this.loadInformationComplementaryInnovations();
  }

  loadComplementaryFunctions(): void {
    this.api.resultsSE.GETComplementataryInnovationFunctions().subscribe(resp => {
      this.complementaryFunction = resp?.response;
      this.setupColumns();
    });
  }

  setupColumns(): void {
    let auxCols = [];
    this.complementaryFunction.forEach((element, index) => {
      if (index % 5 === 0 && index !== 0) {
        this.cols.push(auxCols);
        auxCols = [];
      }
      auxCols.push(element);
    });
    this.cols.push(auxCols);
  }

  cancelInnovation(result: ComplementaryInnovation): void {
    const index = this.innovationPackageCreatorBody.findIndex(item => item.result_id === result.result_id);
    if (index !== -1) {
      const innovation = this.innovationPackageCreatorBody[index];
      const innovationList = innovation.result_type_id === 7 ? this.informationInnovationDevelopments : this.informationComplementaryInnovations;
      const innovationFind = innovationList.find(item => item.result_code === innovation.result_code);
      if (innovationFind) {
        innovationFind.selected = false;
      }
      this.innovationPackageCreatorBody.splice(index, 1);
    }
  }

  registerInnovationComplementary(complementaryInnovations: ComplementaryInnovation[]): any[] {
    return complementaryInnovations.map(element => ({
      result_id: element.result_id || element.id
    }));
  }

  loadLinkedResults(): void {
    this.api.resultsSE.GET_resultsLinked(true).subscribe(({ response }) => {
      this.linksToResultsBody = response;
    });
  }

  onSaveSection(): void {
    const recentAdditions = this.innovationPackageCreatorBody.filter(
      element =>
        element.created_date && element.result_type_id === 7 && !this.linksToResultsBody.links.some(link => link.result_id === element.result_id)
    );

    const updatedLinksBody = {
      ...this.linksToResultsBody,
      links: [...this.linksToResultsBody.links, ...recentAdditions]
    };

    this.body = this.registerInnovationComplementary(this.innovationPackageCreatorBody);

    this.api.resultsSE.PATCHComplementaryInnovation({ complementaryInovatins: this.body }).subscribe(() => {
      if (recentAdditions.length > 0) {
        this.api.resultsSE.POST_resultsLinked(updatedLinksBody, true, false).subscribe();
      }
    });
  }

  onSavePreviousNext(description: string): void {
    if (this.api.rolesSE.readOnly) {
      this.navigateToStep(description);
      return;
    }

    const recentAdditions = this.innovationPackageCreatorBody.filter(
      element =>
        element.created_date && element.result_type_id === 7 && !this.linksToResultsBody.links.some(link => link.result_id === element.result_id)
    );

    const updatedLinksBody = {
      ...this.linksToResultsBody,
      links: [...this.linksToResultsBody.links, ...recentAdditions]
    };

    this.body = this.registerInnovationComplementary(this.innovationPackageCreatorBody);

    this.api.resultsSE.PATCHComplementaryInnovationPrevious({ complementaryInovatins: this.body }, description).subscribe(() => {
      if (recentAdditions.length > 0) {
        this.api.resultsSE.POST_resultsLinked(updatedLinksBody, true, false).subscribe();
      }
      this.navigateToStep(description);
    });
  }

  navigateToStep(description: string): void {
    const baseRoute = `/ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/ipsr-innovation-use-pathway`;
    const queryParams = { queryParams: { phase: this.ipsrDataControlSE.resultInnovationPhase } };

    if (description === 'next') {
      if (this.api.rolesSE.isAdmin && !this.api.isStepTwoTwo) {
        this.router.navigate([`${baseRoute}/step-2/basic-info`], queryParams);
      } else if (this.api.isStepTwoTwo) {
        this.router.navigate([`${baseRoute}/step-3`], queryParams);
      }
    } else if (description === 'previous') {
      this.router.navigate([`${baseRoute}/step-1`], queryParams);
    }
  }

  loadInformationComplementaryInnovations(): void {
    this.api.resultsSE.GETinnovationpathwayStepTwo().subscribe((resp: any) => {
      resp.response.forEach(inno => {
        inno.full_name = `${inno.result_code} ${inno.title} ${inno.initiative_official_code} ${inno.initiative_official_code} ${inno.lead_contact_person} yes no`;
        this.isInitiative = this.api.rolesSE.validateInitiative(inno.initiative_id);
        inno.permissos = this.isInitiative;
      });

      this.informationInnovationDevelopments = resp.response.filter((element: any) => element.result_type_id === 7);
      this.informationComplementaryInnovations = resp.response.filter((element: any) => element.result_type_id === 11);

      this.innovationPackageCreatorBody.forEach(selected => {
        const foundDevelopment = this.informationInnovationDevelopments.find(item => item.result_code === selected.result_code);
        if (foundDevelopment) {
          foundDevelopment.selected = true;
        }
        const foundComplementary = this.informationComplementaryInnovations.find(item => item.result_code === selected.result_code);
        if (foundComplementary) {
          foundComplementary.selected = true;
        }
      });
    });
  }

  saveEdit(): void {
    this.loadInformationComplementaryInnovations();
    this.loadInnovationPackage();
  }
}
