import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCloudUpload,
  lucideExternalLink,
  lucideFileSearch,
  lucideFileText,
  lucideHistory,
  lucideLink,
  lucideLock,
  lucideLockOpen,
  lucidePencil,
  lucidePlus,
  lucideTrash2,
  lucideX
} from '@ng-icons/lucide';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { FeedbackValidationDirectiveModule } from '../../../../../../../../../../shared/directives/feedback-validation-directive.module';
import { PrDialogComponent } from '../../../../../../../../../../shared/components/pr-dialog/pr-dialog.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { ViewRefreshService } from '../../../../../../../../../../shared/services/view-refresh.service';
import { EvidenceItemComponent } from '../../../../../../../../../results/pages/result-detail/pages/rd-evidences/evidence-item/evidence-item.component';
import {
  IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT,
  IpsrStep3EvidenceLevel,
  IpsrStepThreeEvidence,
  Resultipresultcomplementary
} from '../../model/Ipsr-step-3-body.model';
import { IPSR_STEP3_EVIDENCE_COPY } from './ipsr-step3-evidence-list.copy';
import {
  IPSR_STEP3_IMPACT_AREAS,
  IPSR_STEP3_IMPACT_AREA_FIELDS,
  countWords,
  ipsrStep3ComponentEvidenceCount,
  isCloudStorageLink,
  isValidIpsrStep3EvidenceLink
} from './ipsr-step3-evidence.util';

interface EvidenceTagOption {
  field: keyof IpsrStepThreeEvidence;
  label: string;
}

/**
 * P2-3824 — the evidence list of ONE level (readiness or use) of ONE Step 3 component (core
 * innovation or a complementary innovation / enabler), with its "Add New Evidence" dialog.
 *
 * It edits the owner's `<level>_evidences` array in place, so the Step 3 page keeps being the single
 * source of truth: the score-2 alerts, the green icon of an enabler and the PATCH all read the same
 * arrays. Nothing is sent from here — files are uploaded and the list persisted when the step is
 * saved (`StepN3Component`).
 *
 * Built on its own rather than reusing the Results `EvidenceItemComponent`: that one reads the open
 * Result (`dataControlSE.currentResult`) to decide its tags and title, which is not an IPSR package,
 * and Results must stay untouched. Only its accepted file-type list is shared, so both forms accept
 * exactly the same files.
 */
@Component({
  selector: 'app-ipsr-step3-evidence-list',
  standalone: true,
  imports: [CommonModule, CustomFieldsModule, FeedbackValidationDirectiveModule, PrDialogComponent, NgIcon],
  providers: [
    provideIcons({
      lucideCloudUpload,
      lucideExternalLink,
      lucideFileSearch,
      lucideFileText,
      lucideHistory,
      lucideLink,
      lucideLock,
      lucideLockOpen,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
      lucideX
    })
  ],
  templateUrl: './ipsr-step3-evidence-list.component.html',
  styleUrls: ['./ipsr-step3-evidence-list.component.scss']
})
export class IpsrStep3EvidenceListComponent {
  /** The Step 3 component whose list this is (`result_ip_result_core` or one complementary item). */
  @Input({ required: true }) owner: Partial<Resultipresultcomplementary>;
  @Input({ required: true }) level: IpsrStep3EvidenceLevel = 'readiness';
  /** True when the level above is not 0 — then the level needs at least one evidence. */
  @Input() required = false;

  readonly copy = IPSR_STEP3_EVIDENCE_COPY;
  readonly maxPerComponent = IPSR_STEP3_MAX_EVIDENCE_PER_COMPONENT;
  static readonly MAX_DETAIL_WORDS = 50;
  readonly maxDetailWords = IpsrStep3EvidenceListComponent.MAX_DETAIL_WORDS;

  readonly sourceOptions = [
    { id: false, name: IPSR_STEP3_EVIDENCE_COPY.sourceLink },
    { id: true, name: IPSR_STEP3_EVIDENCE_COPY.sourceUpload }
  ];
  /** Boolean ids on purpose: `pr-radio-button` matches by strict equality (rd-evidences/CLAUDE.md). */
  readonly publicOptions = [
    { id: false, name: IPSR_STEP3_EVIDENCE_COPY.no },
    { id: true, name: IPSR_STEP3_EVIDENCE_COPY.yes }
  ];
  readonly tagOptions: EvidenceTagOption[] = [
    ...IPSR_STEP3_IMPACT_AREAS.map(area => ({ field: IPSR_STEP3_IMPACT_AREA_FIELDS[area], label: IPSR_STEP3_EVIDENCE_COPY.impactAreaNames[area] })),
    { field: 'innovation_use_related', label: IPSR_STEP3_EVIDENCE_COPY.innovationUse }
  ];

  dialogVisible = false;
  draft: IpsrStepThreeEvidence = IpsrStep3EvidenceListComponent.emptyDraft();
  /** null → the dialog creates; a number → it edits that index. */
  editingIndex: number | null = null;

  /** Signal: cleared from a `setTimeout`, which schedules no render on its own (zoneless). */
  private readonly _incorrectFile = signal(false);
  get incorrectFile(): boolean {
    return this._incorrectFile();
  }

  /** The confirm popup is plain DOM (`CustomizedAlertsFeService`): its callback schedules no render (zoneless). */
  private readonly viewRefresh = inject(ViewRefreshService);

  constructor(public api: ApiService) {}

  static emptyDraft(): IpsrStepThreeEvidence {
    return {
      id: null,
      link: null,
      description: null,
      is_sharepoint: false,
      is_public_file: null,
      gender_related: false,
      youth_related: false,
      nutrition_related: false,
      environmental_biodiversity_related: false,
      poverty_related: false,
      innovation_use_related: false
    };
  }

  // ---- List ----

  get evidences(): IpsrStepThreeEvidence[] {
    if (!this.owner) return [];
    const key = this.listKey;
    if (!Array.isArray(this.owner[key])) this.owner[key] = [];
    return this.owner[key];
  }

  private get listKey(): 'readiness_evidences' | 'use_evidences' {
    return this.level === 'use' ? 'use_evidences' : 'readiness_evidences';
  }

  get readOnly(): boolean {
    return Boolean(this.api?.rolesSE?.readOnly);
  }

  /** Readiness + use of the same component: the cap is per component. */
  get componentCount(): number {
    return ipsrStep3ComponentEvidenceCount(this.owner);
  }

  get atCap(): boolean {
    return this.componentCount >= this.maxPerComponent;
  }

  get isComplete(): boolean {
    return !this.required || this.evidences.length > 0;
  }

  isFile(evidence: IpsrStepThreeEvidence): boolean {
    return Boolean(evidence?.is_sharepoint);
  }

  isPendingUpload(evidence: IpsrStepThreeEvidence): boolean {
    return this.isFile(evidence) && Boolean(evidence?.file) && !evidence?.link;
  }

  fileName(evidence: IpsrStepThreeEvidence): string {
    return evidence?.sp_file_name || evidence?.file?.name || '';
  }

  /** Short upper-case format for the seal of a file ("PDF", "XLSX"); empty when unknown. */
  fileFormat(evidence: IpsrStepThreeEvidence): string {
    const name = this.fileName(evidence);
    if (!name.includes('.')) return '';
    const ext = (name.split('.').pop() ?? '').toUpperCase();
    return ext.length <= 4 ? ext : '';
  }

  /** The domain leads the headline: it says where the evidence comes from. */
  linkHost(link: string | null | undefined): string {
    if (!link) return '';
    try {
      return new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`).hostname.replace(/^www\./i, '');
    } catch {
      return link;
    }
  }

  linkRest(link: string | null | undefined): string {
    if (!link) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`);
      const rest = `${url.pathname === '/' ? '' : url.pathname}${url.search}${url.hash}`;
      return rest;
    } catch {
      return '';
    }
  }

  /** Absolute href even when the reporter typed "example.org/x" — a bare host would open relative to PRMS. */
  href(link: string | null | undefined): string {
    if (!link) return '';
    return /^https?:\/\//i.test(link) ? link : `https://${link}`;
  }

  selectedTags(evidence: IpsrStepThreeEvidence): string[] {
    return this.tagOptions.filter(tag => Boolean(evidence?.[tag.field])).map(tag => tag.label);
  }

  // ---- Dialog ----

  openAdd(): void {
    if (this.readOnly || this.atCap) return;
    this.editingIndex = null;
    this.draft = IpsrStep3EvidenceListComponent.emptyDraft();
    this._incorrectFile.set(false);
    this.dialogVisible = true;
  }

  openEdit(index: number): void {
    if (this.readOnly || !this.evidences[index]) return;
    this.editingIndex = index;
    // Clone, so "Cancel" discards; the pending `File` is carried by reference on purpose.
    this.draft = { ...this.evidences[index] };
    this._incorrectFile.set(false);
    this.dialogVisible = true;
  }

  get isEditing(): boolean {
    return this.editingIndex !== null;
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.editingIndex = null;
    this.draft = IpsrStep3EvidenceListComponent.emptyDraft();
  }

  onSourceChange(isSharepoint: boolean): void {
    if (isSharepoint) {
      this.draft.link = null;
    } else {
      this.clearFile();
      this.draft.is_public_file = null;
    }
  }

  get draftLinkInvalid(): boolean {
    return !this.draft.is_sharepoint && Boolean(this.draft.link?.trim()) && !isValidIpsrStep3EvidenceLink(this.draft.link);
  }

  /** The server refuses the same link twice in one list; say so here instead of after Save. */
  get draftLinkDuplicate(): boolean {
    const link = this.draft?.is_sharepoint ? null : this.draft?.link?.trim();
    if (!link) return false;
    return this.evidences.some((evidence, index) => index !== this.editingIndex && !evidence.is_sharepoint && evidence.link?.trim() === link);
  }

  get draftCloudLink(): boolean {
    return !this.draft.is_sharepoint && isCloudStorageLink(this.draft.link);
  }

  get draftHasFile(): boolean {
    return Boolean(this.draft.file || this.draft.sp_file_name || (this.draft.is_sharepoint && this.draft.link));
  }

  get draftWordCount(): number {
    return countWords(this.draft.description);
  }

  /**
   * Link → a valid URL. Upload → the public answer and a file. Details ≤ 50 words either way.
   * Adding a new one is also refused at the cap (the button is disabled, this is the backstop).
   */
  get draftValid(): boolean {
    const d = this.draft;
    if (!d) return false;
    if (this.draftWordCount > this.maxDetailWords) return false;
    if (!this.isEditing && this.atCap) return false;
    if (d.is_sharepoint) return (d.is_public_file === true || d.is_public_file === false) && this.draftHasFile;
    return isValidIpsrStep3EvidenceLink(d.link) && !this.draftLinkDuplicate;
  }

  confirmDialog(): void {
    if (!this.draftValid || this.readOnly) return;
    const evidence: IpsrStepThreeEvidence = {
      ...this.draft,
      link: this.draft.is_sharepoint ? this.draft.link : (this.draft.link?.trim() ?? null),
      description: this.draft.description?.trim() || null
    };
    if (this.isEditing) {
      this.evidences[this.editingIndex] = evidence;
    } else {
      this.evidences.push(evidence);
    }
    this.closeDialog();
  }

  remove(index: number): void {
    if (this.readOnly || !this.evidences[index]) return;
    this.api.alertsFe.show(
      {
        id: 'ipsr-step3-remove-evidence',
        title: this.copy.removeConfirmTitle,
        description: this.copy.removeNote,
        status: 'warning',
        confirmText: this.copy.removeConfirmText
      },
      () => {
        this.evidences.splice(index, 1);
        this.viewRefresh.schedule();
      }
    );
  }

  // ---- File ----

  get acceptedFileTypes(): string {
    return EvidenceItemComponent.ACCEPTED_FILE_TYPES.join(',');
  }

  get acceptedFileTypesLabel(): string {
    const names = EvidenceItemComponent.ACCEPTED_FILE_TYPES.map(e => e.slice(1).toUpperCase()).join(', ');
    return `${names} · up to ${EvidenceItemComponent.MAX_FILE_SIZE_GB} GB`;
  }

  isAcceptedFile(file: File): boolean {
    const extension = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    const sizeInGB = file.size / (1024 * 1024 * 1024);
    return EvidenceItemComponent.ACCEPTED_FILE_TYPES.includes(extension) && sizeInGB <= EvidenceItemComponent.MAX_FILE_SIZE_GB;
  }

  attachFile(file: File | null | undefined): void {
    if (!file) return;
    if (!this.isAcceptedFile(file)) {
      this._incorrectFile.set(true);
      setTimeout(() => this._incorrectFile.set(false), 4000);
      return;
    }
    this._incorrectFile.set(false);
    this.draft.file = file;
    this.draft.sp_file_name = file.name;
    // A new file replaces whatever this evidence pointed to in SharePoint before.
    this.draft.link = null;
    this.draft.sp_document_id = null;
    this.draft.sp_folder_path = null;
  }

  onFileSelected(event: Event): void {
    const input = event?.target as HTMLInputElement;
    this.attachFile(input?.files?.[0]);
    if (input) input.value = '';
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.attachFile(event.dataTransfer?.files?.[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  clearFile(): void {
    this.draft.file = null;
    this.draft.sp_file_name = null;
    this.draft.sp_document_id = null;
    this.draft.sp_folder_path = null;
    if (this.draft.is_sharepoint) this.draft.link = null;
  }

  fileSizeMb(file: File | null | undefined): string {
    if (!file) return '';
    return `${(file.size / 1048576).toFixed(2)} MB`;
  }

  publicTooltip(): string {
    return this.draft?.is_public_file ? this.copy.publicYesInfo : this.copy.publicNoInfo;
  }
}
