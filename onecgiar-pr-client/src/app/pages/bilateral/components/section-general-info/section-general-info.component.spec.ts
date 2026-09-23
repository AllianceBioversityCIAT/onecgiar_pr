import { readFileSync } from 'fs';
import { join } from 'path';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';

import { SectionGeneralInfoComponent } from './section-general-info.component';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { UserSearchService } from '../../../results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';

describe('SectionGeneralInfoComponent', () => {
  let fixture: ComponentFixture<SectionGeneralInfoComponent>;
  let component: any;
  let autoSave: any;
  let mdsTracker: any;
  let creation: any;
  let http: any;
  let route: any;
  let userSearch: any;

  const TAG_URL = 'gender-tag-levels/all';
  const SCORES_URL = 'impact-areas-scores-components/all';

  let tagResponse: any;
  let scoresResponse: any;

  const build = () => {
    fixture = TestBed.createComponent(SectionGeneralInfoComponent);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(async () => {
    tagResponse = of({ response: [{ id: 1, description: 'Not targeted' }] });
    scoresResponse = of({ response: [{ id: 10, name: 'Score A', impact_area: 'Gender', is_active: true }] });

    autoSave = {
      registerField: jest.fn(),
      updateField: jest.fn(),
      updateFieldsBatch: jest.fn(),
      notifyBlur: jest.fn(),
      fieldStatus: signal<Record<string, string>>({}),
      manualSave$: new Subject<string>()
    };
    mdsTracker = { setSectionFields: jest.fn() };
    creation = {
      resultTitle: signal(''),
      resultDescription: signal(''),
      resultLeadContact: signal(''),
      resultLeadContactData: signal<any>(null),
      resultDacLevels: signal<Record<string, number>>({}),
      resultDacSubScores: signal<Record<string, number[]>>({}),
      setDacSubScores: jest.fn()
    };
    userSearch = {
      selectedUser: null,
      searchQuery: '',
      hasValidContact: true,
      showContactError: false
    };

    http = {
      get: jest.fn((url: string) => {
        if (url.includes(TAG_URL)) return tagResponse;
        if (url.includes(SCORES_URL)) return scoresResponse;
        return of({ response: [] });
      })
    };

    route = { snapshot: { params: { id: '5' } } };

    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SectionGeneralInfoComponent],
      providers: [
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralCreationService, useValue: creation },
        { provide: UserSearchService, useValue: userSearch },
        { provide: HttpClient, useValue: http },
        { provide: ActivatedRoute, useValue: route }
      ]
    })
      .overrideTemplate(SectionGeneralInfoComponent, '<div></div>')
      .compileComponents();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create and register its fields', () => {
    build();
    expect(component).toBeTruthy();
    expect(autoSave.registerField).toHaveBeenCalledWith('title', 'text');
    expect(autoSave.registerField).toHaveBeenCalledWith('lead_contact_person', 'text');
    expect(autoSave.registerField).toHaveBeenCalledWith('gender_tag_level_id', 'select');
  });

  // ── mds tracking effect ──────────────────────────────────────────────
  describe('completeness effect', () => {
    it('counts nothing while the fields are empty', () => {
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: false },
        { key: 'description', label: 'Description', filled: false },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: false }
      ]);
    });

    it('ignores a placeholder draft title', () => {
      creation.resultTitle.set('Bilateral Draft #12');
      creation.resultDescription.set('Some description');
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: false },
        { key: 'description', label: 'Description', filled: true },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: false }
      ]);
    });

    it('counts a real title and a description', () => {
      creation.resultTitle.set('Real title');
      creation.resultDescription.set('Some description');
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: true },
        { key: 'description', label: 'Description', filled: true },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: false }
      ]);
    });

    /**
     * A name counts on its own, with or without a directory match. Results reported through the
     * W3/Bilateral API can legitimately name someone outside CGIAR AD, and requiring the match
     * left those results with an MDS field their centre user had no way to complete.
     */
    it('counts a name-only lead contact, and keeps counting it once matched', () => {
      creation.resultLeadContact.set('Arouna Dissa');
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: false },
        { key: 'description', label: 'Description', filled: false },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: true }
      ]);

      creation.resultLeadContactData.set({ display_name: 'Arouna Dissa', mail: 'a.dissa@ier.ml', title: '' });
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: false },
        { key: 'description', label: 'Description', filled: false },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: true }
      ]);
    });

    // Decision (Cami, P2-3765 18-Sep and P2-3340 cancelled 14-Sep): the word limit is a hint that
    // must not stop the user. Night sweep 2026-09-23: 912a38a58 made an over-limit title an invalid
    // (Submit-blocking) item and was reverted; this pins that it stays a plain, filled field.
    it('an over-limit title stays a plain filled field (the red counter is only a hint)', () => {
      creation.resultTitle.set(Array.from({ length: 35 }, (_, i) => `w${i}`).join(' '));
      creation.resultDescription.set('Some description');
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: true },
        { key: 'description', label: 'Description', filled: true },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: false }
      ]);
    });

    it('does not count an absent lead contact', () => {
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: false },
        { key: 'description', label: 'Description', filled: false },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: false }
      ]);
    });
  });

  // ── creation service sync effects ────────────────────────────────────
  describe('sync effects', () => {
    it('mirrors title, description and lead contact into a fresh body', () => {
      creation.resultTitle.set('T');
      creation.resultDescription.set('D');
      creation.resultLeadContact.set('Jane Doe');
      creation.resultLeadContactData.set({ display_name: 'Jane Doe', mail: 'jane@x.org', title: '' });
      build();
      fixture.detectChanges();
      expect(component.title()).toBe('T');
      expect(component.description()).toBe('D');
      expect(component.leadContactBody().lead_contact_person).toBe('Jane Doe');
      expect(component.leadContactBody().lead_contact_person_data).toEqual({
        display_name: 'Jane Doe',
        mail: 'jane@x.org',
        title: ''
      });
    });

    it('starts with an empty lead contact body when there is none', () => {
      build();
      fixture.detectChanges();
      expect(component.leadContactBody().lead_contact_person).toBeNull();
      expect(component.leadContactBody().lead_contact_person_data).toBeNull();
    });

    it('does not auto-expand additional fields for a lead contact alone (the field is always visible now)', () => {
      creation.resultLeadContact.set('Jane Doe');
      creation.resultLeadContactData.set({ display_name: 'Jane Doe', mail: 'jane@x.org', title: '' });
      build();
      fixture.detectChanges();
      expect(component.showAllFields()).toBe(false);
    });

    it('reassigns a fresh lead contact body (rather than mutating) when the loaded result changes', () => {
      build();
      fixture.detectChanges();
      const before = component.leadContactBody();
      creation.resultLeadContact.set('Jane Doe');
      creation.resultLeadContactData.set({ display_name: 'Jane Doe', mail: 'jane@x.org', title: '' });
      fixture.detectChanges();
      expect(component.leadContactBody()).not.toBe(before);
    });

    it('expands the extra fields when DAC levels are already set', () => {
      creation.resultDacLevels.set({ gender: 2 });
      build();
      fixture.detectChanges();
      expect(component.selectedDacLevels()).toEqual({ gender: 2 });
      expect(component.showAllFields()).toBe(true);
    });

    it('mirrors the DAC sub-scores', () => {
      creation.resultDacSubScores.set({ gender: [1, 2] });
      build();
      fixture.detectChanges();
      expect(component.selectedSubScores()).toEqual({ gender: [1, 2] });
    });
  });

  // ── lead contact body reactivity (fed to <app-lead-contact-person-field>) ──
  describe('lead contact body', () => {
    it('commits an autosave batch and the mds tracker once the child sets both name and directory match', () => {
      build();
      fixture.detectChanges();
      mdsTracker.setSectionFields.mockClear();
      autoSave.updateFieldsBatch.mockClear();

      const body = component.leadContactBody();
      body.lead_contact_person = 'New Contact';
      body.lead_contact_person_data = { display_name: 'New Contact', mail: 'new@x.org', title: '' };

      expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith({
        lead_contact_person: 'New Contact',
        lead_contact_person_data: { display_name: 'New Contact', mail: 'new@x.org', title: '' }
      });
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: false },
        { key: 'description', label: 'Description', filled: false },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: true }
      ]);
    });

    /**
     * Regression lock. The constructor effect runs on mount before the hydration effects have copied
     * the loaded contact in, so it used to PATCH `lead_contact_person: null` over the stored one
     * every time the editor was opened — and, before the id fix, onto a foreign row.
     */
    it('saves nothing on mount, with or without a loaded lead contact', () => {
      build();
      fixture.detectChanges();
      expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();

      creation.resultLeadContact.set('Jane Doe');
      creation.resultLeadContactData.set({ display_name: 'Jane Doe', mail: 'jane@x.org', title: '' });
      fixture.detectChanges();
      expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();

      // The MDS tracker, which never writes to the server, still runs.
      expect(mdsTracker.setSectionFields).toHaveBeenCalled();
    });

    it('saves again when the user restores the contact the result was loaded with', () => {
      const jane = { display_name: 'Jane Doe', mail: 'jane@x.org', title: '' };
      creation.resultLeadContact.set('Jane Doe');
      creation.resultLeadContactData.set(jane);
      build();
      fixture.detectChanges();
      autoSave.updateFieldsBatch.mockClear();

      const body = component.leadContactBody();
      body.lead_contact_person = 'John Roe';
      body.lead_contact_person_data = { display_name: 'John Roe', mail: 'john@x.org', title: '' };
      expect(autoSave.updateFieldsBatch).toHaveBeenCalledTimes(1);

      body.lead_contact_person = 'Jane Doe';
      body.lead_contact_person_data = { ...jane };
      expect(autoSave.updateFieldsBatch).toHaveBeenLastCalledWith({
        lead_contact_person: 'Jane Doe',
        lead_contact_person_data: { display_name: 'Jane Doe', mail: 'jane@x.org', title: '' }
      });
    });

    it('does not commit while only the name has been set (matches selectUser()/clearContact() ordering)', () => {
      build();
      fixture.detectChanges();
      autoSave.updateFieldsBatch.mockClear();

      component.leadContactBody().lead_contact_person = 'Only a name';

      expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();
    });

    it('commits a clear (both null) the same way it commits a selection', () => {
      creation.resultLeadContact.set('Jane Doe');
      creation.resultLeadContactData.set({ display_name: 'Jane Doe', mail: 'jane@x.org', title: '' });
      build();
      fixture.detectChanges();
      autoSave.updateFieldsBatch.mockClear();

      const body = component.leadContactBody();
      body.lead_contact_person = null;
      body.lead_contact_person_data = null;

      expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith({
        lead_contact_person: null,
        lead_contact_person_data: null
      });
    });

    /**
     * `BIL-IDP-T-1` (`docs/specs/bugfix/innovation-developer-prefill-stale-lead-contact`) — regression
     * test, red before the fix.
     *
     * Case 5 (`R-3`): the constructor's mount effect (title/description/`leadContactBody` ->
     * `updateGeneralInfoMdsFields()`) runs BEFORE the hydration effect below it has copied the loaded
     * contact into `leadContactBody` — see the guard's own comment
     * ("saving unconditionally PATCHed lead_contact_person: null over the stored one every time the
     * editor was opened"). This still holds under `BIL-IDP-T-4`'s pivot: `updateGeneralInfoMdsFields()`
     * never publishes to `creationService` at all any more (that moved to the `manualSave$` handler in
     * `T-4`, see case 6 below), so nothing in this method can clobber the stored contact on mount
     * regardless of hydration order.
     */
    it('does not clobber the stored contact through a mount-order write, and does not save on mount (R-3)', () => {
      creation.resultLeadContact.set('Jane Doe');
      creation.resultLeadContactData.set({ display_name: 'Jane Doe', mail: 'jane@x.org', title: '' });
      build();

      // Before the first change detection, no effect (mount or hydration) has run at all.
      expect(creation.resultLeadContact()).toBe('Jane Doe');
      expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();

      // After the full mount flush: hydration has run, and must not have clobbered the value on the
      // way there, and must not have produced a spurious save.
      fixture.detectChanges();
      expect(creation.resultLeadContact()).toBe('Jane Doe');
      expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();
    });

    /**
     * Case 6 (`R-1`), retargeted by the `T-4` pivot: `DD-1` (publish inside
     * `updateGeneralInfoMdsFields()`, i.e. on every settled contact commit) was implemented and
     * rejected at review — it re-entered the hydration effect (`resultLeadContact`/
     * `resultLeadContactData` are that effect's own dependencies) and rebuilt `leadContactBody` mid
     * keystroke, blanking the Lead contact field on the reporter's first character. Full record:
     * `execution.md` → "Pivot Record: BIL-IDP-T-2".
     *
     * `DD-4` publishes on the SAVE event instead: the settled contact is written to
     * `creationService.resultLeadContact`/`resultLeadContactData` only when
     * `autoSaveService.manualSave$` emits `'general-info'` — i.e. footer "Save draft" — never from a
     * commit alone. Selecting a contact with no save must leave the signal untouched; emitting the
     * save event must publish it.
     */
    it('publishes the settled contact to the shared signal on the manual save event, not on the commit alone (R-1)', () => {
      build();
      fixture.detectChanges();

      const body = component.leadContactBody();
      body.lead_contact_person = 'A. Rivera';
      body.lead_contact_person_data = { display_name: 'A. Rivera', mail: 'a.rivera@cgiar.org', title: '' };

      // The commit alone (no save yet) must not have published anything.
      expect(creation.resultLeadContact()).toBe('');
      expect(creation.resultLeadContactData()).toBeNull();

      autoSave.manualSave$.next('general-info');

      expect(creation.resultLeadContact()).toBe('A. Rivera');
      expect(creation.resultLeadContactData()).toEqual({
        display_name: 'A. Rivera',
        mail: 'a.rivera@cgiar.org',
        title: ''
      });
    });

    /**
     * `BIL-IDP-T-4` — the regression gate for the defect that caused the pivot (see case 6's comment).
     * A stored FREE-TEXT contact (`lead_contact_person_data === null`) is the most common bilateral
     * shape (every pre-`1751462633282` result, and every W3/Bilateral-API-reported one). The reporter
     * typing into the field nulls BOTH payload keys on every keystroke
     * (`lead-contact-person-field.component.ts` `onSearchInput()`), which — under the rejected `DD-1`
     * placement — was a "settled contact" as far as `updateGeneralInfoMdsFields()` could tell, so it
     * got published and blanked the field via the hydration effect. Publishing only on
     * `manualSave$` means a mid-typing null is never even looked at until Save draft fires — and this
     * case never fires it, so `resultLeadContact` must still hold the value the result loaded with.
     */
    it('does not publish a mid-typing null commit — only a manual save publishes (R-1, R-3)', () => {
      creation.resultLeadContact.set('Arouna Dissa');
      creation.resultLeadContactData.set(null);
      build();
      fixture.detectChanges();

      // Simulate the keystroke commit `onSearchInput()` makes on every character: both keys nulled.
      const body = component.leadContactBody();
      body.lead_contact_person = null;
      body.lead_contact_person_data = null;
      fixture.detectChanges();

      expect(creation.resultLeadContact()).toBe('Arouna Dissa');
      expect(creation.resultLeadContactData()).toBeNull();
    });
  });

  // ── UserSearchService reset (app-wide singleton — must not leak state) ──
  describe('UserSearchService reset', () => {
    it('resets stale state on init', () => {
      userSearch.selectedUser = { display_name: 'Stale' };
      userSearch.searchQuery = 'stale query';
      userSearch.hasValidContact = false;
      userSearch.showContactError = true;

      build();
      fixture.detectChanges();

      expect(userSearch.selectedUser).toBeNull();
      expect(userSearch.searchQuery).toBe('');
      expect(userSearch.hasValidContact).toBe(true);
      expect(userSearch.showContactError).toBe(false);
    });

    it('resets again on destroy', () => {
      build();
      fixture.detectChanges();
      userSearch.selectedUser = { display_name: 'Selected during this visit' };

      fixture.destroy();

      expect(userSearch.selectedUser).toBeNull();
    });
  });

  // ── DAC options ──────────────────────────────────────────────────────
  describe('loadDacOptions', () => {
    it('maps the tag levels and the impact-area scores', () => {
      build();
      fixture.detectChanges();
      expect(component.tagLevels()).toEqual([{ value: 1, label: 'Not targeted' }]);
      expect(component.isLoadingDac()).toBe(false);
      expect(component.impactAreaSubScores()).toEqual({
        gender: [{ id: 10, title: 'Score A', name: 'Score A' }]
      });
    });

    it('keeps the default tag levels when the response is empty', () => {
      tagResponse = of({ response: null });
      build();
      fixture.detectChanges();
      expect(component.tagLevels().length).toBe(3);
      expect(component.isLoadingDac()).toBe(false);
    });

    it('stops the loading flag when the tag levels request fails', () => {
      tagResponse = throwError(() => new Error('boom'));
      build();
      fixture.detectChanges();
      expect(component.isLoadingDac()).toBe(false);
    });

    it('skips inactive and unmapped impact areas and groups several scores', () => {
      scoresResponse = of({
        response: [
          { id: 1, name: 'Inactive', impact_area: 'Gender', is_active: false },
          { id: 2, name: 'Unknown area', impact_area: 'Nope', is_active: true },
          { id: 3, name: 'G1', impact_area: 'Gender', is_active: true },
          { id: 4, name: 'G2', impact_area: 'Gender', is_active: true },
          { id: 5, name: 'C1', impact_area: 'Climate', is_active: true }
        ]
      });
      build();
      fixture.detectChanges();
      const scores = component.impactAreaSubScores();
      expect(scores['gender'].map((s: any) => s.id)).toEqual([3, 4]);
      expect(scores['climate_change'].length).toBe(1);
      expect(scores['nope']).toBeUndefined();
    });

    it('ignores a non-array scores response', () => {
      scoresResponse = of({ response: { not: 'an array' } });
      build();
      fixture.detectChanges();
      expect(component.impactAreaSubScores()).toEqual({});
    });

    it('logs an error when the scores request fails', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      scoresResponse = throwError(() => new Error('boom'));
      build();
      fixture.detectChanges();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ── field handlers ───────────────────────────────────────────────────
  describe('field handlers', () => {
    it('updates and flushes the title', () => {
      build();
      component.onTitleChange('New title');
      expect(component.title()).toBe('New title');
      expect(autoSave.updateField).toHaveBeenCalledWith('title', 'New title', 'text');
      component.onTitleBlur();
      expect(autoSave.notifyBlur).toHaveBeenCalledWith('title', 'New title');
    });

    it('publishes the title to the creation service so the page header follows the edit', () => {
      build();
      creation.resultTitle.set('Bilateral Draft #11405');
      component.onTitleChange('A real title');
      expect(creation.resultTitle()).toBe('A real title');
    });

    it('updates and flushes the description', () => {
      build();
      component.onDescriptionChange('New desc');
      expect(component.description()).toBe('New desc');
      expect(autoSave.updateField).toHaveBeenCalledWith('description', 'New desc', 'text');
      component.onDescriptionBlur();
      expect(autoSave.notifyBlur).toHaveBeenCalledWith('description', 'New desc');
    });

    it('exposes the field statuses, defaulting to idle', () => {
      build();
      expect(component.titleStatus).toBe('idle');
      expect(component.descriptionStatus).toBe('idle');
      expect(component.leadContactStatus).toBe('idle');
      autoSave.fieldStatus.set({ title: 'saving', description: 'saved', lead_contact_person: 'error' });
      expect(component.titleStatus).toBe('saving');
      expect(component.descriptionStatus).toBe('saved');
      expect(component.leadContactStatus).toBe('error');
    });
  });

  // ── DAC tags & sub-scores ────────────────────────────────────────────
  describe('DAC tags', () => {
    it('stores a known area and forwards it to the auto-save service', () => {
      build();
      component.onDacTagChange('gender', 3);
      expect(component.selectedDacLevels()).toEqual({ gender: 3 });
      expect(autoSave.updateField).toHaveBeenCalledWith('gender_tag_level_id', 3, 'select');
    });

    it('stores an unknown area without calling the auto-save service', () => {
      build();
      autoSave.updateField.mockClear();
      component.onDacTagChange('unknown', 2);
      expect(component.selectedDacLevels()).toEqual({ unknown: 2 });
      expect(autoSave.updateField).not.toHaveBeenCalled();
    });

    // Night sweep 2026-09-23, BIL-8 (prtest 11416): "(0) Not Targeted" kept the sub-areas stored.
    // Control negative: without the clearing block in `onDacTagChange` the first test fails.
    it('BIL-8: "(0) Not Targeted" clears that area\'s sub-areas and stages the cleared lists', () => {
      creation.resultDacSubScores.set({ gender: [10], climate_change: [5] });
      creation.setDacSubScores.mockImplementation((key: string, ids: number[]) =>
        creation.resultDacSubScores.update((s: any) => ({ ...s, [key]: ids }))
      );
      build();
      autoSave.updateFieldsBatch.mockClear();

      component.onDacTagChange('gender', 1);

      expect(creation.setDacSubScores).toHaveBeenCalledWith('gender', []);
      expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith(
        expect.objectContaining({ gender_impact_area_ids: [], climate_impact_area_ids: [5] })
      );
    });

    it('BIL-8: a targeted level (Significant) keeps the sub-areas untouched', () => {
      creation.resultDacSubScores.set({ gender: [10] });
      build();
      autoSave.updateFieldsBatch.mockClear();

      component.onDacTagChange('gender', 2);

      expect(autoSave.updateFieldsBatch).not.toHaveBeenCalled();
    });

    it('adds a sub-score when it is not selected yet', () => {
      build();
      component.toggleSubScore('gender', 10);
      expect(creation.setDacSubScores).toHaveBeenCalledWith('gender', [10]);
      expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith({
        gender_impact_area_ids: [],
        climate_impact_area_ids: [],
        nutrition_impact_area_ids: [],
        environmental_biodiversity_impact_area_ids: [],
        poverty_impact_area_ids: []
      });
    });

    it('removes a sub-score that is already selected', () => {
      creation.resultDacSubScores.set({ gender: [10, 11] });
      build();
      fixture.detectChanges();
      component.toggleSubScore('gender', 10);
      expect(creation.setDacSubScores).toHaveBeenCalledWith('gender', [11]);
      expect(autoSave.updateFieldsBatch).toHaveBeenCalledWith(
        expect.objectContaining({ gender_impact_area_ids: [10, 11] })
      );
    });

    // P2-3767 — QA (result #9432, CIP, Other Output) picked "(1) Significant" and got no sub-scores.
    // Bilateral opens them from Significant (level 2) upwards; W1/W2 keeps Principal-only in its own
    // template. The levels are the `gender-tag-levels/all` ids: 1 Not targeted, 2 Significant,
    // 3 Principal.
    describe('sub-score visibility (P2-3767)', () => {
      it('opens the sub-scores for Significant (2) and for Principal (3)', () => {
        build();
        component.onDacTagChange('gender', 2);
        expect(component.showsSubScores('gender')).toBe(true);

        component.onDacTagChange('gender', 3);
        expect(component.showsSubScores('gender')).toBe(true);
      });

      it('keeps them closed for Not targeted (1) and while the area is unanswered', () => {
        build();
        expect(component.showsSubScores('gender')).toBe(false);

        component.onDacTagChange('gender', 1);
        expect(component.showsSubScores('gender')).toBe(false);
      });
    });
  });

  // ── show-all toggle ──────────────────────────────────────────────────
  // P2-3366: the story requires the message "N hidden fields have values and will be saved." and the
  // count. It does not define what a field is, so the rule is the literal one applied to what is on
  // screen behind the toggle: per impact area, the score is one field and the sub-score selection is
  // another. These cases pin that rule down so it cannot drift silently.
  describe('hidden fields note (P2-3366)', () => {
    // The keys are the DAC_AREAS keys: gender, climate_change, nutrition,
    // environmental_biodiversity, poverty. A wrong key silently counts zero, which is how the first
    // version of the case below read 1 instead of 3.
    it('counts nothing when no impact area has been answered', () => {
      build();
      component.selectedDacLevels.set({});
      component.selectedSubScores.set({});
      expect(component.hiddenFieldsWithValues()).toBe(0);
      expect(component.showHiddenFieldsNote()).toBe(false);
    });

    it('counts one per answered score and one per sub-score selection', () => {
      build();
      component.selectedDacLevels.set({ gender: 2, climate_change: 3 });
      component.selectedSubScores.set({ climate_change: [7, 8] });
      // two scores + one sub-score selection
      expect(component.hiddenFieldsWithValues()).toBe(3);
    });

    it('shows the note only while the block is collapsed', () => {
      build();
      component.selectedDacLevels.set({ gender: 1 });
      component.showAllFields.set(false);
      expect(component.showHiddenFieldsNote()).toBe(true);

      component.showAllFields.set(true);
      expect(component.showHiddenFieldsNote()).toBe(false);
    });

    it('does not show the note when collapsed with nothing answered', () => {
      build();
      component.selectedDacLevels.set({});
      component.selectedSubScores.set({});
      component.showAllFields.set(false);
      expect(component.showHiddenFieldsNote()).toBe(false);
    });
  });

  // P2-3519 — QA found Section 1 expanding its full metadata with no note, while Section 2
  // (Contributors & Partners) rendered it correctly. This suite builds the component with
  // `.overrideTemplate('<div></div>')`, so the real markup is never rendered here and a DOM
  // assertion would always pass vacuously. The note is a static literal with no component state
  // behind it, so the only regression possible is someone deleting the span: assert the template
  // file itself, and assert it sits inside the `showAllFields()` block rather than above it.
  describe('full-metadata note (P2-3519)', () => {
    const NOTE = 'You are completing the full metadata for this section. These fields are optional.';
    const template = readFileSync(join(__dirname, 'section-general-info.component.html'), 'utf8');

    it('declares the full-metadata note', () => {
      expect(template).toContain(NOTE);
    });

    it('keeps the note inside the expanded block, so it never shows while collapsed', () => {
      expect(template.indexOf('@if (showAllFields()) {')).toBeLessThan(template.indexOf(NOTE));
    });
  });

  describe('show-all toggle', () => {
    it('persists the toggle under a result-scoped key', () => {
      build();
      component.toggleShowAll();
      expect(component.showAllFields()).toBe(true);
      expect(localStorage.getItem('bp_extra_5_general-info')).toBe('true');
      component.toggleShowAll();
      expect(localStorage.getItem('bp_extra_5_general-info')).toBe('false');
    });

    it('restores a previously saved toggle', () => {
      localStorage.setItem('bp_extra_5_general-info', 'true');
      build();
      expect(component.showAllFields()).toBe(true);
    });

    it('falls back to a generic key when there is no result id', () => {
      route.snapshot.params = {};
      build();
      component.toggleShowAll();
      expect(localStorage.getItem('bp_extra_0_general-info')).toBe('true');
    });

    it('tolerates an unavailable localStorage on read and on write', () => {
      const getSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('denied');
      });
      const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('denied');
      });
      build();
      expect(component.showAllFields()).toBe(false);
      expect(() => component.toggleShowAll()).not.toThrow();
      getSpy.mockRestore();
      setSpy.mockRestore();
    });
  });

  // ── the real markup ──────────────────────────────────────────────────
  // Everything above builds with `.overrideTemplate('<div></div>')`, so a DOM assertion there passes
  // vacuously. P2-3768 (the copy) and P2-3767 (which levels open the sub-scores) are rules that live
  // in the template, so they are asserted against the real markup here. The child components are
  // dropped (`imports: []` + `NO_ERRORS_SCHEMA`) so `@if`/`@for` and the literal copy render without
  // pulling every custom field, tooltip and dialog into the test.
  describe('rendered markup', () => {
    const buildReal = async () => {
      // Signals the shared mock does not need while the template is stubbed out, but the real
      // markup reads: the change-type strip, the read-only gate and the innovation note.
      Object.assign(creation, {
        isAiGenerated: signal(false),
        isEditableByCenterUser: signal(true),
        currentResultId: signal(9432),
        resultTypeId: signal(3),
        resultLevelId: signal(1)
      });
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [SectionGeneralInfoComponent],
        providers: [
          { provide: BilateralAutoSaveService, useValue: autoSave },
          { provide: BilateralMdsTrackerService, useValue: mdsTracker },
          { provide: BilateralCreationService, useValue: creation },
          { provide: UserSearchService, useValue: userSearch },
          { provide: HttpClient, useValue: http },
          { provide: ActivatedRoute, useValue: route }
        ]
      })
        .overrideComponent(SectionGeneralInfoComponent, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } })
        .compileComponents();
      fixture = TestBed.createComponent(SectionGeneralInfoComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      return component;
    };

    /** Collapses the template's line breaks and indentation, the way the browser paints it. */
    const noteText = (): string => {
      const spans: any[] = Array.from(fixture.nativeElement.querySelectorAll('span'));
      const el = spans.find(s => s.textContent.includes('will be saved'));
      return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    };

    // P2-3768 — with one field the note read "1 hidden fields have values and will be saved."
    describe('hidden-fields note (P2-3768)', () => {
      it('reads in the singular for exactly one hidden field', async () => {
        await buildReal();
        component.selectedDacLevels.set({ gender: 2 });
        fixture.detectChanges();

        expect(component.hiddenFieldsWithValues()).toBe(1);
        expect(noteText()).toBe('1 hidden field has values and will be saved.');
      });

      it('stays plural from two hidden fields on', async () => {
        await buildReal();
        component.selectedDacLevels.set({ gender: 2, poverty: 3 });
        fixture.detectChanges();

        expect(component.hiddenFieldsWithValues()).toBe(2);
        expect(noteText()).toBe('2 hidden fields have values and will be saved.');

        component.selectedDacLevels.set({ gender: 2, poverty: 3, nutrition: 1 });
        fixture.detectChanges();
        expect(noteText()).toBe('3 hidden fields have values and will be saved.');
      });
    });

    // P2-3767 — QA on prtest (result #9432, CIP, Other Output) picked "(1) Significant" and the
    // sub-scores never appeared. The scores mock declares one active Gender component, "Score A".
    describe('impact-area sub-scores (P2-3767)', () => {
      const subScoreLabels = (): string[] =>
        Array.from(fixture.nativeElement.querySelectorAll('.sgi-checkbox')).map((b: any) => b.textContent.trim());

      it('renders them when the area is scored Significant (2)', async () => {
        // Setting the loaded levels is also what opens the full-metadata block, as in the app.
        creation.resultDacLevels.set({ gender: 2 });
        await buildReal();

        expect(component.showAllFields()).toBe(true);
        expect(subScoreLabels()).toEqual(['Score A']);
      });

      it('still renders them when the area is scored Principal (3)', async () => {
        creation.resultDacLevels.set({ gender: 3 });
        await buildReal();

        expect(subScoreLabels()).toEqual(['Score A']);
      });

      it('renders none while the area is Not targeted (1)', async () => {
        creation.resultDacLevels.set({ gender: 1 });
        await buildReal();

        expect(component.showAllFields()).toBe(true);
        expect(subScoreLabels()).toEqual([]);
      });
    });
  });
  /**
   * P2-3766 — QA found the three mandatory fields rendering their header with an empty icon slot:
   * no ⓘ, no guidance text anywhere on the page (prtest #9432, 2026-09-21). The story calls this
   * guidance "existing behavior, must be preserved"; it was preserved in W1/W2 and never wired to
   * the bilateral form. The text is the shared catalogue entry, not new copy, so both forms move
   * together when it changes.
   */
  describe('P2-3766 · guidance tooltips on the mandatory fields', () => {
    const html = readFileSync(join(__dirname, 'section-general-info.component.html'), 'utf8');

    it('feeds Title and Description from the shared catalogue', () => {
      expect(html).toContain(`[tooltip]="guidance('[general-info]-title')"`);
      expect(html).toContain(`[tooltip]="guidance('[general-info]-description')"`);
    });

    it('opts the Lead contact person field into its ⓘ', () => {
      expect(html).toMatch(/<app-lead-contact-person-field[^>]*\[guidanceAsTooltip\]="true"/s);
    });

    it('reads the same entries rd-general-information reads, and empty when absent', () => {
      build();
      expect(component.guidance('[general-info]-title')).toContain('non-specialist reader');
      expect(component.guidance('[general-info]-does-not-exist')).toBe('');
    });
  });
});
