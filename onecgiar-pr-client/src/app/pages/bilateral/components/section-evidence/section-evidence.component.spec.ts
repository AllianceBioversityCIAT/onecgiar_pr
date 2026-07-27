import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { SectionEvidenceComponent } from './section-evidence.component';
import { ApiService } from '../../../../shared/services/api/api.service';
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
  let creation: any;
  let mdsTracker: any;
  let http: any;

  const build = () => {
    fixture = TestBed.createComponent(SectionEvidenceComponent);
    component = fixture.componentInstance;
    return component;
  };

  beforeEach(async () => {
    creation = { currentResultId: signal<number | null>(101) };
    mdsTracker = { updateSection: jest.fn(), setTotalFields: jest.fn() };

    api = {
      resultsSE: {
        apiBaseUrl: 'http://api/',
        GET_evidences: jest.fn().mockReturnValue(of({ response: { evidences: [] } })),
        POST_createUploadSession: jest.fn().mockResolvedValue('http://upload/'),
        PUT_loadFileInUploadSession: jest.fn().mockResolvedValue({
          webUrl: 'http://sp/file',
          id: 'doc-1',
          name: 'file.pdf',
          parentReference: { path: '/drive/root:/folder' }
        })
      }
    };

    http = { post: jest.fn().mockReturnValue(of({})) };

    (window as any).alert = jest.fn();
    (window as any).confirm = jest.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [SectionEvidenceComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: HttpClient, useValue: http }
      ]
    })
      .overrideTemplate(SectionEvidenceComponent, '<div></div>')
      .compileComponents();
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  // ── getters ──────────────────────────────────────────────────────────
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

    it('reports a valid link only for non-cloud links', () => {
      build();
      expect(component.hasValidLink).toBe(false);
      component.evidenceBody.update(b => ({ ...b, evidences: [{ link: 'https://drive.google.com/x' }] }));
      expect(component.hasValidLink).toBe(false);
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
      expect(api.resultsSE.GET_evidences).not.toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('loads and sorts the evidences', () => {
      api.resultsSE.GET_evidences.mockReturnValue(
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
      expect(mdsTracker.updateSection).toHaveBeenCalledWith('evidence', 1);
    });

    it('falls back to an empty evidences body when the response is null', () => {
      api.resultsSE.GET_evidences.mockReturnValue(of({ response: null }));
      build();
      fixture.detectChanges();
      expect(component.evidences).toEqual([]);
      expect(mdsTracker.updateSection).toHaveBeenCalledWith('evidence', 0);
    });

    it('stops the loading flag on error', () => {
      api.resultsSE.GET_evidences.mockReturnValue(throwError(() => new Error('boom')));
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
      expect(http.post).not.toHaveBeenCalled();
    });

    it('posts the payload and marks the section as saved', async () => {
      build();
      component.evidenceBody.update(b => ({
        ...b,
        evidences: [{ id: 1, link: 'https://a.com' }, { id: 2, link: 'https://b.com', file: makeFile('a.pdf') }]
      }));
      await component.saveSection();
      expect(http.post).toHaveBeenCalledWith('http://api/evidences/create/101', expect.any(FormData));
      expect(component.saveStatus()).toBe('saved');
      expect(component.isSaving()).toBe(false);
    });

    it('flags an error when the request fails', async () => {
      http.post.mockReturnValue(throwError(() => new Error('boom')));
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
        count: 0
      });
      expect(evidence.link).toBe('http://sp/file');
      expect(evidence.sp_document_id).toBe('doc-1');
      expect(evidence.sp_folder_path).toBe('/folder');
    });

    it('tolerates a failing upload', async () => {
      api.resultsSE.POST_createUploadSession.mockRejectedValue(new Error('nope'));
      build();
      const evidence: any = { id: 1, file: makeFile('a.pdf') };
      component.evidenceBody.update(b => ({ ...b, evidences: [evidence] }));
      await component.saveSection();
      expect(evidence.link).toBeUndefined();
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
      expect(http.post).toHaveBeenCalled();
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
    it('does nothing when the confirmation is rejected', () => {
      (window.confirm as jest.Mock).mockReturnValue(false);
      build();
      const item = { id: 1, link: 'https://a.com' };
      component.evidenceBody.update(b => ({ ...b, evidences: [item] }));
      component.deleteItem(item);
      expect(component.evidences.length).toBe(1);
    });

    it('removes the evidence when confirmed', async () => {
      build();
      const item = { id: 1, link: 'https://a.com' };
      component.evidenceBody.update(b => ({ ...b, evidences: [item] }));
      component.deleteItem(item);
      expect(component.evidences.length).toBe(0);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(http.post).toHaveBeenCalled();
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
