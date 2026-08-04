import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { SectionGeneralInfoComponent } from './section-general-info.component';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';

describe('SectionGeneralInfoComponent', () => {
  let fixture: ComponentFixture<SectionGeneralInfoComponent>;
  let component: any;
  let autoSave: any;
  let mdsTracker: any;
  let creation: any;
  let http: any;
  let route: any;

  const TAG_URL = 'gender-tag-levels/all';
  const SCORES_URL = 'impact-areas-scores-components/all';
  const AD_URL = 'ad-users/search';

  let tagResponse: any;
  let scoresResponse: any;
  let adResponse: any;

  const build = () => {
    fixture = TestBed.createComponent(SectionGeneralInfoComponent);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(async () => {
    tagResponse = of({ response: [{ id: 1, description: 'Not targeted' }] });
    scoresResponse = of({ response: [{ id: 10, name: 'Score A', impact_area: 'Gender', is_active: true }] });
    adResponse = of({ response: [{ display_name: 'Jane', mail: 'jane@x.org', title: 'Dr' }] });

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
      resultDacLevels: signal<Record<string, number>>({}),
      resultDacSubScores: signal<Record<string, number[]>>({}),
      setDacSubScores: jest.fn()
    };

    http = {
      get: jest.fn((url: string) => {
        if (url.includes(TAG_URL)) return tagResponse;
        if (url.includes(SCORES_URL)) return scoresResponse;
        if (url.includes(AD_URL)) return adResponse;
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
      ]);
    });
  });

  // ── creation service sync effects ────────────────────────────────────
  describe('sync effects', () => {
    it('mirrors title, description and lead contact', () => {
      creation.resultTitle.set('T');
      creation.resultDescription.set('D');
      creation.resultLeadContact.set('Jane Doe');
      build();
      fixture.detectChanges();
      expect(component.title()).toBe('T');
      expect(component.description()).toBe('D');
      expect(component.leadContactPerson()).toBe('Jane Doe');
      expect(component.leadContactSelected).toEqual({ display_name: 'Jane Doe', mail: '', title: '' });
      expect(component.showAllFields()).toBe(true);
    });

    it('clears the lead contact selection when there is none', () => {
      build();
      fixture.detectChanges();
      expect(component.leadContactSelected).toBeNull();
      expect(component.showAllFields()).toBe(false);
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
      component.onTitleChange({ target: { value: 'New title' } } as any);
      expect(component.title()).toBe('New title');
      expect(autoSave.updateField).toHaveBeenCalledWith('title', 'New title', 'text');
      component.onTitleBlur();
      expect(autoSave.notifyBlur).toHaveBeenCalledWith('title', 'New title');
    });

    it('updates and flushes the description', () => {
      build();
      component.onDescriptionChange({ target: { value: 'New desc' } } as any);
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

  // ── lead contact search ──────────────────────────────────────────────
  describe('lead contact search', () => {
    it('skips short queries', () => {
      jest.useFakeTimers();
      build();
      component.leadContactResults = [{ display_name: 'stale' }];
      component.onLeadContactSearch('ab');
      jest.advanceTimersByTime(400);
      expect(component.leadContactResults).toEqual([]);
      expect(http.get).not.toHaveBeenCalledWith(expect.stringContaining(AD_URL));
    });

    it('searches and filters out test mailboxes and users without mail', () => {
      adResponse = of({
        response: [
          { display_name: 'Jane', mail: 'jane@x.org', title: 'Dr' },
          { display_name: 'Test', mail: 'test@x.org', title: '' },
          { display_name: 'No mail', mail: '', title: '' }
        ]
      });
      jest.useFakeTimers();
      build();
      component.onLeadContactSearch('jane');
      jest.advanceTimersByTime(400);
      expect(component.leadContactResults).toEqual([{ display_name: 'Jane', mail: 'jane@x.org', title: 'Dr' }]);
      expect(component.isSearchingLeads).toBe(false);
    });

    it('defaults to an empty result list when the response is null', () => {
      adResponse = of({ response: null });
      jest.useFakeTimers();
      build();
      component.onLeadContactSearch('jane');
      jest.advanceTimersByTime(400);
      expect(component.leadContactResults).toEqual([]);
    });

    it('clears the results when the search fails', () => {
      adResponse = throwError(() => new Error('boom'));
      jest.useFakeTimers();
      build();
      component.onLeadContactSearch('jane');
      jest.advanceTimersByTime(400);
      expect(component.isSearchingLeads).toBe(false);
      expect(component.leadContactResults).toEqual([]);
    });

    it('selects a lead contact', () => {
      build();
      component.selectLeadContact({ display_name: 'Jane', mail: 'jane@x.org', title: 'Dr' });
      expect(component.leadContactSearchQuery).toBe('Jane');
      expect(component.leadContactPerson()).toBe('Jane');
      expect(component.leadContactResults).toEqual([]);
      expect(autoSave.updateField).toHaveBeenCalledWith('lead_contact_person', 'Jane', 'text');
    });

    it('clears the lead contact', () => {
      build();
      component.selectLeadContact({ display_name: 'Jane', mail: 'jane@x.org', title: 'Dr' });
      component.clearLeadContact();
      expect(component.leadContactSelected).toBeNull();
      expect(component.leadContactSearchQuery).toBe('');
      expect(component.leadContactPerson()).toBe('');
      expect(autoSave.updateField).toHaveBeenLastCalledWith('lead_contact_person', '', 'text');
    });

    it('clears the results shortly after blur', () => {
      jest.useFakeTimers();
      build();
      component.leadContactResults = [{ display_name: 'Jane' }];
      component.onLeadContactBlur();
      jest.advanceTimersByTime(200);
      expect(component.leadContactResults).toEqual([]);
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
