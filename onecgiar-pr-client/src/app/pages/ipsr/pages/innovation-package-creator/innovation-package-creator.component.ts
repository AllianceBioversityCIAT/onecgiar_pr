import { Component, DoCheck, OnInit, signal, NgZone, inject } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { InnovationPackageCreatorBody } from './model/innovation-package-creator.model';
import { Router } from '@angular/router';
import { ManageInnovationsListService } from '../../services/manage-innovations-list.service';
import { GeoScopeEnum } from '../../../../shared/enum/geo-scope.enum';

@Component({
  selector: 'app-innovation-package-creator',
  templateUrl: './innovation-package-creator.component.html',
  styleUrls: ['./innovation-package-creator.component.scss'],
  standalone: false
})
export class InnovationPackageCreatorComponent implements DoCheck, OnInit {
  innovationPackageCreatorBody = new InnovationPackageCreatorBody();
  searchText = '';
  allInitiatives = [];
  cgiarEntityTypes = [];
  status: boolean = true;
  statusPdialog: boolean = false;

  reportingAccessLoaded = signal<boolean>(false);
  sourceInitiatives = signal<any[]>([]);
  closedOptions: any[] = [];
  private readonly ngZone = inject(NgZone);

  constructor(
    public api: ApiService,
    private router: Router,
    public manageInnovationsListSE: ManageInnovationsListService
  ) {}

  ngOnInit(): void {
    this.sourceInitiatives.set(this.api.dataControlSE.myInitiativesListIPSRByPortfolio || []);

    this.api.dataControlSE.getCurrentIPSRPhase().subscribe(() => {
      this.GET_AllInitiatives();
    });

    if (this.api.dataControlSE.reportingCurrentPhase.phaseId) {
      this.loadReportingAccess();
    } else {
      this.api.dataControlSE.getCurrentPhases().subscribe(() => {
        this.loadReportingAccess();
      });
    }

    if (this.api.dataControlSE?.myInitiativesListIPSRByPortfolio.length) {
      this.api.rolesSE.readOnly = false;
      if (this.api?.dataControlSE?.currentResult?.status) this.api.dataControlSE.currentResult.status = null;
    }
  }

  private loadReportingAccess(): void {
    const phaseId = this.api.dataControlSE.reportingCurrentPhase.phaseId;
    if (!phaseId) return;

    this.api.resultsSE.GET_phaseReportingInitiatives(phaseId).subscribe({
      next: (res) => {
        const programs: any[] = res.response?.science_programs || [];
        this.closedOptions = programs
          .filter(p => !p.reporting_enabled)
          .map(p => ({ initiative_id: p.id }));
        this.reportingAccessLoaded.set(true);
      },
      error: () => {
        this.reportingAccessLoaded.set(true);
      }
    });
  }

  selectInnovationEvent(e) {
    this.innovationPackageCreatorBody.result_id = e.result_id;

    this.api.resultsSE.GETInnovationByResultId(e.result_id).subscribe(({ response }) => {
      this.innovationPackageCreatorBody.geo_scope_id = response.geographic_scope_id == 3 ? 4 : response.geographic_scope_id;
      this.innovationPackageCreatorBody.regions = response.hasRegions;
      this.innovationPackageCreatorBody.countries = response.hasCountries;
      this.innovationPackageCreatorBody.result_code = response.result_code;
      this.innovationPackageCreatorBody.official_code = response.official_code;
      this.innovationPackageCreatorBody.title = response.title;
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  get areLists(): boolean {
    switch (this.innovationPackageCreatorBody?.geo_scope_id) {
      case GeoScopeEnum.GLOBAL:
        return true;
      case GeoScopeEnum.REGIONAL:
        return !!this.innovationPackageCreatorBody.regions.length;
      case GeoScopeEnum.COUNTRY:
        return !!this.innovationPackageCreatorBody.countries.length;
      case GeoScopeEnum.SUB_NATIONAL:
        return this.innovationPackageCreatorBody.countries?.some((country: any) => country?.sub_national?.length);
      default:
        return false;
    }
  }

  GET_cgiarEntityTypes(callback) {
    this.api.resultsSE.GET_cgiarEntityTypes().subscribe({
      next: ({ response }) => {
        response.forEach(element => {
          element.isLabel = true;
        });
        callback(response);
      },
      error: err => {
        callback?.();
      }
    });
  }

  GET_AllInitiatives(callback?) {
    if (!this.api.rolesSE.isAdmin) return;

    const activePortfolio = this.api.dataControlSE?.IPSRCurrentPhase?.portfolioAcronym;

    this.api.resultsSE.GET_AllInitiatives(activePortfolio).subscribe({
      next: ({ response }) => {
        this.GET_cgiarEntityTypes(entityTypesResponse => {
          this.cgiarEntityTypes = entityTypesResponse;
          this.allInitiatives = response;

          this.allInitiatives.forEach(initiative => {
            const { code, name } = initiative?.obj_cgiar_entity_type || {};
            initiative.typeCode = code;
            initiative.typeName = name;
          });

          const groupList = entityTypesResponse;
          const resultList = [];
          groupList?.forEach(groupItem => {
            const initsGroup = this.allInitiatives.filter(item => item.typeCode == groupItem.code);
            if (initsGroup?.length) resultList.push(groupItem, ...initsGroup);
          });
          this.allInitiatives = resultList;
          this.sourceInitiatives.set(resultList);
        });
      },
      error: err => {
        console.error(err);
      },
      complete: () => {
        callback?.();
      }
    });
  }

  onSaveSection() {
    this.innovationPackageCreatorBody.geoScopeSubNatinals.forEach(resp => {
      const subCountry = this.innovationPackageCreatorBody.countries.filter(country => resp.idCountry == country.id)[0];
      if (resp.isRegister != 0) {
        subCountry['result_countries_sub_national'].push(resp);
      }
    });

    this.api.resultsSE.POSTResultInnovationPackage(this.innovationPackageCreatorBody).subscribe({
      next: ({ response }) => {
        this.router.navigateByUrl(
          `/ipsr/detail/${response.newInnovationHeader.result_code}/general-information?phase=${response.newInnovationHeader.version_id}`
        );
        this.api.alertsFe.show({ id: 'ipsr-creator', title: 'Innovation package created', status: 'success', closeIn: 500 });
      },
      error: err => {
        this.api.alertsFe.show({ id: 'ipsr-creator-error', title: 'Error!', description: err?.error?.message, status: 'error' });
        this.innovationPackageCreatorBody.countries.forEach(resp => {
          resp['result_countries_sub_national'] = [];
        });
      }
    });
  }

  /** Throttle for the mandatory-field DOM scan (was running synchronously on every CD cycle). */
  private static readonly SCAN_THROTTLE_MS = 150;
  private lastScanAt = 0;
  private scanScheduled = false;
  private trailingScanId: any = null;

  ngDoCheck(): void {
    // Same fix as Result Detail (P2-2967/P2-2972): throttle (leading + trailing edge) the DOM scan,
    // coalesce into one rAF run OUTSIDE Angular's zone, tick only when it changed.
    if (this.scanScheduled) return;
    const elapsed = Date.now() - this.lastScanAt;
    if (elapsed >= InnovationPackageCreatorComponent.SCAN_THROTTLE_MS) {
      this.runFeedbackScan();
    } else if (this.trailingScanId === null) {
      this.ngZone.runOutsideAngular(() => {
        this.trailingScanId = setTimeout(() => {
          this.trailingScanId = null;
          this.runFeedbackScan();
        }, InnovationPackageCreatorComponent.SCAN_THROTTLE_MS - elapsed);
      });
    }
  }

  private runFeedbackScan(): void {
    if (this.trailingScanId !== null) {
      clearTimeout(this.trailingScanId);
      this.trailingScanId = null;
    }
    this.lastScanAt = Date.now();
    this.scanScheduled = true;
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.scanScheduled = false;
        const before = this.api.dataControlSE.fieldFeedbackList();
        this.api.dataControlSE.someMandatoryFieldIncompleteResultDetail('.section_container');
        if (this.api.dataControlSE.fieldFeedbackList() !== before) {
          this.ngZone.run(() => {});
        }
      });
    });
  }
}
