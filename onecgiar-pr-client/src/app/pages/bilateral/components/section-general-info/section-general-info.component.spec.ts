import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

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
      fieldStatus: signal<Record<string, string>>({})
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

    it('only counts the lead contact once it is matched against the directory', () => {
      creation.resultLeadContact.set('Jane Doe');
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: false },
        { key: 'description', label: 'Description', filled: false },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: false }
      ]);

      creation.resultLeadContactData.set({ display_name: 'Jane Doe', mail: 'jane@x.org', title: '' });
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('general-info', [
        { key: 'title', label: 'Title', filled: false },
        { key: 'description', label: 'Description', filled: false },
        { key: 'lead_contact_person', label: 'Lead Contact Person', filled: true }
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
});
