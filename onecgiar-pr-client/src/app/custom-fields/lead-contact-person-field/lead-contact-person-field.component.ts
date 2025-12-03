import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subject, switchMap, EMPTY } from 'rxjs';

import { User, UserSearchResponse } from '../../pages/results/pages/result-detail/pages/rd-general-information/models/userSearchResponse';
import { UserSearchService } from '../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { ResultsApiService } from '../../shared/services/api/results-api.service';

@Component({
  selector: 'app-lead-contact-person-field',
  templateUrl: './lead-contact-person-field.component.html',
  styleUrl: './lead-contact-person-field.component.scss',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false
})
export class LeadContactPersonFieldComponent implements OnChanges {
  @Input() body: { lead_contact_person?: string | null; lead_contact_person_data?: User | null };
  isContactLocked: boolean = false;
  searchResults: User[] = [];
  showResults: boolean = false;
  isSearching: boolean = false;

  private readonly searchSubject = new Subject<string>();
  private lastQueryWasValidEmail: boolean = false;
  private autoSelectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    public userSearchService: UserSearchService,
    public resultsApiService: ResultsApiService
  ) {
    this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((query: string) => {
          const trimmedQuery = query;
          if (trimmedQuery.length >= 4) {
            this.isSearching = true;
            this.showResults = false;
            return this.resultsApiService.GET_adUsersSearch(trimmedQuery);
          } else {
            this.searchResults = [];
            this.showResults = false;
            this.isSearching = false;
            return EMPTY;
          }
        })
      )
      .subscribe({
        next: (response: UserSearchResponse | { response: User[] }) => {
          const filteredResults = this.filterValidUsers(response?.response || []);

          if (filteredResults.length === 0) {
            this.userSearchService.showContactError = true;
          }

          this.searchResults = filteredResults;
          this.showResults = true;
          this.isSearching = false;
          this.userSearchService.hasValidContact = this.searchResults.length > 0 || !this.userSearchService.searchQuery.trim();

          if (this.lastQueryWasValidEmail && filteredResults.length === 1) {
            this.scheduleAutoClickIfSingleResult();
          }
        },
        error: () => {
          this.searchResults = [];
          this.showResults = false;
          this.isSearching = false;
          this.userSearchService.hasValidContact = !this.userSearchService.searchQuery.trim();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['body']) {
      if (this.body.lead_contact_person_data) {
        this.userSearchService.selectedUser = this.body.lead_contact_person_data;
        this.userSearchService.searchQuery = this.body.lead_contact_person;
        this.isContactLocked = true;
        this.userSearchService.hasValidContact = true;
      } else if (this.body.lead_contact_person) {
        if (this.userSearchService.selectedUser && this.userSearchService.selectedUser.display_name === this.body.lead_contact_person) {
          this.isContactLocked = true;
          this.userSearchService.hasValidContact = true;
        } else {
          this.userSearchService.searchQuery = this.body.lead_contact_person;
          this.isContactLocked = false;
        }
      } else {
        this.userSearchService.selectedUser = null;
        this.userSearchService.searchQuery = '';
        this.isContactLocked = false;
      }
    }
  }

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

  onSearchInput(event: string | Event): void {
    if (this.isContactLocked) return;

    let query: string = '';

    if (typeof event === 'string') {
      query = event;
    } else if (event && 'target' in event) {
      const target = event.target as HTMLInputElement;
      if (target?.value !== undefined) {
        query = target.value;
      }
    }

    query = query ?? '';

    this.userSearchService.searchQuery = query;
    this.userSearchService.selectedUser = null;
    this.userSearchService.showContactError = false;

    this.lastQueryWasValidEmail = this.isEmail(query);

    if (query) {
      this.userSearchService.hasValidContact = false;
      this.userSearchService.showContactError = false;
      this.searchSubject.next(query);
    } else {
      this.resetContactState();
    }
  }

  selectUser(user: User): void {
    this.userSearchService.selectedUser = user;
    this.userSearchService.searchQuery = user.display_name;
    this.searchResults = [];
    this.showResults = false;
    this.userSearchService.hasValidContact = true;
    this.userSearchService.showContactError = false;
    this.isContactLocked = true;

    this.body.lead_contact_person = user.display_name;
    this.body.lead_contact_person_data = user;
  }

  clearContact(): void {
    this.userSearchService.selectedUser = null;
    this.userSearchService.searchQuery = '';
    this.searchResults = [];
    this.showResults = false;
    this.isSearching = false;
    this.userSearchService.hasValidContact = true;
    this.userSearchService.showContactError = false;
    this.isContactLocked = false;

    this.body.lead_contact_person = null;
    this.body.lead_contact_person_data = null;
  }

  onContactBlur(): void {
    if (!this.isContactLocked && this.userSearchService.searchQuery.trim() && !this.userSearchService.selectedUser) {
      this.userSearchService.hasValidContact = false;
      this.userSearchService.showContactError = true;
    }
  }

  private resetContactState(): void {
    this.body.lead_contact_person = null;
    this.body.lead_contact_person_data = null;
    this.searchResults = [];
    this.showResults = false;
    this.isSearching = false;
    this.userSearchService.hasValidContact = true;
    this.userSearchService.showContactError = false;
  }

  private isEmail(value: string): boolean {
    if (!value) {
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(value.trim());
  }

  private scheduleAutoClickIfSingleResult(): void {
    if (this.autoSelectTimeoutId) {
      clearTimeout(this.autoSelectTimeoutId);
    }

    this.autoSelectTimeoutId = setTimeout(() => {
      if (this.isContactLocked) {
        return;
      }

      if (!this.isEmail(this.userSearchService.searchQuery)) {
        return;
      }

      if (typeof document === 'undefined') {
        return;
      }

      const items = document.querySelectorAll('.search-results .search-result-item');

      if (items.length === 1) {
        (items[0] as HTMLElement).click();
      }
    }, 500);
  }
}
