import { readFileSync } from 'fs';
import { join } from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrStep3EvidenceListComponent } from './ipsr-step3-evidence-list.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ViewRefreshService } from '../../../../../../../../../../shared/services/view-refresh.service';
import { IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT, IpsrStepThreeEvidence } from '../../model/Ipsr-step-3-body.model';
import { IPSR_STEP3_EVIDENCE_COPY } from './ipsr-step3-evidence-list.copy';

const linkEvidence = (link: string | null = 'https://cgspace.cgiar.org/items/1', extra: Partial<IpsrStepThreeEvidence> = {}): IpsrStepThreeEvidence => ({
  id: null,
  link,
  description: null,
  is_sharepoint: false,
  is_public_file: null,
  ...extra
});

const file = (name: string): File => new File(['x'.repeat(8)], name, { type: 'application/octet-stream' });

describe('IpsrStep3EvidenceListComponent (P2-3824)', () => {
  let component: IpsrStep3EvidenceListComponent;
  let fixture: ComponentFixture<IpsrStep3EvidenceListComponent>;
  let api: any;
  let viewRefresh: { schedule: jest.Mock };

  beforeEach(async () => {
    api = { rolesSE: { readOnly: false }, alertsFe: { show: jest.fn() } };
    viewRefresh = { schedule: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [IpsrStep3EvidenceListComponent],
      providers: [
        { provide: ApiService, useValue: api },
        { provide: ViewRefreshService, useValue: viewRefresh }
      ]
    })
      // Behaviour contract only; the markup has its own contract below (readFileSync).
      .overrideComponent(IpsrStep3EvidenceListComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(IpsrStep3EvidenceListComponent);
    component = fixture.componentInstance;
    component.owner = { readiness_evidences: [], use_evidences: [] } as any;
    component.level = 'readiness';
  });

  describe('list', () => {
    it('creates the level list on the owner when the server sent none', () => {
      component.owner = {} as any;
      component.level = 'use';
      expect(component.evidences).toEqual([]);
      expect((component.owner as any).use_evidences).toBe(component.evidences);
    });

    it('edits the owner array in place, so the step sees the change', () => {
      component.openAdd();
      component.draft.link = 'https://example.org/report.pdf';
      component.confirmDialog();
      expect(component.owner.readiness_evidences).toHaveLength(1);
      expect(component.owner.readiness_evidences[0].link).toBe('https://example.org/report.pdf');
    });

    it('counts readiness and use together for the component counter', () => {
      component.owner = { readiness_evidences: [linkEvidence()], use_evidences: [linkEvidence(), linkEvidence()] } as any;
      expect(component.componentCount).toBe(3);
      expect(IPSR_STEP3_EVIDENCE_COPY.counter(component.componentCount, component.maxPerComponent)).toBe(
        '3 / 6 evidence added (for this component)'
      );
    });

    it('is complete when not required, and when required only with one evidence', () => {
      component.required = false;
      expect(component.isComplete).toBe(true);
      component.required = true;
      expect(component.isComplete).toBe(false);
      component.owner.readiness_evidences.push(linkEvidence());
      expect(component.isComplete).toBe(true);
    });
  });

  describe('cap of evidence per component', () => {
    beforeEach(() => {
      component.owner = {
        readiness_evidences: [linkEvidence(), linkEvidence(), linkEvidence()],
        use_evidences: [linkEvidence(), linkEvidence(), linkEvidence()]
      } as any;
    });

    it('is 6, shared by both levels', () => {
      expect(IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT).toBe(6);
      expect(component.atCap).toBe(true);
      component.level = 'use';
      expect(component.atCap).toBe(true);
    });

    it('does not open the dialog at the cap', () => {
      component.openAdd();
      expect(component.dialogVisible).toBe(false);
    });

    it('refuses a new evidence at the cap even if the dialog was open (backstop)', () => {
      component.dialogVisible = true;
      component.editingIndex = null;
      component.draft = linkEvidence('https://example.org/a');
      expect(component.draftValid).toBe(false);
      component.confirmDialog();
      expect(component.componentCount).toBe(6);
    });

    it('still lets an existing evidence be edited at the cap', () => {
      component.openEdit(0);
      component.draft.link = 'https://example.org/edited';
      expect(component.draftValid).toBe(true);
      component.confirmDialog();
      expect(component.owner.readiness_evidences[0].link).toBe('https://example.org/edited');
      expect(component.componentCount).toBe(6);
    });
  });

  describe('dialog validation', () => {
    beforeEach(() => component.openAdd());

    it('opens with an empty link draft and no tags', () => {
      expect(component.dialogVisible).toBe(true);
      expect(component.draft.is_sharepoint).toBe(false);
      expect(component.draft.is_public_file).toBeNull();
      expect(component.selectedTags(component.draft)).toEqual([]);
    });

    it('requires a valid URL when the source is a link', () => {
      expect(component.draftValid).toBe(false);
      component.draft.link = 'not a url';
      expect(component.draftLinkInvalid).toBe(true);
      expect(component.draftValid).toBe(false);
      component.draft.link = 'https://www.example.org/page';
      expect(component.draftLinkInvalid).toBe(false);
      expect(component.draftValid).toBe(true);
    });

    it('refuses a link already in this list, but not the one being edited', () => {
      component.draft.link = 'https://www.example.org/page';
      component.confirmDialog();
      component.openAdd();
      component.draft.link = ' https://www.example.org/page ';
      expect(component.draftLinkDuplicate).toBe(true);
      expect(component.draftValid).toBe(false);

      component.closeDialog();
      component.openEdit(0);
      expect(component.draftLinkDuplicate).toBe(false);
      expect(component.draftValid).toBe(true);
    });

    it('warns (without blocking) on a file-storage link, like Results', () => {
      component.draft.link = 'https://drive.google.com/file/d/abc';
      expect(component.draftCloudLink).toBe(true);
      expect(component.draftValid).toBe(true);
    });

    it('requires the public answer AND a file when the source is an upload', () => {
      component.draft.is_sharepoint = true;
      component.onSourceChange(true);
      expect(component.draftValid).toBe(false);

      component.attachFile(file('report.pdf'));
      expect(component.draftValid).toBe(false); // public question still unanswered

      component.draft.is_public_file = false;
      expect(component.draftValid).toBe(true);
    });

    it('accepts "No" as an answer to the public question (false is not "unanswered")', () => {
      component.draft.is_sharepoint = true;
      component.draft.is_public_file = false;
      component.attachFile(file('deck.pptx'));
      expect(component.draftValid).toBe(true);
    });

    it('rejects a file type the Results form does not accept, and flags it', () => {
      jest.useFakeTimers();
      component.draft.is_sharepoint = true;
      component.draft.is_public_file = true;
      component.attachFile(file('script.exe'));
      expect(component.draft.file).toBeFalsy();
      expect(component.incorrectFile).toBe(true);
      jest.advanceTimersByTime(5000);
      expect(component.incorrectFile).toBe(false);
      jest.useRealTimers();
    });

    it('accepts an upper-case extension', () => {
      component.draft.is_sharepoint = true;
      component.attachFile(file('PHOTO.JPG'));
      expect(component.draft.file?.name).toBe('PHOTO.JPG');
      expect(component.draft.sp_file_name).toBe('PHOTO.JPG');
    });

    it('switching the source clears what belonged to the other one', () => {
      component.draft.link = 'https://example.org';
      component.draft.is_sharepoint = true;
      component.onSourceChange(true);
      expect(component.draft.link).toBeNull();

      component.draft.is_public_file = true;
      component.attachFile(file('a.pdf'));
      component.draft.is_sharepoint = false;
      component.onSourceChange(false);
      expect(component.draft.file).toBeNull();
      expect(component.draft.sp_file_name).toBeNull();
      expect(component.draft.is_public_file).toBeNull();
    });

    it('limits the details to 50 words', () => {
      component.draft.link = 'https://example.org';
      component.draft.description = Array.from({ length: 50 }, () => 'word').join(' ');
      expect(component.draftValid).toBe(true);
      component.draft.description += ' extra';
      expect(component.draftValid).toBe(false);
    });

    it('stores a trimmed link and an empty description as null', () => {
      component.draft.link = '  https://example.org/x  ';
      component.draft.description = '   ';
      component.confirmDialog();
      expect(component.evidences[0].link).toBe('https://example.org/x');
      expect(component.evidences[0].description).toBeNull();
      expect(component.dialogVisible).toBe(false);
    });

    it('cancel discards the draft', () => {
      component.draft.link = 'https://example.org';
      component.closeDialog();
      expect(component.evidences).toHaveLength(0);
      expect(component.draft.link).toBeNull();
    });
  });

  describe('tags', () => {
    it('offers the five Impact Areas and Innovation Use, with climate on youth_related', () => {
      expect(component.tagOptions.map(t => t.label)).toEqual([
        'Gender equality, youth and social inclusion',
        'Climate adaptation and mitigation',
        'Nutrition, health and food security',
        'Environmental health and biodiversity',
        'Poverty reduction, livelihoods and jobs',
        'Innovation Use'
      ]);
      expect(component.tagOptions.find(t => t.label === 'Climate adaptation and mitigation')?.field).toBe('youth_related');
    });

    it('lists the selected tags of a card', () => {
      const evidence = linkEvidence('https://example.org', { youth_related: true, innovation_use_related: true });
      expect(component.selectedTags(evidence)).toEqual(['Climate adaptation and mitigation', 'Innovation Use']);
    });

    it('editing only the tags replaces the evidence in place', () => {
      component.owner.readiness_evidences.push(linkEvidence('https://example.org'));
      component.openEdit(0);
      component.draft.gender_related = true;
      expect(component.owner.readiness_evidences[0].gender_related).toBeFalsy(); // clone until confirmed
      component.confirmDialog();
      expect(component.owner.readiness_evidences[0].gender_related).toBe(true);
    });
  });

  describe('remove', () => {
    it('asks for confirmation, then removes and schedules a render (the popup is plain DOM)', () => {
      component.owner.readiness_evidences.push(linkEvidence('https://a.org'), linkEvidence('https://b.org'));
      component.remove(0);
      expect(api.alertsFe.show).toHaveBeenCalledWith(expect.objectContaining({ id: 'ipsr-step3-remove-evidence', confirmText: 'Yes, remove' }), expect.any(Function));
      expect(component.evidences).toHaveLength(2);

      api.alertsFe.show.mock.calls[0][1]();
      expect(component.evidences.map(e => e.link)).toEqual(['https://b.org']);
      expect(viewRefresh.schedule).toHaveBeenCalled();
    });
  });

  describe('read only', () => {
    beforeEach(() => {
      api.rolesSE.readOnly = true;
      component.owner.readiness_evidences.push(linkEvidence());
    });

    it('does not open the dialog, edit or remove', () => {
      component.openAdd();
      component.openEdit(0);
      component.remove(0);
      expect(component.dialogVisible).toBe(false);
      expect(api.alertsFe.show).not.toHaveBeenCalled();
      expect(component.evidences).toHaveLength(1);
    });
  });

  describe('display helpers', () => {
    it('splits a link into host and rest, and builds an absolute href', () => {
      expect(component.linkHost('https://www.cgspace.cgiar.org/items/1?x=1')).toBe('cgspace.cgiar.org');
      expect(component.linkRest('https://www.cgspace.cgiar.org/items/1?x=1')).toBe('/items/1?x=1');
      expect(component.href('example.org/a')).toBe('https://example.org/a');
    });

    it('shows a file format on the seal and marks a file still to upload', () => {
      const evidence: IpsrStepThreeEvidence = { ...linkEvidence(null), is_sharepoint: true, sp_file_name: 'Report.final.pdf', file: file('Report.final.pdf') };
      expect(component.fileFormat(evidence)).toBe('PDF');
      expect(component.isPendingUpload(evidence)).toBe(true);
      evidence.link = 'https://cgiar.sharepoint.com/x';
      expect(component.isPendingUpload(evidence)).toBe(false);
    });
  });
});

/** Markup contract: the template on disk, since the behaviour tests run with an empty one. */
describe('IpsrStep3EvidenceListComponent markup (P2-3824)', () => {
  const html = readFileSync(join(__dirname, 'ipsr-step3-evidence-list.component.html'), 'utf8');

  it('disables "Add evidence" at the cap and hides it in read only', () => {
    expect(html).toMatch(/<app-add-button[^>]*\[disabled\]="atCap"/);
    expect(html).toMatch(/@if \(!readOnly\) \{\s*<div[^>]*>\s*<app-add-button/);
  });

  it('shows the component counter and feeds the missing-fields scan when required', () => {
    expect(html).toContain('copy.counter(componentCount, maxPerComponent)');
    expect(html).toMatch(/appFeedbackValidation[^>]*\[isComplete\]="isComplete"/);
  });

  it('builds the dialog from the platform primitives, not native controls', () => {
    expect(html).toContain('<app-pr-dialog');
    expect(html).toContain('<app-pr-radio-button');
    expect(html).toContain('<app-pr-input');
    expect(html).toContain('<app-pr-checkbox');
    expect(html).toMatch(/<app-pr-textarea[^>]*\[maxWords\]="maxDetailWords"/);
    expect(html).not.toMatch(/<input[^>]*type="checkbox"/);
    expect(html).not.toMatch(/<select/);
    expect(html).not.toMatch(/<textarea/);
  });

  it('uses Lucide icons only, and no copy hard-coded in the template', () => {
    expect(html).toContain('<ng-icon');
    expect(html).not.toContain('material-icons');
    expect(html).not.toContain('Add New Evidence');
    expect(html).not.toContain('Can this evidence be shared publicly?');
  });

  it('gates the confirm button on the draft validation', () => {
    expect(html).toMatch(/\[disabled\]="!draftValid"/);
  });
});
