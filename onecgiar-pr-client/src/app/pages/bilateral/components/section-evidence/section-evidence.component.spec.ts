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
    return component;
  };

  beforeEach(async () => {
    creation = { currentResultId: signal<number | null>(101) };
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
      manualSave$: new Subject<void>(),
      runImmediate: jest.fn().mockImplementation((_key: string, factory: () => any) => {
        factory().subscribe({ error: () => {} });
      }),
      fieldStatus: signal<Record<string, string>>({})
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

  // ── getters ──────────────────────────────────────────────────────────
  // P2-3375: ported from W1/W2 (rd-evidences.component.ts:277-305) with the same field names, because
  // this section posts to the same endpoint. Note two things the port had to preserve exactly:
  // Principal is tag level '3' (the catalogue id, not the score 2 in its label), and the Climate row
  // binds `youth_related`.
  describe('per-evidence tags and the Principal warning (P2-3375)', () => {
    it('lists a Principal impact area that has no evidence tagged for it', () => {
      build();
      component.evidenceBody.set({ evidences: [{ link: 'https://a.com' }], gender_tag_level: '3' } as any);
      expect(component.principalTagsWithoutEvidence).toEqual(['Gender equality, youth and social inclusion']);
      expect(component.principalWarningHtml).toContain('A principal contribution score (2) has been recorded');
    });

    it('says nothing once an evidence carries that tag', () => {
      build();
      component.evidenceBody.set({
        evidences: [{ link: 'https://a.com', gender_related: true }],
        gender_tag_level: '3',
      } as any);
      expect(component.principalTagsWithoutEvidence).toEqual([]);
      expect(component.principalWarningHtml).toBe('');
    });

    it('ignores impact areas that are not Principal', () => {
      build();
      component.evidenceBody.set({ evidences: [{ link: 'https://a.com' }], gender_tag_level: '2' } as any);
      expect(component.principalTagsWithoutEvidence).toEqual([]);
    });

    it('reads the Climate tag from youth_related, as W1/W2 does', () => {
      build();
      component.evidenceBody.set({ evidences: [{ link: 'https://a.com' }], climate_change_tag_level: '3' } as any);
      expect(component.principalTagsWithoutEvidence).toEqual(['Climate adaptation and mitigation']);

      component.evidenceBody.update((b: any) => ({ ...b, evidences: [{ link: 'https://a.com', youth_related: true }] }));
      expect(component.principalTagsWithoutEvidence).toEqual([]);
    });

    it('lists every uncovered Principal area, not just the first', () => {
      build();
      component.evidenceBody.set({
        evidences: [{ link: 'https://a.com' }],
        gender_tag_level: '3',
        poverty_tag_level: '3',
      } as any);
      expect(component.principalTagsWithoutEvidence).toHaveLength(2);
    });

    it('offers five impact areas and seven result types', () => {
      build();
      expect(component.impactAreaTags).toHaveLength(5);
      expect(component.resultTypeTags).toHaveLength(7);
      expect(component.impactAreaTags.map(t => t.field)).toContain('youth_related');
    });

    it('toggles a tag on the draft item', () => {
      build();
      component.toggleDraftTag('policy_change_related');
      expect(component.draftItem().policy_change_related).toBe(true);
      component.toggleDraftTag('policy_change_related');
      expect(component.draftItem().policy_change_related).toBe(false);
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
        { key: 'valid-link', label: 'Evidence with valid link', filled: true }
      ]);
    });

    it('falls back to an empty evidences body when the response is null', () => {
      bilateralApi.GET_evidences.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      expect(component.evidences).toEqual([]);
      expect(mdsTracker.setSectionFields).toHaveBeenCalledWith('evidence', [
        { key: 'valid-link', label: 'Evidence with valid link', filled: false }
      ]);
    });

    it('stops the loading flag on error', () => {
      bilateralApi.GET_evidences.mockReturnValue(throwError(() => new Error('boom')));
      build();
      fixture.detectChanges();
      expect(component.isLoading()).toBe(false);
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
      expect(component.draftItem()).toEqual({ is_sharepoint: true, link: undefined });
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
      component.draftItem.set({ is_sharepoint: false, link: 'https://example.org' });
      expect(component.isDraftValid).toBe(true);
      component.draftItem.set({ is_sharepoint: false, link: 'bad link' });
      expect(component.isDraftValid).toBe(false);
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

    it('alerts on an unsupported file', () => {
      build();
      const input = { files: [makeFile('a.exe')], value: 'x' } as any;
      component.onFileSelected({ target: input } as any);
      expect(window.alert).toHaveBeenCalled();
      expect(component.draftItem().file).toBeUndefined();
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

    it('prepends a new evidence and trims the link', async () => {
      build();
      component.draftItem.set({ is_sharepoint: false, link: '  https://example.org  ' });
      component.confirmDraft();
      expect(component.evidences[0].link).toBe('https://example.org');
      expect(component.showDraft()).toBe(false);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(bilateralApi.POST_evidences).toHaveBeenCalled();
    });

    it('replaces the edited evidence', () => {
      build();
      component.evidenceBody.update(b => ({ ...b, evidences: [{ id: 3, link: 'https://old.org' }] }));
      component.editingId.set(3);
      component.draftItem.set({ id: 3, is_sharepoint: false, link: 'https://new.org' });
      component.confirmDraft();
      expect(component.evidences.length).toBe(1);
      expect(component.evidences[0].link).toBe('https://new.org');
    });

    it('ignores an edit whose id is no longer in the list', () => {
      build();
      component.evidenceBody.update(b => ({ ...b, evidences: [{ id: 3, link: 'https://old.org' }] }));
      component.editingId.set(99);
      component.draftItem.set({ id: 99, is_sharepoint: false, link: 'https://new.org' });
      component.confirmDraft();
      expect(component.evidences).toEqual([{ id: 3, link: 'https://old.org' }]);
    });

    it('keeps a draft without link untouched in file mode', async () => {
      build();
      component.draftItem.set({ is_sharepoint: true, file: makeFile('a.pdf') });
      component.confirmDraft();
      expect(component.evidences.length).toBe(1);
      await new Promise(resolve => setTimeout(resolve, 0));
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

    it('removes the evidence when delete is executed', async () => {
      build();
      const item = { id: 1, link: 'https://a.com' };
      component.evidenceBody.update(b => ({ ...b, evidences: [item] }));
      component.confirmDelete(item);
      component.executeDelete();
      expect(component.evidences.length).toBe(0);
      expect(component.deleteTarget()).toBeNull();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(bilateralApi.POST_evidences).toHaveBeenCalled();
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
});
