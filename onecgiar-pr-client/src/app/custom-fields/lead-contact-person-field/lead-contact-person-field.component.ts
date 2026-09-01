import { ChangeDetectionStrategy, Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FieldsManagerService } from '../../shared/services/fields-manager.service';
import { debounceTime, distinctUntilChanged, Subject, switchMap, EMPTY, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  /** P25: show required asterisk without using `.pr-input.mandatory` scan on free-text search. */
  @Input() required = false;
  /** P2-3201: render the field guidance as an ⓘ tooltip instead of the inline grey description box. */
  @Input() guidanceAsTooltip = false;
  /**
   * P2-3520: the whole form is read-only once the result leaves Editing. Separate from
   * `isContactLocked`, which is this field's own "a contact is already picked" state — that one the
   * field clears itself, this one is imposed from outside.
   */
  @Input() readOnly = false;
  isContactLocked: boolean = false;
  /**
   * True while the input still holds a name loaded from the result rather than typed.
   *
   * Public because the save guard in the consuming section needs the same distinction this field
   * already makes in `onContactBlur`: only a name the user *typed* can be "not found". A name
   * hydrated from the result is legitimate data — every result created before the AD link existed
   * (`lead_contact_person_id`, migration 1751462633282) stores the contact as free text with no
   * directory match, as do results reported through the W3/Bilateral API.
   */
  queryCameFromHydration = false;

  private readonly fieldsManager = inject(FieldsManagerService);

  get leadContactField() {
    return this.fieldsManager.fields()['[general-info]-lead_contact_person'] ?? {};
  }

  /**
   * A contact counts as complete once there is a name, with or without a directory match.
   *
   * Requiring the match would leave results reported through the W3/Bilateral API showing an
   * incomplete field their centre user cannot fix: those producers legitimately name people
   * outside CGIAR AD (consultants, partner staff). The directory link is enrichment — nothing
   * notifies through it and every reader of the FK is null-guarded.
   */
  get hasSelectedContact(): boolean {
    return !!this.body?.lead_contact_person?.trim();
  }

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
            return this.resultsApiService.GET_adUsersSearch(trimmedQuery).pipe(catchError(() => of({ response: [] })));
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
        this.queryCameFromHydration = true;
      } else if (this.body.lead_contact_person) {
        if (this.userSearchService.selectedUser && this.userSearchService.selectedUser.display_name === this.body.lead_contact_person) {
          this.isContactLocked = true;
          this.userSearchService.hasValidContact = true;
          this.queryCameFromHydration = true;
        } else {
          this.userSearchService.searchQuery = this.body.lead_contact_person;
          this.isContactLocked = false;
          this.queryCameFromHydration = true;
        }
      } else {
        this.userSearchService.selectedUser = null;
        this.userSearchService.searchQuery = '';
        this.isContactLocked = false;
        this.queryCameFromHydration = false;
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
    this.queryCameFromHydration = false;
    if (this.body) {
      this.body.lead_contact_person = null;
      this.body.lead_contact_person_data = null;
    }

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
    this.queryCameFromHydration = false;

    this.body.lead_contact_person = null;
    this.body.lead_contact_person_data = null;
  }

  onContactBlur(): void {
    // Only what the user typed can be "not found". A name hydrated from the result — the
    // free-text fallback the API stores when the directory has no match — is valid data, and
    // flagging it made the first click away from the field accuse the user of someone else's
    // input.
    if (this.queryCameFromHydration) return;

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

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; //NOSONAR
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
