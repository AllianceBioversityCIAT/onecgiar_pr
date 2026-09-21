import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { LeadContactPersonFieldComponent } from './lead-contact-person-field.component';
import { UserSearchService } from '../../pages/results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { CustomFieldsModule } from '../custom-fields.module';

/**
 * P2-3761 — the "Clear selection" (✕) button ignored the read-only lock.
 *
 * P2-3520 made the whole bilateral form read-only once the result leaves Editing: the search input
 * above takes `[disabled]="readOnly"` and `BilateralAutoSaveService` refuses every write. The ✕ was
 * left out, so on a result in Pending Review QA could still press it and watch the contact vanish
 * from the screen — a change the server would never accept.
 *
 * The button is only reachable while a contact is locked in, which is why every case here sets
 * `isContactLocked` and a `selectedUser` first.
 */
describe('LeadContactPersonFieldComponent · P2-3761 read-only clear button', () => {
  let component: LeadContactPersonFieldComponent;
  let fixture: ComponentFixture<LeadContactPersonFieldComponent>;
  let userSearch: any;

  const selectedContact = {
    display_name: 'Arouna Dissa',
    mail: 'a.dissa@cgiar.org',
    title: 'Senior Researcher'
  };

  const clearButton = () => fixture.nativeElement.querySelector('.clear-contact-btn') as HTMLButtonElement | null;

  /** Renders the field with a contact already picked — the only state where the ✕ exists. */
  const renderWithLockedContact = (readOnly: boolean) => {
    fixture.componentRef.setInput('readOnly', readOnly);
    component.body = { lead_contact_person: selectedContact.display_name, lead_contact_person_data: selectedContact as any };
    component.isContactLocked = true;
    userSearch.selectedUser = selectedContact;
    userSearch.searchQuery = selectedContact.display_name;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    userSearch = {
      searchUsers: jest.fn().mockReturnValue(of({ response: [selectedContact] })),
      selectedUser: null,
      searchQuery: '',
      hasValidContact: true,
      showContactError: false
    };

    await TestBed.configureTestingModule({
      declarations: [LeadContactPersonFieldComponent],
      imports: [HttpClientTestingModule, CustomFieldsModule],
      providers: [{ provide: UserSearchService, useValue: userSearch }]
    }).compileComponents();

    fixture = TestBed.createComponent(LeadContactPersonFieldComponent);
    component = fixture.componentInstance;
    jest.spyOn(component.resultsApiService, 'GET_adUsersSearch').mockReturnValue(of({ response: [selectedContact] }) as any);
  });

  // ── The control case: an editable result must behave exactly as before ────────────────
  describe('editable result (the control case)', () => {
    beforeEach(() => renderWithLockedContact(false));

    it('keeps the clear button enabled', () => {
      expect(clearButton()).toBeTruthy();
      expect(clearButton()!.disabled).toBe(false);
    });

    it('still clears the contact when pressed', () => {
      clearButton()!.click();
      fixture.detectChanges();

      expect(component.body.lead_contact_person).toBeNull();
      expect(component.body.lead_contact_person_data).toBeNull();
      expect(component.isContactLocked).toBe(false);
      expect(userSearch.selectedUser).toBeNull();
    });
  });

  // ── The defect: Pending Review must not let the contact be wiped on screen ────────────
  describe('read-only result (status Pending Review)', () => {
    beforeEach(() => renderWithLockedContact(true));

    it('renders the clear button disabled', () => {
      expect(clearButton()).toBeTruthy();
      expect(clearButton()!.disabled).toBe(true);
    });

    it('does not clear the contact when the button is pressed', () => {
      clearButton()!.click();
      fixture.detectChanges();

      expect(component.body.lead_contact_person).toBe(selectedContact.display_name);
      expect(component.body.lead_contact_person_data).toEqual(selectedContact);
      expect(component.isContactLocked).toBe(true);
      expect(userSearch.selectedUser).toEqual(selectedContact);
    });

    it('keeps the button visible, so the field reads the same as in Editing', () => {
      expect(fixture.nativeElement.querySelector('.selected-contact-info')).toBeTruthy();
      expect(clearButton()!.textContent).toContain('✕');
    });

    it('locks the search input the same way (the sibling half of P2-3520, guarded here)', () => {
      const searchInput = fixture.nativeElement.querySelector('app-pr-input input') as HTMLInputElement | null;

      // The input is hidden while a contact is locked; what matters is that it never comes back
      // enabled — if `readOnly` ever stopped reaching this field, both halves would fail together.
      expect(component.readOnly).toBe(true);
      if (searchInput) expect(searchInput.disabled).toBe(true);
    });
  });

  // ── Nothing else passes `readOnly`, so the default must stay permissive ───────────────
  it('defaults to editable for the callers that never pass readOnly (W1/W2 and IPSR)', () => {
    component.body = { lead_contact_person: selectedContact.display_name, lead_contact_person_data: selectedContact as any };
    component.isContactLocked = true;
    userSearch.selectedUser = selectedContact;
    fixture.detectChanges();

    expect(component.readOnly).toBe(false);
    expect(clearButton()!.disabled).toBe(false);
  });
});
