import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';

import { TypeKnowledgeProductComponent } from './type-knowledge-product.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { CustomizedAlertsFeService } from '../../../../../shared/services/customized-alerts-fe.service';
import { RolesService } from '../../../../../shared/services/global/roles.service';

describe('TypeKnowledgeProductComponent', () => {
  let fixture: ComponentFixture<TypeKnowledgeProductComponent>;
  let component: TypeKnowledgeProductComponent;
  let bilateralApi: any;
  let creation: any;
  let mdsTracker: any;
  let autoSave: any;
  let alerts: any;
  let roles: any;

  const KP_RESPONSE = {
    handle: '10568/185045',
    type: 'Report',
    authors: [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }],
    keywords: ['maize'],
    agrovoc_keywords: ['soil'],
    warnings: ['The DOI is missing', 'No accessibility metadata'],
    cgspace_phase_year: 2026,
    metadataCG: { source: 'CGSpace', issue_year: 2026, online_year: 2025, is_peer_reviewed: true, accessibility: true },
    fair_data: { total_score: 0.5, F: { score: 1 }, A: { score: 0 }, I: { score: 0.5 }, R: { score: 0.25 } },
    is_melia: null,
    melia_previous_submitted: null,
    melia_type_id: null,
    ost_melia_study_id: null,
    toc_melia_study_id: null
  };

  const build = (over: Record<string, unknown> = {}) => {
    bilateralApi.GET_knowledgeProduct.mockReturnValue(of({ response: { ...KP_RESPONSE, ...over } }));
    fixture = TestBed.createComponent(TypeKnowledgeProductComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return component;
  };

  const lastTrackedFields = () => mdsTracker.setSectionFields.mock.calls.at(-1)[1];
  const lastSavedPayload = () => autoSave.schedulePayload.mock.calls.at(-1)[1];
  // `app-pr-select` declares `label` as a signal input while `app-pr-yes-or-not` still uses a plain
  // `@Input()`, so read both shapes rather than assume one.
  const read = (value: any) => (typeof value === 'function' ? value() : value);
  const selectLabels = () => fixture.debugElement.queryAll(By.css('app-pr-select')).map(d => read(d.componentInstance.label));
  const yesNoLabels = () => fixture.debugElement.queryAll(By.css('app-pr-yes-or-not')).map(d => read(d.componentInstance.label));
  const rowLabels = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.tsf-readonly-label')).map((e: any) => e.textContent.replace(/\s+/g, ' ').trim());
  const alertDescriptions = () => fixture.debugElement.queryAll(By.css('app-alert-status')).map(d => d.componentInstance.description);

  beforeEach(async () => {
    mdsTracker = { setSectionFields: jest.fn() };
    autoSave = { schedulePayload: jest.fn(), fieldStatus: signal<Record<string, string>>({}) };
    alerts = { show: jest.fn() };
    roles = { isAdmin: false };
    creation = {
      currentResultId: signal<number | null>(123),
      reportingYear: signal<number | null>(2026),
      resultInitiativeId: signal<number | null>(51),
      selectedPrimarySp: signal<any>(null)
    };
    bilateralApi = {
      GET_knowledgeProduct: jest.fn().mockReturnValue(of({ response: KP_RESPONSE })),
      GET_clarisaMeliaStudyTypes: jest.fn().mockReturnValue(of({ response: [{ id: 1, name: 'Impact assessment' }] })),
      GET_tocMeliaStudies: jest.fn().mockReturnValue(of({ response: [{ melia_id: 'toc-1', title: 'A TOC study' }] })),
      GET_ostMeliaStudies: jest.fn().mockReturnValue(of({ response: [{ melia_id: 9, melia_study_title: 'An OST study' }] })),
      PATCH_knowledgeProductMelia: jest.fn().mockReturnValue(of({ response: {} })),
      PATCH_resyncKnowledgeProduct: jest.fn().mockReturnValue(of({ response: {} }))
    };

    await TestBed.configureTestingModule({
      imports: [TypeKnowledgeProductComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: CustomizedAlertsFeService, useValue: alerts },
        { provide: RolesService, useValue: roles }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  describe('Section alerts', () => {
    it('should render one alert per API warning above the two fixed ones', () => {
      build();
      const descriptions = alertDescriptions();

      expect(descriptions[0]).toBe('The DOI is missing');
      expect(descriptions[1]).toBe('No accessibility metadata');
      expect(descriptions[2]).toContain('contact your Center library staff');
      expect(descriptions[3]).toContain('automatically collected from external sources');
    });

    it('should name the repository the metadata came from', () => {
      build();

      expect(alertDescriptions()[2]).toContain('update them in CGSpace');
    });

    it('should render only the two fixed alerts when there are no warnings', () => {
      build({ warnings: [] });

      expect(alertDescriptions()).toHaveLength(2);
    });
  });

  describe('MELIA conditional tree', () => {
    it('should show only the first question until it is answered Yes', () => {
      build();

      expect(yesNoLabels()).toEqual(['Is this knowledge product a MELIA Product?']);
      expect(selectLabels()).toEqual([]);
    });

    // The saved answer is what drives the tree on load; the interaction that changes it is covered
    // by the clearing cases below, which do not need the DOM.
    it('should reveal the planned question when the product is a MELIA product', () => {
      build({ is_melia: true });

      expect(yesNoLabels()).toEqual(['Is this knowledge product a MELIA Product?', 'Do you have a MELIA study planned in your TOC?']);
    });

    it('should offer the MELIA type when no study was planned', () => {
      build({ is_melia: true, melia_previous_submitted: false });

      expect(selectLabels()).toEqual(['Select MELIA type']);
    });

    it('should offer the Theory of Change studies for the 2025-2030 portfolio', () => {
      build({ is_melia: true, melia_previous_submitted: true });

      expect(selectLabels()).toEqual(['Select the MELIA study from the drop-down (this drop-down is synced with your TOC)']);
      expect(bilateralApi.GET_tocMeliaStudies).toHaveBeenCalledWith(51);
      expect(bilateralApi.GET_ostMeliaStudies).not.toHaveBeenCalled();
    });

    it('should offer the OST studies and the proposal wording for an earlier portfolio', () => {
      creation.reportingYear.set(2024);
      build({ is_melia: true, melia_previous_submitted: true });

      expect(yesNoLabels()[1]).toBe('Was it planned in your Initiative proposal?');
      expect(selectLabels()).toEqual(['Select MELIA from those included in OST Section 6.3']);
      expect(bilateralApi.GET_ostMeliaStudies).toHaveBeenCalledWith(123);
      expect(bilateralApi.GET_tocMeliaStudies).not.toHaveBeenCalled();
    });

    it('should fall back to the selected primary science program when the result has no initiative', () => {
      creation.resultInitiativeId.set(null);
      creation.selectedPrimarySp.set({ programId: 77 });
      build();

      expect(bilateralApi.GET_tocMeliaStudies).toHaveBeenCalledWith(77);
    });
  });

  describe('Clearing the dependent answers', () => {
    it('should drop every sub-answer when the product stops being a MELIA product', () => {
      build();
      component.melia = { isMeliaProduct: true, ostSubmitted: true, clarisaMeliaTypeId: 1, ostMeliaId: 9, tocMeliaStudyId: 'toc-1' };

      component.melia.isMeliaProduct = false;
      component.onMeliaProductChange();

      expect(component.melia.ostSubmitted).toBeNull();
      expect(component.melia.clarisaMeliaTypeId).toBeNull();
      expect(component.melia.ostMeliaId).toBeNull();
      expect(component.melia.tocMeliaStudyId).toBeNull();
    });

    it('should drop the selection when the planned answer switches branch', () => {
      build();
      component.melia = { isMeliaProduct: true, ostSubmitted: false, clarisaMeliaTypeId: 1, ostMeliaId: null, tocMeliaStudyId: null };

      component.melia.ostSubmitted = true;
      component.onOstSubmittedChange();

      expect(component.melia.clarisaMeliaTypeId).toBeNull();
    });

    it('should keep the planned answer when the product stays a MELIA product', () => {
      build();
      component.melia = { isMeliaProduct: true, ostSubmitted: true, clarisaMeliaTypeId: null, ostMeliaId: null, tocMeliaStudyId: 'toc-1' };

      component.onMeliaProductChange();

      expect(component.melia.ostSubmitted).toBe(true);
      expect(component.melia.tocMeliaStudyId).toBe('toc-1');
    });
  });

  describe('Completion checklist', () => {
    it('should track only the first question until it is answered Yes', () => {
      build();

      expect(lastTrackedFields()).toEqual([
        { key: 'is-melia-product', label: 'Is this knowledge product a MELIA Product?', filled: false }
      ]);
    });

    it('should count a No as answered', () => {
      build({ is_melia: false });

      expect(lastTrackedFields()).toEqual([
        { key: 'is-melia-product', label: 'Is this knowledge product a MELIA Product?', filled: true }
      ]);
    });

    it('should add the planned question when the product is a MELIA product', () => {
      build({ is_melia: true });

      expect(lastTrackedFields().map((f: any) => [f.key, f.filled])).toEqual([
        ['is-melia-product', true],
        ['melia-planned', false]
      ]);
    });

    it('should require the MELIA type when no study was planned', () => {
      build({ is_melia: true, melia_previous_submitted: false, melia_type_id: 4 });

      expect(lastTrackedFields().map((f: any) => [f.key, f.filled])).toEqual([
        ['is-melia-product', true],
        ['melia-planned', true],
        ['melia-type', true]
      ]);
    });

    it('should require the Theory of Change study when one was planned', () => {
      build({ is_melia: true, melia_previous_submitted: true });

      expect(lastTrackedFields().map((f: any) => [f.key, f.filled])).toEqual([
        ['is-melia-product', true],
        ['melia-planned', true],
        ['melia-study-toc', false]
      ]);
    });

    it('should never track the handle, which the researcher cannot edit', () => {
      build();

      expect(lastTrackedFields().map((f: any) => f.key)).not.toContain('handle');
    });

    // P2-3355: a failed load must read as incomplete, never as "0/0 fields".
    it('should still publish an unsatisfied item when the fetch fails', () => {
      bilateralApi.GET_knowledgeProduct.mockReturnValue(throwError(() => new Error('boom')));
      fixture = TestBed.createComponent(TypeKnowledgeProductComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(component.loadFailed()).toBe(true);
      expect(lastTrackedFields()).toHaveLength(1);
      expect(lastTrackedFields()[0].filled).toBe(false);
    });

    it('should report a missing result id as a failed load rather than call the API', () => {
      creation.currentResultId.set(null);
      fixture = TestBed.createComponent(TypeKnowledgeProductComponent);
      fixture.detectChanges();

      expect(bilateralApi.GET_knowledgeProduct).not.toHaveBeenCalled();
      expect(fixture.componentInstance.loadFailed()).toBe(true);
    });
  });

  /**
   * P2-3556 — the load gate, pinned.
   *
   * The three sibling sections lost data through the same chain: the GET failed, the interceptor
   * rethrew it (`shared/interceptors/general-interceptor.service.ts:81-83`), the form painted blank
   * anyway, and the first keystroke autosaved that emptiness over the stored record. This section is
   * NOT vulnerable, and the only reason is the template: `type-knowledge-product.component.html:2,7,19`
   * replaces the whole field list with a loading line or an error box, and `:244` withholds the entire
   * actions row, so on a failed or in-flight load there is no control to type in and no Save to press.
   * `queueSave()` therefore has no gate of its own and does not need one.
   *
   * That makes the gate load-bearing rather than cosmetic, and until now nothing tested it. The stakes
   * if it is ever loosened — say by swapping the full-block hide for an inline alert, the way the three
   * siblings now render theirs: `melia` is a field initializer of five nulls, and
   * `results-knowledge-products.service.ts:1937-1946,1966-1984` reads `isMeliaProduct: null` as
   * "not a MELIA product" and writes `melia_previous_submitted`, `melia_type_id`, `ost_melia_study_id`
   * and `toc_melia_study_id` all to NULL alongside `is_melia`. Five columns, in one autosave.
   */
  describe('Load gate (P2-3556)', () => {
    const saveButton = () => fixture.nativeElement.querySelector('.tsf-actions button');
    const failLoad = () => bilateralApi.GET_knowledgeProduct.mockReturnValue(throwError(() => new Error('HTTP 500')));
    const create = () => {
      fixture = TestBed.createComponent(TypeKnowledgeProductComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    };

    it('offers nothing to type in and nothing to press when the fetch failed', () => {
      failLoad();
      create();

      expect(component.loadFailed()).toBe(true);
      expect(yesNoLabels()).toEqual([]);
      expect(selectLabels()).toEqual([]);
      expect(saveButton()).toBeNull();
      expect(fixture.nativeElement.querySelector('.tsf-load-error')).toBeTruthy();
    });

    it('offers nothing to type in and nothing to press while the fetch is still in flight', () => {
      bilateralApi.GET_knowledgeProduct.mockReturnValue(new Subject<any>().asObservable());
      create();

      expect(component.loading()).toBe(true);
      expect(yesNoLabels()).toEqual([]);
      expect(selectLabels()).toEqual([]);
      expect(saveButton()).toBeNull();
    });

    // The happy path must still be fully usable — the gate is about the other two states only.
    it('offers the first question and the Save button once the body is in hand', () => {
      build();

      expect(yesNoLabels()).toHaveLength(1);
      expect(saveButton()).toBeTruthy();
    });
  });

  describe('Save payload', () => {
    it('should send only the two answers when the product is not a MELIA product', () => {
      build();
      component.melia.isMeliaProduct = false;
      component.onSave();

      expect(lastSavedPayload()).toEqual({
        isMeliaProduct: false,
        ostSubmitted: null,
        clarisaMeliaTypeId: null,
        ostMeliaId: null,
        tocMeliaStudyId: null
      });
    });

    it('should send the MELIA type on the unplanned branch', () => {
      build();
      component.melia = { isMeliaProduct: true, ostSubmitted: false, clarisaMeliaTypeId: 4, ostMeliaId: 9, tocMeliaStudyId: 'toc-1' };
      component.onSave();

      expect(lastSavedPayload()).toEqual({
        isMeliaProduct: true,
        ostSubmitted: false,
        clarisaMeliaTypeId: 4,
        ostMeliaId: null,
        tocMeliaStudyId: null
      });
    });

    it('should send the Theory of Change study on the planned branch', () => {
      build();
      component.melia = { isMeliaProduct: true, ostSubmitted: true, clarisaMeliaTypeId: 4, ostMeliaId: 9, tocMeliaStudyId: 'toc-1' };
      component.onSave();

      expect(lastSavedPayload()).toEqual({
        isMeliaProduct: true,
        ostSubmitted: true,
        clarisaMeliaTypeId: null,
        ostMeliaId: null,
        tocMeliaStudyId: 'toc-1'
      });
    });

    it('should send the OST study on the planned branch of an earlier portfolio', () => {
      creation.reportingYear.set(2024);
      build();
      component.melia = { isMeliaProduct: true, ostSubmitted: true, clarisaMeliaTypeId: null, ostMeliaId: 9, tocMeliaStudyId: 'toc-1' };
      component.onSave();

      expect(lastSavedPayload().ostMeliaId).toBe(9);
      expect(lastSavedPayload().tocMeliaStudyId).toBeNull();
    });

    it('should never carry repository metadata', () => {
      build();
      component.melia.isMeliaProduct = true;
      component.onSave();

      expect(Object.keys(lastSavedPayload()).sort()).toEqual([
        'clarisaMeliaTypeId',
        'isMeliaProduct',
        'ostMeliaId',
        'ostSubmitted',
        'tocMeliaStudyId'
      ]);
    });

    it('should route the save through the section autosave with no debounce on an explicit save', () => {
      build();
      component.onSave();

      expect(autoSave.schedulePayload.mock.calls.at(-1)[0]).toBe('typeSpecific');
      expect(autoSave.schedulePayload.mock.calls.at(-1)[2].debounceMs).toBe(0);
      expect(autoSave.schedulePayload.mock.calls.at(-1)[2].statusKey).toBe('type-specific');
    });
  });

  describe('Sync', () => {
    it('should ask for confirmation before re-reading the repository', () => {
      build();
      component.onSync();

      expect(bilateralApi.PATCH_resyncKnowledgeProduct).not.toHaveBeenCalled();
      expect(alerts.show).toHaveBeenCalled();
      expect(alerts.show.mock.calls[0][0].description).toContain('Unsaved changes in the section will be lost');
    });

    it('should re-read and reload once the confirmation is accepted', () => {
      build();
      component.onSync();
      alerts.show.mock.calls[0][1]();

      expect(bilateralApi.PATCH_resyncKnowledgeProduct).toHaveBeenCalledWith(123);
      expect(bilateralApi.GET_knowledgeProduct).toHaveBeenCalledTimes(2);
    });

    it('should offer Sync for a type that is not a Journal Article', () => {
      build();

      expect(fixture.nativeElement.querySelector('.tsf-sync-btn')).toBeTruthy();
    });

    it('should hide Sync from a non-admin on a Journal Article', () => {
      build({ type: 'Journal Article' });

      expect(component.canSync()).toBe(false);
      expect(fixture.nativeElement.querySelector('.tsf-sync-btn')).toBeNull();
    });

    it('should keep Sync available to an admin on a Journal Article', () => {
      roles.isAdmin = true;
      build({ type: 'Journal Article' });

      expect(component.canSync()).toBe(true);
    });
  });

  describe('Read-only metadata', () => {
    it('should render the always-present rows', () => {
      build();
      const labels = rowLabels();

      expect(labels).toContain('Handle');
      expect(labels).toContain('Date online (CGSpace)');
      expect(labels).toContain('Issue date (CGSpace)');
      expect(labels).toContain('Authors');
      expect(labels).toContain('Knowledge product type');
      expect(labels).toContain('DOI');
      expect(labels).toContain('License');
      expect(labels).toContain('Keywords');
      expect(labels).toContain('AGROVOC Keywords');
      expect(labels).toContain('Commodity');
      expect(labels).toContain('Investors/Sponsors');
      expect(labels).toContain('Reference to other knowledge products');
    });

    it('should render one chip per author', () => {
      build();

      expect(Array.from(fixture.nativeElement.querySelectorAll('.kp-chip')).map((e: any) => e.textContent.trim())).toEqual([
        'Ada Lovelace',
        'Grace Hopper'
      ]);
    });

    it('should hide the Web of Science rows when the payload carries no WoS data', () => {
      build();
      const labels = rowLabels();

      expect(labels).not.toContain('Issue date (WoS)');
      expect(labels).not.toContain('Peer reviewed (WoS)');
      expect(labels).not.toContain('Web of Science Core Collection (former ISI) (WoS)');
    });

    it('should show the Web of Science rows for a Journal Article carrying them', () => {
      build({
        type: 'Journal Article',
        metadataCG: { source: 'CGSpace', doi: '10.1/x', is_isi: true, accessibility: true },
        metadataWOS: { is_peer_reviewed: true, is_isi: true, accessibility: true, issue_year: 2024 }
      });
      const labels = rowLabels();

      expect(labels).toContain('Issue date (WoS)');
      expect(labels).toContain('Peer reviewed (WoS)');
      expect(labels).toContain('Web of Science Core Collection (former ISI) (WoS)');
    });

    it('should link the Altmetric badge when there is one', () => {
      build({ altmetric_detail_url: 'https://altmetric/x', altmetric_image_url: 'https://altmetric/x.png' });

      expect(fixture.nativeElement.querySelector('.kp-altmetric')?.getAttribute('href')).toBe('https://altmetric/x');
    });

    it('should read Not Available when there is no Altmetric data', () => {
      build();

      expect(fixture.nativeElement.querySelector('.kp-altmetric')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Not Available');
    });

    it('should render one FAIR radial per dimension, without the total score', () => {
      build();

      expect(fixture.nativeElement.querySelectorAll('.kp-fair-item')).toHaveLength(4);
      expect(component.fairData.map(d => d.key)).toEqual(['F', 'A', 'I', 'R']);
    });
  });

  describe('Inline guidance for Journal Articles', () => {
    const journalArticleWithout = (over: Record<string, unknown>) =>
      build({ type: 'Journal Article', metadataCG: { source: 'CGSpace', doi: '10.1/x', ...over } });

    it('should ask for the ISI status when it is missing', () => {
      journalArticleWithout({ accessibility: true });

      expect(alertDescriptions().some(d => d?.includes('update the ISI Status field'))).toBe(true);
    });

    it('should ask for the Open Access field when accessibility is missing', () => {
      journalArticleWithout({ is_isi: true });

      expect(alertDescriptions().some(d => d?.includes('update the Open Access field'))).toBe(true);
    });

    it('should stay silent for a type that is not a Journal Article', () => {
      build();

      expect(alertDescriptions().some(d => d?.includes('before proceeding with the Quality Assurance process'))).toBe(false);
    });
  });
});
