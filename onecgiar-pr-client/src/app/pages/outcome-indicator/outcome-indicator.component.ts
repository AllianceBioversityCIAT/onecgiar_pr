import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../shared/services/api/api.service';
import { OutcomeIndicatorService } from './services/outcome-indicator.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-outcome-indicator-module',
  templateUrl: './outcome-indicator.component.html',
  styleUrls: ['./outcome-indicator.component.scss']
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
  }

  async initializeComponent(): Promise<void> {
    this.api.dataControlSE.getCurrentPhases();

    if (this.api.rolesSE.isAdmin) {
      await this.loadAllInitiatives();
    } else {
      this.api.updateUserData(() => this.setDefaultInitiativeForNonAdmin());
    }
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

  async loadAllInitiatives(): Promise<void> {
    this.api.resultsSE.GET_AllInitiatives().subscribe({
      next: ({ response }) => {
        this.allInitiatives = response;
        this.handleInitiativeQueryParam();
      },
      error: error => console.error('Error loading initiatives:', error)
    });
  }

  handleInitiativeQueryParam(): void {
    const initParam = this.activatedRoute.snapshot.queryParams[this.QUERY_PARAM_INITIATIVE];

    if (initParam) {
      this.outcomeIService.initiativeIdFilter = initParam.toUpperCase();
    } else if (this.allInitiatives.length > 0) {
      this.outcomeIService.initiativeIdFilter = this.allInitiatives[0].official_code;
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
