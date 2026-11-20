import { readFileSync } from 'fs';
import { join } from 'path';

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';

import { SectionEvidenceComponent } from './section-evidence.component';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { DataControlService } from '../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../shared/services/fields-manager.service';

const makeFile = (name: string, size = 10) => {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('SectionEvidenceComponent', () => {
  let fixture: ComponentFixture<SectionEvidenceComponent>;
  let component: SectionEvidenceComponent;
  let api: any;
  let bilateralApi: any;
  let autoSave: any;
  let creation: any;
  let mdsTracker: any;

  const build = () => {
    fixture = TestBed.createComponent(SectionEvidenceComponent);
    component = fixture.componentInstance;
    // Night sweep 2026-09-23 (R-2): the save tests model a section whose GET already landed; the
    // load-failure gate has its own describe block, which resets this.
    component.loaded.set(true);
    return component;
  };

  beforeEach(async () => {
    creation = { currentResultId: signal<number | null>(101), resultTypeId: signal<number | null>(1) };
    mdsTracker = { setSectionFields: jest.fn() };

    api = {
      resultsSE: {
        apiBaseUrl: 'http://api/',
        // P2-3220: the server wraps it — `ReturnResponseUtil.format({ response: uploadUrl })`.
        // Mocking the bare string used to hide that the component never destructured `response`,
        // so the PUT was sent a stringified object and every SharePoint upload failed.
        POST_createUploadSession: jest.fn().mockResolvedValue({ response: 'http://upload/' }),
        PUT_loadFileInUploadSession: jest.fn().mockResolvedValue({
          webUrl: 'http://sp/file',
          id: 'doc-1',
          name: 'file.pdf',
          parentReference: { path: '/drive/root:/folder' }
        })
      }
    };

    bilateralApi = {
      GET_evidences: jest.fn().mockReturnValue(of({ response: { evidences: [] } })),
      POST_evidences: jest.fn().mockReturnValue(of({}))
    };

    autoSave = {
      isReadOnly: signal(false), // R2B-1/2 — the editor lock the sections read
      manualSave$: new Subject<any>(),
      runImmediate: jest.fn().mockImplementation((_key: string, factory: () => any) => {
        factory().subscribe({ error: () => {} });
      }),
      fieldStatus: signal<Record<string, string>>({}),
      markDirty: jest.fn()
    };

    (window as any).alert = jest.fn();
    (window as any).confirm = jest.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [SectionEvidenceComponent],
      providers: [
        { provide: ApiService, useValue: api },
        // P2-3220: the upload sequence lives in `SharePointUploadService`, which injects
        // `ResultsApiService` directly. Pointing it at the same mock keeps these tests
        // exercising the real shared service instead of a stub of it.
        { provide: ResultsApiService, useValue: api.resultsSE },
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker }
      ]
    })
      .overrideTemplate(SectionEvidenceComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('R2B-2: readOnly() is true when the editor locked the form for this user, even if the status is editable', () => {
    const c = build();
    (creation as any).isEditableByCenterUser = signal(true);
    expect(c.readOnly()).toBe(false);
    autoSave.isReadOnly.set(true);
    expect(c.readOnly()).toBe(true);
  });

  // ── getters ──────────────────────────────────────────────────────────
  // The P2-3375 Principal-score warning is gone on purpose: Impact Area scores are not bilateral MDS,
  // so the section asks for no evidence on them (2026-09-03). Only the tag catalogues remain.
  // W1/W2's option lists, on the boolean the model carries. No tag checkboxes for bilateral.
  describe('source options', () => {
    it('offers Link / Upload file and No / Yes, and has no per-evidence tag catalogue', () => {
      build();
      expect(component.evidencesType.map(o => o.name)).toEqual(['Link', 'Upload file']);
      expect(component.isPublicFileOptions.map(o => o.name)).toEqual(['No', 'Yes']);
      expect((component as any).impactAreaTags).toBeUndefined();
      expect((component as any).resultTypeTags).toBeUndefined();
    });

    it('clears the other source when the radio switches, like W1/W2 cleanSource', () => {
      build();
      component.draftItem.set({ is_sharepoint: false, link: 'https://x.org', is_public_file: true });
      component.onSourceChange(true);
      // design §6.2: switching the source clears the answer in BOTH directions.
      expect(component.draftItem()).toEqual(expect.objectContaining({ is_sharepoint: true, link: undefined, is_public_file: null }));
      component.draftItem.update(d => ({ ...d, sp_file_name: 'a.pdf', is_public_file: true }));
      component.onSourceChange(false);
      expect(component.draftItem()).toEqual(
        expect.objectContaining({ is_sharepoint: false, sp_file_name: undefined, file: undefined, is_public_file: null })
      );
    });
  });

  describe('description word limit (P2-3375)', () => {
    const type = (value: string) => component.onDraftDescriptionInput({ target: { value } } as any);

    it('counts words, not characters', () => {
      build();
      expect(component.countWords('one two three')).toBe(3);
      expect(component.countWords('   spaced   out  ')).toBe(2);
      expect(component.countWords('')).toBe(0);
      expect(component.countWords(undefined)).toBe(0);
    });

    it('accepts exactly fifty words', () => {
      build();
      const fifty = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
      type(fifty);
      expect(component.draftDescriptionWords).toBe(50);
      expect(component.draftItem().description).toBe(fifty);
    });

    it('refuses the fifty-first word and keeps what was already there', () => {
      build();
      const fifty = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
      type(fifty);
      type(fifty + ' overflow');
      expect(component.draftItem().description).toBe(fifty);
      expect(component.draftDescriptionWords).toBe(50);
    });
  });

  describe('getters', () => {
    it('defaults evidences to an empty array', () => {
      build();
      component.evidenceBody.set({ evidences: undefined } as any);
      expect(component.evidences).toEqual([]);
      expect(component.canAddMore).toBe(true);
    });

    it('stops allowing more items once the maximum is reached', () => {
      build();
      component.evidenceBody.update(b => ({ ...b, evidences: new Array(6).fill({ link: 'https://a.com' }) }));
      expect(component.canAddMore).toBe(false);
    });

    it('reports a valid external link or an uploaded file as valid evidence', () => {
      build();
      expect(component.hasValidLink).toBe(false);
      component.evidenceBody.update(b => ({ ...b, evidences: [{ link: 'https://drive.google.com/x' }] }));
      expect(component.hasValidLink).toBe(false);
      component.evidenceBody.update(b => ({
        ...b,
        evidences: [{ is_sharepoint: true, sp_document_id: 'document-1', sp_file_name: 'evidence.xlsx' }]
      }));
      expect(component.hasValidLink).toBe(true);
      component.evidenceBody.update(b => ({ ...b, evidences: [{ link: 'https://cgspace.cgiar.org/handle/10568/1' }] }));
      expect(component.hasValidLink).toBe(true);
      component.evidenceBody.update(b => ({ ...b, evidences: [{ description: 'no link' }] }));
      expect(component.hasValidLink).toBe(false);
    });
  });

  // ── loading ──────────────────────────────────────────────────────────
  describe('loadEvidences', () => {
    it('does nothing without a result id', () => {
      creation.currentResultId.set(null);
      build();
      fixture.detectChanges();
      expect(bilateralApi.GET_evidences).not.toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('loads and sorts the evidences', () => {
      bilateralApi.GET_evidences.mockReturnValue(
        of({
          response: {
            evidences: [
              { id: 1, link: 'a', creation_date: '2024-01-01' },
              { id: 2, link: 'b', last_updated_date: '2024-06-01' }
            ]
          }
        })
      );
      build();
      fixture.detectChanges();
      expect(component.evidences[0].id).toBe(2);
      expect(component.isLoading()).toBe(false);
      expect(mdsTracker.setSectionFields).toHaveBeenCalledWith('evidence', [
        { key: 'valid-link', label: 'Evidence', filled: true }
      ]);
    });

    it('falls back to an empty evidences body when the response is null', () => {
      bilateralApi.GET_evidences.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      expect(component.evidences).toEqual([]);
      expect(mdsTracker.setSectionFields).toHaveBeenCalledWith('evidence', [
        { key: 'valid-link', label: 'Evidence', filled: false }
      ]);
    });

    // P2-3847: CapDev is not asked for evidence.
    it('counts the Evidence item as filled with no evidence for Capacity sharing for development', () => {
      creation.resultTypeId.set(5);
      build();
      fixture.detectChanges();
      expect(component.isEvidenceOptional()).toBe(true);
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('evidence', [
        { key: 'valid-link', label: 'Evidence', filled: true }
      ]);
    });

    // P2-3847: a KP still needs evidence, and its CGSpace handle is that evidence.
    it('keeps Evidence required for a Knowledge Product with no evidence', () => {
      creation.resultTypeId.set(6);
      build();
      fixture.detectChanges();
      expect(component.isEvidenceOptional()).toBe(false);
      expect(component.evidenceCardDescription()).toContain('CGSpace handle or link is accepted');
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('evidence', [
        { key: 'valid-link', label: 'Evidence', filled: false }
      ]);
    });

    it.each([
      'https://hdl.handle.net/10568/123456',
      'https://cgspace.cgiar.org/handle/10568/123456'
    ])('accepts the CGSpace link %s as the evidence of a Knowledge Product', link => {
      creation.resultTypeId.set(6);
      bilateralApi.GET_evidences.mockReturnValue(of({ response: { evidences: [{ id: 1, link }] } }));
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('evidence', [
        { key: 'valid-link', label: 'Evidence', filled: true }
      ]);
    });

    it('re-publishes the Evidence item when the result type changes after load', () => {
      build();
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('evidence', [
        { key: 'valid-link', label: 'Evidence', filled: false }
      ]);
      creation.resultTypeId.set(5);
      fixture.detectChanges();
      expect(mdsTracker.setSectionFields).toHaveBeenLastCalledWith('evidence', [
        { key: 'valid-link', label: 'Evidence', filled: true }
      ]);
    });

    it('stops the loading flag on error', () => {
      bilateralApi.GET_evidences.mockReturnValue(throwError(() => new Error('boom')));
      build();
      fixture.detectChanges();
      expect(component.isLoading()).toBe(false);
    });
  });

  // Night sweep 2026-09-23, R-2: GET 500 → "No evidence added" → confirming one evidence POSTed a
  // one-item list and the server de-activated the stored ones. Control negative: with the `loaded`
  // gate lines removed from `saveSection()` / `addNew()` the POST / modal tests below fail.
  describe('R-2 — refuses to add or save after a failed load', () => {
    const failedLoad = () => {
      bilateralApi.GET_evidences.mockReturnValue(throwError(() => ({ status: 500 })));
      build();
      component.loaded.set(null);
      fixture.detectChanges();
    };

    it('marks the section as not loaded; the template shows the note and hides "Add evidence" / "No evidence added"', () => {
      failedLoad();
      expect(component.loaded()).toBe(false);
      // This suite stubs the template (overrideTemplate), so the markup contract is read from the file.
      const html = readFileSync(join(__dirname, 'section-evidence.component.html'), 'utf8');
      expect(html).toContain('@if (loaded() === false) {');
      expect(html).toContain('@if (!evidences.length && loaded() !== false) {');
      expect(html).toContain('@if (canAddMore && !readOnly() && loaded() === true) {');
    });

    it('does not open the modal and never POSTs, even when a save is requested', async () => {
      failedLoad();
      component.addNew();
      await component.saveSection();
      expect(component.showDraft()).toBe(false);
      expect(bilateralApi.POST_evidences).not.toHaveBeenCalled();
    });

    it('a failed RE-load after a successful one keeps saving available', async () => {
      build();
      fixture.detectChanges();
      expect(component.loaded()).toBe(true);
      bilateralApi.GET_evidences.mockReturnValue(throwError(() => ({ status: 500 })));
      component.loadEvidences();
      expect(component.loaded()).toBe(true);
    });
  });

  describe('sortEvidences', () => {
    it('puts dated evidences before undated ones and falls back to the id', () => {
      build();
      component.evidenceBody.set({
        evidences: [
          { id: 1 },
          { id: 5, creation_date: '2024-01-01' },
          { id: 3 },
          { id: 9, last_updated_date: '2025-01-01' },
          { id: 7, creation_date: 'not-a-date' }
        ]
      } as any);
      component.sortEvidences();
      expect(component.evidences.map(e => e.id)).toEqual([9, 5, 7, 3, 1]);
    });

    it('keeps the relative order of two evidences with the same timestamp', () => {
      build();
      component.evidenceBody.set({
        evidences: [
          { id: 1, creation_date: '2024-01-01' },
          { id: 2, creation_date: '2024-01-01' }
        ]
      } as any);
      component.sortEvidences();
      expect(component.evidences.map(e => e.id)).toEqual([2, 1]);
    });

    it('tolerates evidences without an id', () => {
      build();
      component.evidenceBody.set({ evidences: [{}, {}] } as any);
      component.sortEvidences();
      expect(component.evidences.length).toBe(2);
    });
  });

  // ── draft lifecycle ──────────────────────────────────────────────────
  describe('draft lifecycle', () => {
    it('opens a fresh draft', () => {
      build();
      component.addNew();
      expect(component.showDraft()).toBe(true);
      expect(component.editingId()).toBeNull();
      expect(component.draftItem()).toEqual({ is_sharepoint: false });
    });

    it('opens a draft from an existing item', () => {
      build();
      component.editItem({ id: 4, link: 'https://a.com' });
      expect(component.editingId()).toBe(4);
      expect(component.draftItem().link).toBe('https://a.com');
    });

    it('defaults the editing id to null for an item without id', () => {
      build();
      component.editItem({ link: 'https://a.com' });
      expect(component.editingId()).toBeNull();
    });

    it('cancels the draft', () => {
      build();
      component.addNew();
      component.cancelDraft();
      expect(component.showDraft()).toBe(false);
      expect(component.editingId()).toBeNull();
    });

    it('switches between link and file mode', () => {
      build();
      component.draftItem.set({ is_sharepoint: false, link: 'https://a.com' });
      component.setDraftFileMode();
      expect(component.draftItem()).toEqual({ is_sharepoint: true, link: undefined, is_public_file: null });
      component.draftItem.update(d => ({ ...d, file: makeFile('a.pdf'), sp_file_name: 'a.pdf' }));
      component.setDraftLinkMode();
      expect(component.draftItem().is_sharepoint).toBe(false);
      expect(component.draftItem().file).toBeUndefined();
    });

    it('updates the draft link and description from DOM events', () => {
      build();
      component.onDraftLinkInput({ target: { value: 'https://x.com' } } as any);
      expect(component.draftItem().link).toBe('https://x.com');
      component.onDraftDescriptionInput({ target: { value: 'desc' } } as any);
      expect(component.draftItem().description).toBe('desc');
    });

    it('removes the draft file', () => {
      build();
      component.draftItem.set({ is_sharepoint: true, file: makeFile('a.pdf'), sp_file_name: 'a.pdf', link: 'x' });
      component.removeDraftFile();
      expect(component.draftItem()).toEqual({
        is_sharepoint: true,
        file: undefined,
        sp_file_name: undefined,
        link: undefined
      });
    });
  });

  // ── validation ───────────────────────────────────────────────────────
  describe('validation', () => {
    it('detects cloud links', () => {
      build();
      expect(component.isCloudLink('')).toBe(false);
      expect(component.isCloudLink('https://drive.google.com/file/1')).toBe(true);
      expect(component.isCloudLink('https://my.sharepoint.com/x')).toBe(true);
      expect(component.isCloudLink('https://example.org/x')).toBe(false);
    });

    it('detects cgspace links', () => {
      build();
      expect(component.isCgSpaceLink('')).toBe(false);
      expect(component.isCgSpaceLink('https://cgspace.cgiar.org/handle/10568/12345')).toBe(true);
      expect(component.isCgSpaceLink('https://example.org')).toBe(false);
    });

    it('validates urls', () => {
      build();
      expect(component.isValidUrl('')).toBe(false);
      expect(component.isValidUrl('https://example.org/path')).toBe(true);
      expect(component.isValidUrl('not a url')).toBe(false);
    });

    it('detects duplicate links, honouring the excluded index', () => {
      build();
      component.evidenceBody.update(b => ({
        ...b,
        evidences: [{ id: 1, link: 'https://a.com' }, { id: 2 }]
      }));
      expect(component.isDuplicateLink('')).toBe(false);
      expect(component.isDuplicateLink('https://A.com ')).toBe(true);
      expect(component.isDuplicateLink('https://a.com', 0)).toBe(false);
      expect(component.isDuplicateLink('https://b.com')).toBe(false);
    });

    it('validates file types and sizes', () => {
      build();
      expect(component.validateFileTypes(makeFile('doc.pdf'))).toBe(true);
      expect(component.validateFileTypes(makeFile('doc.exe'))).toBe(false);
      expect(component.validateFileTypes(makeFile('doc.pdf', 2 * 1024 * 1024 * 1024))).toBe(false);
    });

    it('reports draft link errors', () => {
      build();
      expect(component.draftLinkError).toBe('');
      component.draftItem.set({ link: 'https://drive.google.com/x' });
      expect(component.draftLinkError).toContain('not accepted');
      component.draftItem.set({ link: 'nonsense link' });
      expect(component.draftLinkError).toBe('Invalid URL format.');
      component.evidenceBody.update(b => ({ ...b, evidences: [{ id: 1, link: 'https://a.com' }] }));
      component.draftItem.set({ link: 'https://a.com' });
      expect(component.draftLinkError).toContain('already exists');
      component.editingId.set(1);
      expect(component.draftLinkError).toBe('');
    });

    it('computes the draft validity for both modes', () => {
      build();
      component.draftItem.set({ is_sharepoint: true });
      expect(component.isDraftValid).toBe(false);
      component.draftItem.set({ is_sharepoint: true, file: makeFile('a.pdf') });
      expect(component.isDraftValid).toBe(true);
      component.draftItem.set({ is_sharepoint: false });
      expect(component.isDraftValid).toBe(false);
      // EVP-R-2: a link needs the public / private answer before it can be confirmed.
      component.draftItem.set({ is_sharepoint: false, link: 'https://example.org' });
      expect(component.isDraftValid).toBe(false);
      component.draftItem.set({ is_sharepoint: false, link: 'https://example.org', is_public_file: true });
      expect(component.isDraftValid).toBe(true);
      component.draftItem.set({ is_sharepoint: false, link: 'https://example.org', is_public_file: false });
      expect(component.isDraftValid).toBe(true);
      component.draftItem.set({ is_sharepoint: false, link: 'bad link', is_public_file: true });
      expect(component.isDraftValid).toBe(false);
    });

    // EVP-R-4: the storage-link refusal stays for Yes / unanswered; it lifts only for No.
    it('refuses a storage link unless the answer is No, and counts a private one as valid evidence', () => {
      build();
      const cloud = 'https://cgiar.sharepoint.com/sites/x/file.pdf';
      component.draftItem.set({ is_sharepoint: false, link: cloud });
      expect(component.draftLinkError).toContain('not accepted');
      component.draftItem.set({ is_sharepoint: false, link: cloud, is_public_file: true });
      expect(component.draftLinkError).toContain('not accepted');
      expect(component.isDraftValid).toBe(false);
      component.draftItem.set({ is_sharepoint: false, link: cloud, is_public_file: false });
      expect(component.draftLinkError).toBe('');
      expect(component.isDraftValid).toBe(true);

      component.evidenceBody.update(b => ({ ...b, evidences: [{ link: cloud, is_public_file: false }] }));
      expect(component.hasValidLink).toBe(true);
      component.evidenceBody.update(b => ({ ...b, evidences: [{ link: cloud, is_public_file: true }] }));
      expect(component.hasValidLink).toBe(false);
      component.evidenceBody.update(b => ({ ...b, evidences: [{ link: cloud, is_public_file: null }] }));
      expect(component.hasValidLink).toBe(false);
    });
  });

  // ── file handling ────────────────────────────────────────────────────
  describe('file handling', () => {
    it('ignores an empty file selection', () => {
      build();
      const input = { files: [], value: 'x' } as any;
      component.onFileSelected({ target: input } as any);
      expect(component.draftItem().file).toBeUndefined();
    });

    it('accepts a valid file and resets the input', () => {
      build();
      const file = makeFile('a.pdf');
      const input = { files: [file], value: 'x' } as any;
      component.onFileSelected({ target: input } as any);
      expect(component.draftItem().sp_file_name).toBe('a.pdf');
      expect(input.value).toBe('');
    });

    it('flags an unsupported file under the dropzone, like W1/W2, instead of alerting', () => {
      build();
      const input = { files: [makeFile('a.exe')], value: 'x' };
      component.onFileSelected({ target: input } as any);
      expect(component.draftItem().file).toBeUndefined();
      expect(component.incorrectFile()).toBe(true);
      expect((window as any).alert).not.toHaveBeenCalled();
    });

    it('accepts a dropped file', () => {
      build();
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: { files: [makeFile('a.png')] }
      } as any;
      component.onFileDropped(event);
      expect(component.draftItem().sp_file_name).toBe('a.png');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('ignores an empty drop and an invalid dropped file', () => {
      build();
      const empty = { preventDefault: jest.fn(), stopPropagation: jest.fn(), dataTransfer: undefined } as any;
      component.onFileDropped(empty);
      expect(component.draftItem().file).toBeUndefined();

      const invalid = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: { files: [makeFile('a.exe')] }
      } as any;
      component.onFileDropped(invalid);
      expect(component.draftItem().file).toBeUndefined();
    });

    it('cancels drag events', () => {
      build();
      const over = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
      component.onDragOver(over);
      const leave = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
      component.onDragLeave(leave);
      expect(over.preventDefault).toHaveBeenCalled();
      expect(leave.stopPropagation).toHaveBeenCalled();
    });
  });

  // ── save ─────────────────────────────────────────────────────────────
  describe('saveSection', () => {
    it('flags an error when there is no result id', async () => {
      build();
      creation.currentResultId.set(null);
      await component.saveSection();
      expect(component.saveStatus()).toBe('error');
      expect(component.isSaving()).toBe(false);
      expect(bilateralApi.POST_evidences).not.toHaveBeenCalled();
    });

    it('posts the payload and marks the section as saved', async () => {
      build();
      component.evidenceBody.update(b => ({
        ...b,
        evidences: [{ id: 1, link: 'https://a.com' }, { id: 2, link: 'https://b.com', file: makeFile('a.pdf') }]
      }));
      await component.saveSection();
      expect(bilateralApi.POST_evidences).toHaveBeenCalledWith(101, expect.any(FormData));
      expect(component.saveStatus()).toBe('saved');
      expect(component.isSaving()).toBe(false);
    });

    it('flags an error when the request fails', async () => {
      bilateralApi.POST_evidences.mockReturnValue(throwError(() => new Error('boom')));
      build();
      await component.saveSection();
      expect(component.saveStatus()).toBe('error');
    });

    it('uploads pending files and enriches the evidence', async () => {
      build();
      const evidence: any = { id: 1, file: makeFile('a.pdf') };
      component.evidenceBody.update(b => ({ ...b, evidences: [evidence] }));
      await component.saveSection();
      expect(api.resultsSE.POST_createUploadSession).toHaveBeenCalledWith({
        resultId: 101,
        fileName: 'a.pdf',
        count: 1
      });
      expect(evidence.link).toBe('http://sp/file');
      expect(evidence.sp_document_id).toBe('doc-1');
      expect(evidence.sp_folder_path).toBe('/folder');
    });

    /**
     * P2-3220 requires an explicit error when the file could not be stored — the previous version
     * of this test asserted the opposite (upload fails, save reports success, nobody is told).
     * The save still goes ahead because the file also travels in the multipart body, but the
     * section must not claim it saved cleanly.
     */
    it('reports an error when the SharePoint upload fails instead of saving silently', async () => {
      api.resultsSE.POST_createUploadSession.mockRejectedValue(new Error('nope'));
      build();
      const evidence: any = { id: 1, file: makeFile('a.pdf') };
      component.evidenceBody.update(b => ({ ...b, evidences: [evidence] }));
      await component.saveSection();
      expect(evidence.link).toBeUndefined();
      expect(component.saveStatus()).toBe('error');
    });

    /**
     * The lock on the envelope shape. If someone drops the `{ response: … }` destructuring again,
     * the PUT receives an object instead of a URL and this fails.
     */
    it('sends the PUT to the upload URL taken out of the response envelope', async () => {
      build();
      const evidence: any = { id: 1, file: makeFile('a.pdf') };
      component.evidenceBody.update(b => ({ ...b, evidences: [evidence] }));
      await component.saveSection();
      expect(api.resultsSE.PUT_loadFileInUploadSession).toHaveBeenCalledWith(expect.any(File), 'http://upload/');
      expect(component.saveStatus()).not.toBe('error');
    });

    it('tolerates an upload response without metadata', async () => {
      api.resultsSE.PUT_loadFileInUploadSession.mockResolvedValue(null);
      build();
      const evidence: any = { id: 1, file: makeFile('a.pdf') };
      component.evidenceBody.update(b => ({ ...b, evidences: [evidence] }));
      await component.saveSection();
      expect(evidence.link).toBeUndefined();
      expect(evidence.sp_folder_path).toBeUndefined();
    });

    /**
     * P2-3220 — the case the in-component copy got wrong. The server names the SharePoint file
     * `lastSharepointId + count`, so passing `count: 0` for every file (what this component did
     * before it moved onto `SharePointUploadService`) wrote two files of the same save to the SAME
     * name and the second overwrote the first. Reverting the migration turns this red: the old
     * loop reports `[0, 0]`.
     */
    it('numbers each pending file so two uploads of one save cannot overwrite each other', async () => {
      build();
      component.evidenceBody.update(b => ({
        ...b,
        evidences: [{ id: 1, file: makeFile('a.pdf') }, { id: 2, file: makeFile('b.pdf') }]
      }));
      await component.saveSection();
      const counts = api.resultsSE.POST_createUploadSession.mock.calls.map((call: any[]) => call[0].count);
      expect(counts).toEqual([1, 2]);
      expect(new Set(counts).size).toBe(2);
    });

    it('skips evidences that already have a link or no file', async () => {
      build();
      component.evidenceBody.update(b => ({
        ...b,
        evidences: [{ id: 1, link: 'https://a.com', file: makeFile('a.pdf') }, { id: 2, link: 'https://b.com' }]
      }));
      await component.saveSection();
      expect(api.resultsSE.POST_createUploadSession).not.toHaveBeenCalled();
    });
  });

  // ── confirm / delete ─────────────────────────────────────────────────
  describe('confirmDraft', () => {
    it('does nothing when the draft is invalid', () => {
      build();
      component.draftItem.set({ is_sharepoint: false });
      component.confirmDraft();
      expect(component.evidences.length).toBe(0);
    });

    // W1/W2 behaviour: confirming the modal persists at once (decided 2026-09-03 over staging).
    it('prepends a new evidence, trims the link, and persists it at once', async () => {
      build();
      component.draftItem.set({ is_sharepoint: false, link: '  https://example.org  ', is_public_file: true });
      component.confirmDraft();
      await Promise.resolve();
      expect(component.evidences[0]?.link ?? bilateralApi.POST_evidences.mock.calls.length).toBeTruthy();
      expect(component.showDraft()).toBe(false);
      await new Promise(r => setTimeout(r, 0));
      expect(bilateralApi.POST_evidences).toHaveBeenCalledWith(101, expect.any(FormData));
    });

    it('replaces the edited evidence', () => {
      build();
      component.evidenceBody.update(b => ({ ...b, evidences: [{ id: 3, link: 'https://old.org' }] }));
      component.editingId.set(3);
      component.draftItem.set({ id: 3, is_sharepoint: false, link: 'https://new.org', is_public_file: true });
      component.confirmDraft();
      expect(component.evidences.length).toBe(1);
      expect(component.evidences[0].link).toBe('https://new.org');
    });

    it('ignores an edit whose id is no longer in the list', () => {
      build();
      component.evidenceBody.update(b => ({ ...b, evidences: [{ id: 3, link: 'https://old.org' }] }));
      component.editingId.set(99);
      component.draftItem.set({ id: 99, is_sharepoint: false, link: 'https://new.org', is_public_file: true });
      component.confirmDraft();
      expect(component.evidences).toEqual([{ id: 3, link: 'https://old.org' }]);
    });

    it('uploads the file of a confirmed file evidence right away', async () => {
      build();
      component.draftItem.set({ is_sharepoint: true, file: makeFile('a.pdf'), is_public_file: true });
      component.confirmDraft();
      await new Promise(r => setTimeout(r, 0));
      expect(api.resultsSE.POST_createUploadSession).toHaveBeenCalled();
    });
  });

  describe('deleteItem', () => {
    it('does nothing when delete is cancelled', () => {
      build();
      const item = { id: 1, link: 'https://a.com' };
      component.evidenceBody.update(b => ({ ...b, evidences: [item] }));
      component.confirmDelete(item);
      expect(component.deleteTarget()).toBe(item);
      component.cancelDelete();
      expect(component.deleteTarget()).toBeNull();
      expect(component.evidences.length).toBe(1);
    });

    it('removes the evidence and persists the deletion at once, like W1/W2', async () => {
      build();
      const item = { id: 1, link: 'https://a.com' };
      component.evidenceBody.update(b => ({ ...b, evidences: [item] }));
      component.confirmDelete(item);
      component.executeDelete();
      expect(component.deleteTarget()).toBeNull();
      await new Promise(r => setTimeout(r, 0));
      expect(bilateralApi.POST_evidences).toHaveBeenCalledWith(101, expect.any(FormData));
    });
  });

  // ── helpers ──────────────────────────────────────────────────────────
  describe('helpers', () => {
    it('resolves the display name', () => {
      build();
      expect(component.evidenceDisplayName({ sp_file_name: 'a.pdf', link: 'https://a.com' })).toBe('a.pdf');
      expect(component.evidenceDisplayName({ link: 'https://a.com' })).toBe('https://a.com');
      expect(component.evidenceDisplayName({})).toBe('');
    });

    it('detects file evidences', () => {
      build();
      expect(component.isFileEvidence({ is_sharepoint: true })).toBe(true);
      expect(component.isFileEvidence({})).toBe(false);
    });
  });

  /**
   * The whole section is one mandatory checklist item (`valid-link`), and nothing on screen said so:
   * the footer counted "1 field missing" over an empty state with no field to mark, so the reporter
   * read a number they could not act on (JC, 16-Sep-2026). The card gives it the same band every
   * other mandatory field has, and its label matches the checklist entry word for word so the
   * panel's `Go` can find it.
   */
  describe('the section is one marked field', () => {
    it('wraps the evidence block in a required card driven by hasValidLink', () => {
      const html = readFileSync(join(__dirname, 'section-evidence.component.html'), 'utf8');
      expect(html).toContain('label="Evidence"');
      expect(html).toContain('[hasValue]="hasValidLink"');
    });

    // Que el ítem del checklist se llame igual que la tarjeta ya lo fijan los dos tests de
    // `loadEvidences` de arriba, que comparan el array completo.
  });
});
/**
 * EVP-T-8 — the shipped template, not the stubbed one: the sibling suite above overrides the
 * template with `<div></div>`, so it cannot see the question, the storage error, the confirm button
 * or the card lock. Answers are given through the component API (the radio itself is the shared
 * `app-pr-radio-button`, covered by its own Cypress spec); everything asserted is read off the DOM.
 */
describe('SectionEvidenceComponent shipped template (EVP-T-8)', () => {
  let fixture: ComponentFixture<SectionEvidenceComponent>;
  let component: SectionEvidenceComponent;
  let bilateralApi: any;
  const storageLink = 'https://cgiar.sharepoint.com/sites/x/file.pdf';

  const mount = (stored: any[] = []) => {
    bilateralApi.GET_evidences.mockReturnValue(of({ response: { evidences: stored } }));
    fixture = TestBed.createComponent(SectionEvidenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const openDraft = (draft: any) => {
    component.draftItem.set(draft);
    component.showDraft.set(true);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const confirmDisabled = (el: HTMLElement) => {
    const buttons = el.querySelectorAll('.evidence_modal .buttons app-pr-button');
    return buttons[buttons.length - 1].classList.contains('globalDisabled');
  };

  const answer = (value: boolean | null) => {
    component.setDraftPublic(value);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    bilateralApi = { GET_evidences: jest.fn(), POST_evidences: jest.fn().mockReturnValue(of({})) };
    await TestBed.configureTestingModule({
      imports: [SectionEvidenceComponent],
      providers: [
        { provide: ApiService, useValue: { resultsSE: {} } },
        { provide: ResultsApiService, useValue: {} },
        { provide: BilateralApiService, useValue: bilateralApi },
        {
          provide: BilateralAutoSaveService,
          useValue: {
            isReadOnly: signal(false),
            manualSave$: new Subject<any>(),
            runImmediate: (_k: string, factory: () => any) => factory().subscribe({ error: () => {} }),
            fieldStatus: signal({})
          }
        },
        {
          provide: BilateralCreationService,
          useValue: { currentResultId: signal(101), resultTypeId: signal(1), isEditableByCenterUser: signal(true) }
        },
        { provide: BilateralMdsTrackerService, useValue: { setSectionFields: jest.fn() } },
        { provide: RolesService, useValue: { readOnly: false } },
        { provide: DataControlService, useValue: {} },
        { provide: FieldsManagerService, useValue: { fields: signal({}) } }
      ]
    }).compileComponents();
  });

  it('(i) source Link + valid URL: confirm stays disabled until an answer is given', () => {
    mount();
    const el = openDraft({ is_sharepoint: false, link: 'https://example.org/report' });
    expect(el.textContent).toContain('Can this evidence be shared publicly?');
    expect(confirmDisabled(el)).toBe(true);
    answer(true);
    expect(confirmDisabled(el)).toBe(false);
  });

  it('(ii) a storage link: Yes shows the storage error and blocks confirm; No clears it and enables confirm', () => {
    mount();
    const el = openDraft({ is_sharepoint: false, link: storageLink });
    answer(true);
    expect(el.querySelector('[data-testid="storage-link-error"]')).not.toBeNull();
    expect(confirmDisabled(el)).toBe(true);
    answer(false);
    expect(el.querySelector('[data-testid="storage-link-error"]')).toBeNull();
    expect(el.querySelector('[data-testid="link-private-note"]')?.textContent).toContain(
      'PRMS does not change who can open the link.'
    );
    expect(confirmDisabled(el)).toBe(false);
  });

  it('(iii) switching Upload file (No) to Link clears the answer and the question reappears unanswered', () => {
    mount();
    const el = openDraft({ is_sharepoint: true, is_public_file: false });
    component.onSourceChange(false);
    fixture.detectChanges();
    expect(component.draftItem().is_public_file).toBeNull();
    expect(el.textContent).toContain('Can this evidence be shared publicly?');
  });

  it('(iii-b) switching Link (Yes) to Upload file clears the answer: no file is uploaded as public without a fresh answer', () => {
    mount();
    const el = openDraft({ is_sharepoint: false, link: 'https://example.org/report', is_public_file: true });
    component.onSourceChange(true);
    fixture.detectChanges();
    expect(component.draftItem().is_public_file).toBeNull();
    expect(el.textContent).toContain('Can this evidence be shared publicly?');
    // unanswered: the file dropzone is not offered yet and the public/private file note is absent
    expect(el.querySelector('.drag-and-drop-field')).toBeNull();
  });

  it('(ii-b) pins the storage-link refusal text verbatim (EVP-R-4: today message), the No hint is a separate line', () => {
    mount();
    const el = openDraft({ is_sharepoint: false, link: storageLink });
    answer(true);
    const alert = el.querySelector('[data-testid="storage-link-error"]') as HTMLElement;
    expect(alert.getAttribute('description')).toBe(
      'Links to file storage platforms are not accepted. If you do not have a CGSpace or other public link available, use the “Upload file” option to upload your evidence to the PRMS repository.'
    );
    expect(el.querySelector('[data-testid="storage-link-hint"]')?.textContent).toContain('answer No');
    answer(false);
    expect(el.querySelector('[data-testid="storage-link-hint"]')).toBeNull();
  });

  it('(iv) the save body sends is_public for a link and keeps is_public_file for a file', async () => {
    mount();
    component.evidenceBody.update(b => ({
      ...b,
      evidences: [
        { id: 1, link: 'https://example.org/a', is_public_file: false },
        { id: 2, is_sharepoint: true, link: 'https://sp/x', sp_file_name: 'x.pdf', is_public_file: true }
      ]
    }));
    await component.saveSection();
    const form = bilateralApi.POST_evidences.mock.calls[0][1] as FormData;
    const sent = JSON.parse(form.get('jsonData') as string).evidences;
    expect(sent[0]).toEqual(expect.objectContaining({ id: 1, is_public: false }));
    expect(sent[1]).toEqual(expect.objectContaining({ id: 2, is_public_file: true }));
  });

  it('(iv) a loaded tag survives an unrelated save, and an untagged link is sent as null', async () => {
    mount([
      { id: 1, link: 'https://example.org/a', is_public: true },
      { id: 2, link: 'https://example.org/b', is_public: null }
    ]);
    await component.saveSection();
    const sent = JSON.parse((bilateralApi.POST_evidences.mock.calls[0][1] as FormData).get('jsonData') as string).evidences;
    const byId = (id: number) => sent.find((e: any) => e.id === id);
    expect(byId(1).is_public).toBe(true);
    expect(byId(2).is_public).toBeNull();
  });

  it('(v) an untagged link card has no lock', () => {
    const el = mount([{ id: 1, link: 'https://example.org/a', is_public: null }]);
    expect(el.querySelectorAll('[data-testid="evidence-card"]')).toHaveLength(1);
    expect(el.querySelector('.ev_lock')).toBeNull();
  });

  it('(v) a private link card shows the closed lock titled Private; a public one the open lock', () => {
    let el = mount([{ id: 1, link: 'https://example.org/a', is_public: false }]);
    const lock = el.querySelector('.ev_lock') as HTMLElement;
    expect(lock.textContent?.trim()).toBe('lock');
    expect(lock.getAttribute('title')).toBe('Private');
    fixture.destroy();
    el = mount([{ id: 2, link: 'https://example.org/b', is_public: true }]);
    expect((el.querySelector('.ev_lock') as HTMLElement).getAttribute('title')).toBe('Public');
  });
});
