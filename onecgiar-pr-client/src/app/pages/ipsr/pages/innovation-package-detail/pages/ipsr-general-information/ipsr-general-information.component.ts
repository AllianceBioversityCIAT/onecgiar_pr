import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { IpsrGeneralInformationBody } from './model/ipsr-general-information.model';
import { User } from '../../../../../results/pages/result-detail/pages/rd-general-information/models/userSearchResponse';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { UserSearchService } from '../../../../../results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';

@Component({
    selector: 'app-ipsr-general-information',
    templateUrl: './ipsr-general-information.component.html',
    styleUrls: ['./ipsr-general-information.component.scss'],
    standalone: false
})
export class IpsrGeneralInformationComponent implements OnInit {
  ipsrGeneralInformationBody = new IpsrGeneralInformationBody();
  searchQuery: string = '';
  searchResults: User[] = [];
  selectedUser: User | null = null;
  showResults: boolean = false;
  isSearching: boolean = false;
  hasValidContact: boolean = true;
  showContactError: boolean = false;
  private searchSubject = new Subject<string>();

  private filterValidUsers(users: User[]): User[] {
    return users.filter(user => {
      if (!user.mail || user.mail.trim() === '') {
        return false;
      }

      if (user.mail.toLowerCase().includes('test')) {
        return false;
      }

      return true;
    });
  }

  constructor(
    public api: ApiService,
    public scoreSE: ScoreService,
    public ipsrDataControlSE: IpsrDataControlService,
    private userSearchService: UserSearchService
  ) {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (query.length >= 4) {
            this.isSearching = true;
            return this.userSearchService.searchUsers(query);
          } else {
            this.searchResults = [];
            this.showResults = false;
            this.isSearching = false;
            return [];
          }
        })
      )
      .subscribe({
        next: response => {
          const filteredResults = this.filterValidUsers(response.response || []);
          this.searchResults = filteredResults;
          this.showResults = true;
          this.isSearching = false;

          if (this.searchResults.length === 0 && this.searchQuery.trim()) {
            this.hasValidContact = false;
          }
        },
        error: error => {
          console.error('Error searching users:', error);
          this.searchResults = [];
          this.showResults = false;
          this.isSearching = false;

          if (this.searchQuery.trim()) {
            this.hasValidContact = false;
          }
        }
      });
  }

  ngOnInit(): void {
    this.getSectionInformation();
    this.api.dataControlSE.detailSectionTitle('General information');
  }

  getSectionInformation() {
    this.api.resultsSE.GETInnovationByResultId(this.ipsrDataControlSE.resultInnovationId).subscribe(({ response }) => {
      this.ipsrGeneralInformationBody = response;

      if (this.ipsrGeneralInformationBody.lead_contact_person_data) {
        this.selectedUser = this.ipsrGeneralInformationBody.lead_contact_person_data;
        this.searchQuery = this.ipsrGeneralInformationBody.lead_contact_person_data.displayName;
      } else if (this.ipsrGeneralInformationBody.lead_contact_person) {
        this.searchQuery = this.ipsrGeneralInformationBody.lead_contact_person;
      } else {
        this.searchQuery = '';
      }
    });
  }

  GET_investmentDiscontinuedOptions(result_type_id) {
    this.api.resultsSE.GET_investmentDiscontinuedOptions(result_type_id).subscribe(({ response }) => {
      this.convertChecklistToDiscontinuedOptions(response);
    });
  }

  convertChecklistToDiscontinuedOptions(response) {
    const options = [...response];
    options.forEach(option => {
      const found = this.ipsrGeneralInformationBody.discontinued_options.find(
        discontinuedOption => discontinuedOption.investment_discontinued_option_id == option.investment_discontinued_option_id
      );
      if (found) {
        option.value = true;
        option.description = found?.description;
      }
    });
    this.ipsrGeneralInformationBody.discontinued_options = options;
  }

  onChangeKrs() {
    if (this.ipsrGeneralInformationBody.is_krs === false) this.ipsrGeneralInformationBody.is_krs = null;
  }

  onSaveSection() {
    if (this.searchQuery.trim() && !this.selectedUser) {
      this.hasValidContact = false;
      this.showContactError = true;
      return;
    }

    this.api.resultsSE.PATCHIpsrGeneralInfo(this.ipsrGeneralInformationBody, this.ipsrDataControlSE.resultInnovationId).subscribe({
      next: resp => {
        this.getSectionInformation();
      },
      error: err => {
        console.error(err);
        this.getSectionInformation();
      }
    });
  }

  climateInformation() {
    return `<strong>Climate change tag guidance</strong>
    <br>
    There are three climate targets at systems level:

    <ul>
      <li>Turn agriculture and forest systems into a net sink for carbon by 2050 (climate mitigation target).</li>
      <li>Equip 500 million small-scale producers to be more resilient by 2030 (climate adaptation target).</li>
      <li>Support countries in implementing NAPs and NDCs, and increased ambition in climate actions by 2030 (climate policy target).</li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target the climate mitigation, adaptation and climate policy objectives of CGIAR as put forward in its strategy.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the three CGIAR climate-related strategy objectives – namely, climate mitigation, climate adaptation and climate policy, even though it is not the principal focus of output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally about meeting any of the three CGIAR climate-related strategy objectives – namely, climate mitigation, climate adaptation and climate policy, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  nutritionInformation() {
    return `<strong>Nutrition, health and food security tag guidance</strong>
    <br>

    There are two food security and nutrition targets for at systems level:

    <ul>
      <li>To end hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food. </li>
      <li>To reduce cases of foodborne illness (600 million annually) and zoonotic disease (1 billion annually) by one third.</li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of nutrition, health and food security.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of nutrition, health and food security, but nutrition, health and food security is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of nutrition, health and food security, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  environmentInformation() {
    return `<strong>Environmental health and biodiversity tag guidance</strong>
    <br>

    There are three environmental targets and one biodiversity target at systems level:

    <ul>
      <li>Stay within planetary and regional environmental boundaries: consumptive water use in food production of less than 2,500 km³ per year (with a focus on the most stressed basins), zero net deforestation, nitrogen application of 90 Tg per year (with a redistribution towards low-input farming systems) and increased use efficiency; and phosphorus application of 10 Tg per year.</li>
      <li>Maintain the genetic diversity of seed varieties, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed genebanks at the national, regional, and international levels.</li>
      <li>In addition, water conservation and management, restoration of degraded lands/soils, restoration of biodiversity in situ, and management of pollution related to food systems are key areas of environmental impacts to which the CGIAR should contribute. </li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker (see reference list above), but it has not been found to target any aspect of environmental health and biodiversity.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of environmental health and biodiversity, but environmental health and biodiversity is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of environmental health and biodiversity, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  povertyInformation() {
    return `<strong>Poverty reduction, livelihoods and jobs tag guidance</strong>
    <br>

    There are two poverty reduction, livelihoods and jobs targets at systems level:

    <ul>
      <li>Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP).</li>
      <li>Reduce by at least half the proportion of men, women and children of all ages living in poverty in all its dimensions, according to national definitions.</li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of poverty reduction, livelihoods and jobs.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any aspect of poverty reduction, livelihoods and jobs, but poverty reduction, livelihoods and jobs is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of poverty reduction, livelihoods and jobs, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  genderInformation() {
    return `<strong>Gender equality tag guidance</strong>
    <br/>

    There are two gender-related targets at systems level.

    <ul>
    <li>To close the gender gap in rights to economic resources, access to ownership and control over land and natural resources for over 500 million women who work in food, land and water systems.</li>
    <li>To offer rewardable opportunities to 267 million young people who are not in employment, education or training.</li>
    </ul>

    Three scores are possible:
    <ul>
    <li><strong>0 = Not targeted:</strong>  The output/outcome/activity has been screened against the marker but has not been found to target gender equality.</li>
    <li><strong>1 = Significant:</strong> Gender equality is an important and deliberate objective, but not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> Gender equality is the main objective of the output/outcome/activity and is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this gender equality objective.</li>
    </ul>`;
  }

  leadContactPersonTextInfo() {
    return `For more precise results, we recommend searching by email or username. 
    <br><strong>Examples:</strong> j.smith@cgiar.org; jsmith; JSmith`;
  }

  onSearchInput(event: any): void {
    let query = '';

    if (typeof event === 'string') {
      query = event;
    } else if (event?.target?.value !== undefined) {
      query = event.target.value;
    } else if (event && typeof event === 'object' && event.toString() !== '[object InputEvent]') {
      query = event.toString();
    }

    query = query || '';

    this.searchQuery = query;
    this.selectedUser = null;
    this.showContactError = false;

    if (query.trim()) {
      this.hasValidContact = false;
      this.searchSubject.next(query);
    } else {
      this.ipsrGeneralInformationBody.lead_contact_person = null;
      this.ipsrGeneralInformationBody.lead_contact_person_data = null;
      this.searchResults = [];
      this.showResults = false;
      this.isSearching = false;
      this.hasValidContact = true;
      this.showContactError = false;
    }
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.searchQuery = user.displayName;
    this.searchResults = [];
    this.showResults = false;
    this.hasValidContact = true;
    this.showContactError = false;

    this.ipsrGeneralInformationBody.lead_contact_person = user.displayName;
    this.ipsrGeneralInformationBody.lead_contact_person_data = user;
  }

  onContactBlur(): void {
    if (this.searchQuery.trim() && !this.selectedUser) {
      this.hasValidContact = false;
      this.showContactError = true;
    }
  }
}
