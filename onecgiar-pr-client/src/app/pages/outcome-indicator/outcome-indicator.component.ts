import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { OutcomeIndicatorService } from './services/outcome-indicator.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-outcome-indicator-module',
  templateUrl: './outcome-indicator.component.html',
  styleUrls: ['./outcome-indicator.component.scss'],
  standalone: false
})
export class OutcomeIndicatorComponent implements OnInit {
  readonly QUERY_PARAM_INITIATIVE = 'init';
  allInitiatives: any[] = [];

  constructor(
    public api: ApiService,
    public outcomeIService: OutcomeIndicatorService,
    public activatedRoute: ActivatedRoute,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.api.dataControlSE.detailSectionTitle('Outcome indicator module');
  }

  async initializeComponent(): Promise<void> {
    this.api.dataControlSE.getCurrentPhases().subscribe();

    if (this.api.rolesSE.isAdmin) {
      await this.loadAllInitiatives();
    } else {
      this.api.updateUserData(() => this.setDefaultInitiativeForNonAdmin());
    }

    this.outcomeIService.loadAllInitiatives();
    this.outcomeIService.getAllPhases();
  }

  handleInitiativeChange() {
    this.updateQueryParams();
    this.outcomeIService.getEOIsData();
    this.outcomeIService.getWorkPackagesData();
    this.outcomeIService.searchText.set('');
  }

  setDefaultInitiativeForNonAdmin(): void {
    const defaultInitiative = this.api.dataControlSE.myInitiativesList[0]?.official_code;
    const initParam = this.activatedRoute.snapshot.queryParams[this.QUERY_PARAM_INITIATIVE];

    this.outcomeIService.initiativeIdFilter = this.api.dataControlSE.myInitiativesList.some(init => init.official_code === initParam?.toUpperCase())
      ? initParam
      : defaultInitiative;

    this.updateQueryParams();
    this.outcomeIService.getEOIsData();
    this.outcomeIService.getWorkPackagesData();
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

  private processEntityTypes(entityTypesResponse: any[]): void {
    entityTypesResponse.forEach(element => {
      element.isLabel = true;
    });
    this.groupInitiativesByType(entityTypesResponse);
  }

  private mapInitiativeData(initiative: any) {
    const { code, name } = initiative?.obj_cgiar_entity_type || {};
    return { ...initiative, typeCode: code, typeName: name };
  }

  private groupInitiativesByType(entityTypesResponse: any[]): void {
    this.allInitiatives = entityTypesResponse.reduce((acc, groupItem) => {
      const initsGroup = this.allInitiatives.filter(item => item.typeCode === groupItem.code);
      if (initsGroup.length) {
        acc.push(groupItem, ...initsGroup);
      }
      return acc;
    }, []);

    this.handleInitiativeQueryParam();
  }

  async loadAllInitiatives(): Promise<void> {
    if (!this.api.rolesSE.isAdmin) return;

    this.api.resultsSE.GET_AllInitiatives().subscribe({
      next: ({ response }) => {
        this.allInitiatives = response.map(this.mapInitiativeData);
        this.GET_cgiarEntityTypes(response => this.processEntityTypes(response));
      },
      error: error => console.error('Error loading initiatives:', error)
    });
  }

  handleInitiativeQueryParam(): void {
    const initParam = this.activatedRoute.snapshot.queryParams[this.QUERY_PARAM_INITIATIVE];

    if (initParam) {
      this.outcomeIService.initiativeIdFilter = initParam.toUpperCase();
    } else if (this.allInitiatives.length > 0) {
      this.outcomeIService.initiativeIdFilter = this.allInitiatives[1].official_code;
      this.updateQueryParams();
    }
    this.outcomeIService.getEOIsData();
    this.outcomeIService.getWorkPackagesData();
  }

  updateQueryParams(): void {
    if (this.router.url.includes('/outcome-indicator-module/indicator-details')) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [this.QUERY_PARAM_INITIATIVE]: this.outcomeIService.initiativeIdFilter },
      queryParamsHandling: 'merge'
    });
  }
}
