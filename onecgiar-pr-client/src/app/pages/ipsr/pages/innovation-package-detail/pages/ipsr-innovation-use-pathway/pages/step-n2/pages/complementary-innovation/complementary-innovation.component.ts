import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { Router } from '@angular/router';
import { ComplementaryInnovationService } from './services/complementary-innovation.service';

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
  version_id: number;
}

@Component({
    selector: 'app-complementary-innovation',
    templateUrl: './complementary-innovation.component.html',
    styleUrls: ['./complementary-innovation.component.scss'],
    standalone: false
})
export class ComplementaryInnovationComponent implements OnInit {
  body: any;
  innovationPackageCreatorBody: ComplementaryInnovation[] = [];
  complementaryFunction: any;
  status = false;
  informationInnovationDevelopments: any[] = [];
  cols: any[] = [];
  isInitiative = true;
  linksToResultsBody: any;

  idInnovation: number;
  complementaries = false;
  informationComplentary: any;

  /**
   * P2-3572 (epic P2-3243) — which result types Step 2 lists as candidate enablers.
   *
   * Local constants because the client has no shared ResultTypeEnum; same choice, and for the same
   * reason, as `pages/bilateral/components/section-geography/section-geography.component.ts:15`.
   * Ids mirror the server's `shared/constants/result-type.enum.ts`.
   *
   * ❌ Knowledge Product (6) is absent on purpose — the story excludes it explicitly, "regardless of
   * their association with the package". Complementary innovation (11) is absent too: those are the
   * ad-hoc entries created from the modal below, never rows of this table.
   */
  private static readonly ENABLER_TYPE_IDS_LEGACY = [7];
  private static readonly ENABLER_TYPE_IDS_2026 = [1, 2, 5, 7];

  constructor(
    public api: ApiService,
    public ipsrDataControlSE: IpsrDataControlService,
    public router: Router,
    public complementaryInnovationService: ComplementaryInnovationService
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

  getComplementaryInnovation(id, result) {
    this.isInitiative = this.api.rolesSE.validateInitiative(this.ipsrDataControlSE.initiative_id);

    if (result.result_type_id == 11) {
      this.complementaryInnovationService.isEdit = true;

      this.complementaryInnovationService.idInnovation = id;

      this.api.resultsSE.GETComplementaryById(id).subscribe(({ response }) => {
        this.complementaryInnovationService.dialogStatus = true;

        this.complementaryInnovationService.complementaries = false;

        this.complementaryInnovationService.bodyNewComplementaryInnovation.projects_organizations_working_on_innovation =
          response?.findResultComplementaryInnovation?.projects_organizations_working_on_innovation;

        this.complementaryInnovationService.bodyNewComplementaryInnovation.specify_projects_organizations =
          response?.findResultComplementaryInnovation?.specify_projects_organizations;

        this.complementaryInnovationService.bodyNewComplementaryInnovation.title = response?.findResult?.title;

        this.complementaryInnovationService.bodyNewComplementaryInnovation.description = response?.findResult?.description;

        this.complementaryInnovationService.bodyNewComplementaryInnovation.short_title = response?.findResultComplementaryInnovation?.short_title;

        this.complementaryInnovationService.bodyNewComplementaryInnovation.other_funcions =
          response?.findResultComplementaryInnovation?.other_funcions;

        // P2-3529: the checkbox group binds `[value]="subItem"` where `subItem` is an object taken from
        // `cols` (built in `setupColumns()` out of `this.complementaryFunction`). `prCheckboxValue`
        // resolves membership with `indexOf`, i.e. REFERENCE equality for objects
        // (shared/directives/pr-checkbox-value-accessor.directive.ts:61) — the PrimeNG `p-checkbox` it
        // replaced used deep equality. Rehydrating with freshly built literals therefore produced an
        // array that could never match any `subItem`, so every saved Function rendered unchecked while
        // the plain text fields on the same modal reloaded fine. Reuse the SAME object reference.
        this.complementaryInnovationService.bodyNewComplementaryInnovation.complementaryFunctions = (
          response?.findComplementaryInnovationFuctions ?? []
        ).map(element => {
          const option = this.complementaryFunction?.find(
            item => item.complementary_innovation_functions_id === element.complementary_innovation_function_id
          );

          // Unknown id (catalog changed): keep it in the payload so saving does not silently drop it.
          return (
            option ?? {
              complementary_innovation_functions_id: element.complementary_innovation_function_id,
              name: undefined
            }
          );
        });

        setTimeout(() => {
          this.complementaryInnovationService.complementaries = true;
        }, 100);
      });
    } else {
      const url = `/result/result-detail/${result.result_code}/general-information?phase=${result.version_id}`;
      window.open(url, '_blank');
    }
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
      const innovationList = this.informationInnovationDevelopments;
      const innovationFind = innovationList.find(item => item.result_id === innovation.result_id);
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

  /**
   * P2-3572. From the 2026 phase the table also lists Innovation Use, Policy Change and Capacity
   * Sharing for Development; phases <= 2025 keep the Innovation-Development-only table they have
   * today. The status filter is the server's and is unchanged — only these types widen.
   *
   * The gate is the phase year of the PACKAGE BEING EDITED, not of the listed results: the story
   * lists results "from all phases", it is the form that is versioned by phase (point 4 of the PO
   * instruction on this epic). Phase year, never `isP25()` — the P25 portfolio starts in 2025.
   *
   * No load race to guard against: `innovation-package-detail.component.html:64` only activates the
   * `<router-outlet>` once `porfolioExists()` is truthy, and `portfolio` and `phase_year` arrive in
   * the same `GETInnovationPackageDetail` payload — so this component cannot mount before the year
   * is known. And `isPhaseYearAtLeast` fails to the legacy list if it ever were unknown.
   */
  private enablerTypeIds(): number[] {
    return this.api.fieldsManagerSE.isIpsrStepTwoEnablerTypes2026()
      ? ComplementaryInnovationComponent.ENABLER_TYPE_IDS_2026
      : ComplementaryInnovationComponent.ENABLER_TYPE_IDS_LEGACY;
  }

  loadInformationComplementaryInnovations(): void {
    this.api.resultsSE.GETinnovationpathwayStepTwo().subscribe((resp: any) => {
      resp.response.forEach(inno => {
        inno.full_name = `${inno.result_code} ${inno.title} ${inno.initiative_official_code} ${inno.initiative_official_code} ${inno.lead_contact_person} yes no`;
        this.isInitiative = this.api.rolesSE.validateInitiative(inno.initiative_id);
        inno.permissos = this.isInitiative;
      });

      this.informationInnovationDevelopments = resp.response.filter((element: any) => this.enablerTypeIds().includes(element.result_type_id));

      this.innovationPackageCreatorBody.forEach(selected => {
        const foundDevelopment = this.informationInnovationDevelopments.find(item => item.result_id === selected.result_id);
        if (foundDevelopment) {
          foundDevelopment.selected = true;
        }
      });
    });
  }

  saveEdit(): void {
    this.loadInformationComplementaryInnovations();
    this.loadInnovationPackage();
  }
}
