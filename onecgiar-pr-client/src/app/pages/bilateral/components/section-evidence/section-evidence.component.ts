import { Component, OnInit, OnDestroy, inject, signal, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs';
import { HlmButton } from '@spartan/button';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { BilateralEvidenceItem, BilateralEvidenceBody } from './section-evidence.model';
import { FormSkeletonComponent } from '../form-skeleton/form-skeleton.component';

@Component({
  selector: 'app-section-evidence',
  imports: [CommonModule, FormsModule, HlmButton, PrDialogComponent, FormSkeletonComponent, CustomFieldsModule],
  templateUrl: './section-evidence.component.html',
  styleUrl: './section-evidence.component.scss'
})
export class SectionEvidenceComponent implements OnInit, OnDestroy {
  readonly api = inject(ApiService);
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly autoSave = inject(BilateralAutoSaveService);

  /**
   * P2-3520 / P2-3352 — the centre stops being able to edit the result once it leaves Editing.
   * Read straight from the service, the way this section already reads the rest of the result state.
   */
  readonly readOnly = computed(() => !this.creationService.isEditableByCenterUser());

  private manualSaveSub?: Subscription;

  evidenceBody = signal<BilateralEvidenceBody>({
    evidences: [],
    gender_tag_level: '',
    climate_change_tag_level: '',
    nutrition_tag_level: '',
    environmental_biodiversity_tag_level: '',
    poverty_tag_level: ''
  });
  isLoading = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);

  draftItem = signal<BilateralEvidenceItem>({ is_sharepoint: false });
  showDraft = signal(false);

  deleteTarget = signal<BilateralEvidenceItem | null>(null);

  saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  readonly maxItems = 6;
  readonly maxDescriptionWords = 50;

  /**
   * P2-3375: the per-evidence tags, ported from W1/W2 (rd-evidences.component.ts:29-42) with the same
   * field names and labels, because the endpoint is shared.
   *
   * ⚠️ The Climate row binds `youth_related`. That is the existing W1/W2 binding and the column the
   * API expects — its own comment says so. Not a typo to tidy.
   */
  readonly impactAreaTags: { field: keyof BilateralEvidenceItem; label: string }[] = [
    { field: 'gender_related', label: 'Gender equality, youth and social inclusion' },
    { field: 'youth_related', label: 'Climate adaptation and mitigation' },
    { field: 'nutrition_related', label: 'Nutrition, health and food security' },
    { field: 'environmental_biodiversity_related', label: 'Environmental health and biodiversity' },
    { field: 'poverty_related', label: 'Poverty reduction, livelihoods and jobs' }
  ];

  readonly resultTypeTags: { field: keyof BilateralEvidenceItem; label: string }[] = [
    { field: 'innovation_readiness_related', label: 'Innovation Development' },
    { field: 'innovation_use_related', label: 'Innovation Use' },
    { field: 'policy_change_related', label: 'Policy Change' },
    { field: 'capacity_sharing_related', label: 'Capacity Sharing for Development' },
    { field: 'knowledge_product_metadata_related', label: 'Knowledge Product' },
    { field: 'other_output_related', label: 'Other Output' },
    { field: 'other_outcome_related', label: 'Other Outcome' }
  ];

  countWords(text: string | undefined | null): number {
    return (text ?? '').trim().split(/\s+/).filter(Boolean).length;
  }

  get draftDescriptionWords(): number {
    return this.countWords(this.draftItem().description);
  }

  toggleDraftTag(field: keyof BilateralEvidenceItem): void {
    this.draftItem.update(d => ({ ...d, [field]: !d[field] }));
  }

  /**
   * P2-3375: an impact area scored Principal must have at least one evidence tagged for it. Ported
   * from W1/W2 (rd-evidences.component.ts:277-305): the tag level arrives as a STRING and Principal
   * is level '3' — the catalogue id, not the score. `2 - Principal` is the label; 3 is its id.
   *
   * Returns the uncovered tag names so the template can list them. Empty means covered.
   */
  /** Same sentence W1/W2 uses (rd-evidences.component.ts:291), one line per uncovered tag. */
  get principalWarningHtml(): string {
    const items = this.principalTagsWithoutEvidence
      .map(tag => `<li>A principal contribution score (2) has been recorded for ${tag} tag. Please provide evidence to support this claim.</li>`)
      .join('');
    return items ? `<ul>${items}</ul>` : '';
  }

  get principalTagsWithoutEvidence(): string[] {
    const body = this.evidenceBody();
    const levels: { label: string; level: unknown; field: keyof BilateralEvidenceItem }[] = [
      { label: 'Gender equality, youth and social inclusion', level: body?.gender_tag_level, field: 'gender_related' },
      { label: 'Climate adaptation and mitigation', level: body?.climate_change_tag_level, field: 'youth_related' },
      { label: 'Nutrition, health and food security', level: body?.nutrition_tag_level, field: 'nutrition_related' },
      { label: 'Environmental health and biodiversity', level: body?.environmental_biodiversity_tag_level, field: 'environmental_biodiversity_related' },
      { label: 'Poverty reduction, livelihoods and jobs', level: body?.poverty_tag_level, field: 'poverty_related' }
    ];
    const covered = (field: keyof BilateralEvidenceItem) => this.evidences.some(e => e[field]);
    return levels.filter(({ level, field }) => String(level) === '3' && !covered(field)).map(({ label }) => label);
  }


  get evidences(): BilateralEvidenceItem[] {
    return this.evidenceBody().evidences ?? [];
  }

  get canAddMore(): boolean {
    return this.evidences.length < this.maxItems;
  }

  get hasValidLink(): boolean {
    return this.evidences.some(e => {
      // Uploaded files are valid evidence. Their link is intentionally a
      // SharePoint URL, which external-link validation correctly rejects but
      // must not make the Evidence section incomplete.
      if (e.is_sharepoint) {
        return Boolean(e.sp_document_id || e.sp_file_name || e.link);
      }
      return Boolean(e.link && !this.isCloudLink(e.link));
    });
  }

  private readonly CLOUD_REGEX =
    /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i;

  private readonly CGSPACE_REGEX =
    /^https:\/\/(?:cgspace\.cgiar\.org\/items\/[0-9a-f-]{36}|cgspace\.cgiar\.org\/handle\/10568\/\d+)$/;

  private readonly VALID_EXTENSIONS = ['.jpg', '.png', '.pdf', '.doc', '.docx', '.pptx', '.jpeg', '.xlsx', '.xlsm'];

  ngOnInit(): void {
    this.loadEvidences();
    this.manualSaveSub = this.autoSave.manualSave$.subscribe(() => {
      if (this.evidences.length > 0 || this.showDraft()) {
        void this.saveSection();
      }
    });
  }

  ngOnDestroy(): void {
    this.manualSaveSub?.unsubscribe();
  }

  loadEvidences(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;

    this.isLoading.set(true);
    this.bilateralApi.GET_evidences(resultId).subscribe({
      next: ({ response }) => {
        const body = response ?? { evidences: [] };
        this.evidenceBody.set(body);
        this.sortEvidences();
        this.isLoading.set(false);
        this.updateTracker();
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  sortEvidences(): void {
    const ts = (e: BilateralEvidenceItem) => {
      const d = e?.last_updated_date || e?.creation_date;
      const t = d ? new Date(d).getTime() : Number.NaN;
      return Number.isNaN(t) ? null : t;
    };
    this.evidenceBody.update(body => ({
      ...body,
      evidences: [...body.evidences].sort((a, b) => {
        const ta = ts(a);
        const tb = ts(b);
        if (ta !== null && tb !== null && ta !== tb) return tb - ta;
        if (ta !== null && tb === null) return -1;
        if (ta === null && tb !== null) return 1;
        return (b?.id ?? 0) - (a?.id ?? 0);
      })
    }));
  }

  // ── Draft / Inline Editing ──────────────────────────────────────────

  addNew(): void {
    this.draftItem.set({ is_sharepoint: false });
    this.editingId.set(null);
    this.showDraft.set(true);
  }

  editItem(item: BilateralEvidenceItem): void {
    this.draftItem.set({ ...item });
    this.editingId.set(item.id ?? null);
    this.showDraft.set(true);
  }

  cancelDraft(): void {
    this.showDraft.set(false);
    this.draftItem.set({ is_sharepoint: false });
    this.editingId.set(null);
  }

  // ── Validation ──────────────────────────────────────────────────────

  isCloudLink(link: string): boolean {
    return Boolean(link && this.CLOUD_REGEX.test(link.trim()));
  }

  isCgSpaceLink(link: string): boolean {
    return Boolean(link && this.CGSPACE_REGEX.test(link.trim()));
  }

  isValidUrl(link: string): boolean {
    if (!link) return false;
    const regex = /^(https?:\/\/(www\.)?)?[a-z0-9]+([.-][a-z0-9]+)*\.[a-z]{2,6}(:\d{1,5})?(\/\S*)?$/i;
    return regex.test(link.trim());
  }

  isDuplicateLink(link: string, excludeIndex?: number): boolean {
    if (!link) return false;
    const normalized = link.trim().toLowerCase();
    return this.evidences.some((e, i) => {
      if (excludeIndex !== undefined && i === excludeIndex) return false;
      return (e.link ?? '').trim().toLowerCase() === normalized;
    });
  }

  validateFileTypes(file: File): boolean {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const sizeInGB = file.size / (1024 * 1024 * 1024);
    return this.VALID_EXTENSIONS.includes(ext) && sizeInGB <= 1;
  }

  get draftLinkError(): string {
    const link = this.draftItem().link?.trim();
    if (!link) return '';
    if (this.isCloudLink(link)) return 'Links to file storage platforms (Google Drive, Dropbox, SharePoint, OneDrive) are not accepted.';
    if (!this.isValidUrl(link)) return 'Invalid URL format.';
    const excludeIdx = this.editingId() !== null
      ? this.evidences.findIndex(e => e.id === this.editingId())
      : undefined;
    if (this.isDuplicateLink(link, excludeIdx)) return 'This link already exists in the evidence list.';
    return '';
  }

  get isDraftValid(): boolean {
    const item = this.draftItem();
    if (item.is_sharepoint) return Boolean(item.file || item.link);
    return Boolean(item.link?.trim() && !this.draftLinkError);
  }

  // ── Draft Field Updates ─────────────────────────────────────────────

  setDraftLinkMode(): void {
    this.draftItem.update(d => ({ ...d, is_sharepoint: false, file: undefined, sp_file_name: undefined }));
  }

  setDraftFileMode(): void {
    this.draftItem.update(d => ({ ...d, is_sharepoint: true, link: undefined }));
  }

  onDraftLinkInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draftItem.update(d => ({ ...d, link: value }));
  }

  onDraftDescriptionInput(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    // P2-3375: the story caps the description at 50 WORDS. The control had maxlength="500", a
    // character cap, which neither enforces nor communicates the real rule. Extra words are refused
    // rather than truncated mid-word, and the value is pushed back so the textarea cannot drift from
    // the model.
    if (this.countWords(el.value) > this.maxDescriptionWords) {
      el.value = this.draftItem().description ?? '';
      return;
    }
    this.draftItem.update(d => ({ ...d, description: el.value }));
  }

  // ── File Handling ───────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (this.validateFileTypes(file)) {
      this.draftItem.update(d => ({ ...d, file, sp_file_name: file.name }));
    } else {
      alert('Unsupported file type. Accepted: jpg, png, doc, pptx, xlsx, pdf. Max 1 GB.');
    }
    input.value = '';
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (this.validateFileTypes(file)) {
      this.draftItem.update(d => ({ ...d, file, sp_file_name: file.name }));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  removeDraftFile(): void {
    this.draftItem.update(d => ({ ...d, file: undefined, sp_file_name: undefined, link: undefined }));
  }

  // ── Save ────────────────────────────────────────────────────────────
  // Serialized: confirmDraft()/executeDelete() can each trigger a save while one
  // is still in flight (e.g. two evidences added in quick succession). Without
  // this guard, two overlapping POSTs race — whichever's updateEvidences() call
  // lands last on the server wins, and the corresponding loadEvidences() refetch
  // can silently drop whichever addition "lost." Only one save runs at a time;
  // a save requested mid-flight is deferred and re-run once the current one
  // finishes, so it always POSTs the latest local state instead of a stale copy.
  private saveInFlight = false;
  private savePending = false;

  async saveSection(): Promise<void> {
    if (this.saveInFlight) {
      this.savePending = true;
      return;
    }
    this.saveInFlight = true;
    await this.performSave();
    this.saveInFlight = false;
    if (this.savePending) {
      this.savePending = false;
      await this.saveSection();
    }
  }

  private async performSave(): Promise<void> {
    this.saveStatus.set('saving');
    this.isSaving.set(true);

    const failedUploads = await this.uploadPendingFiles();

    const resultId = this.creationService.currentResultId();
    if (!resultId) {
      this.saveStatus.set('error');
      this.isSaving.set(false);
      return;
    }

    const body = {
      ...this.evidenceBody(),
      evidences: this.evidences.map(e => ({
        ...e,
        file: undefined
      }))
    };

    const formData = new FormData();
    formData.append('jsonData', JSON.stringify(body));
    this.evidences.forEach(evidence => {
      if (evidence.file) {
        formData.append('files', evidence.file);
      } else {
        formData.append('files', new Blob([]), '');
      }
    });

    await new Promise<void>(resolve => {
      this.autoSave.runImmediate('evidence', () =>
        this.bilateralApi.POST_evidences(resultId, formData).pipe(
          tap({
            next: () => {
              // P2-3220: a save whose files did not reach SharePoint is not a clean save.
              this.saveStatus.set(failedUploads > 0 ? 'error' : 'saved');
              this.isSaving.set(false);
              if (failedUploads === 0) setTimeout(() => this.saveStatus.set('idle'), 2500);
              this.loadEvidences();
              resolve();
            },
            error: () => {
              this.saveStatus.set('error');
              this.isSaving.set(false);
              resolve();
            }
          })
        )
      );
    });
  }

  /**
   * P2-3220: uploads every pending file to SharePoint and returns how many failed.
   *
   * ⚠️ Two bugs lived here. `POST_createUploadSession` resolves with the whole envelope
   * (`{ response: uploadUrl, message, status }` — see the server's `ReturnResponseUtil.format`
   * in `share-point.service.ts`), and this method used to assign that object straight to
   * `uploadUrl`, so the PUT was sent to a stringified object instead of the upload URL and
   * ALWAYS failed. The empty `catch` then swallowed it, so the evidence was saved with no
   * `link` and no `sp_*` metadata and nobody was told. The file itself still reached the
   * backend through the multipart body in `performSave`, so nothing was lost — but the
   * evidence was never linked to SharePoint, which is the whole point of P2-3218.
   */
  private async uploadPendingFiles(): Promise<number> {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return 0;

    let failed = 0;
    for (const evidence of this.evidences) {
      if (!evidence.file || evidence.link) continue;
      try {
        const { response: uploadUrl } = await this.api.resultsSE.POST_createUploadSession({
          resultId,
          fileName: evidence.file.name,
          count: 0
        });
        const response = await this.api.resultsSE.PUT_loadFileInUploadSession(evidence.file, uploadUrl);
        evidence.link = response?.webUrl;
        evidence.sp_document_id = response?.id;
        evidence.sp_file_name = response?.name;
        evidence.sp_folder_path = response?.parentReference?.path?.split('root:').pop();
      } catch (error) {
        // P2-3220: never fail silently. The save still goes ahead — the file travels in the
        // multipart body too — but the user must know the file was not stored in SharePoint.
        failed++;
        console.error('[section-evidence] SharePoint upload failed for', evidence.file?.name, error);
      }
    }
    return failed;
  }

  // ── Confirm draft (add to local list, then persist) ─────────────────

  confirmDraft(): void {
    if (!this.isDraftValid) return;

    const draft = { ...this.draftItem() };
    if (draft.link) draft.link = draft.link.trim();

    if (this.editingId() !== null) {
      const idx = this.evidences.findIndex(e => e.id === this.editingId());
      if (idx !== -1) {
        this.evidenceBody.update(body => {
          const evidences = [...body.evidences];
          evidences[idx] = draft;
          return { ...body, evidences };
        });
      }
    } else {
      this.evidenceBody.update(body => ({
        ...body,
        evidences: [draft, ...body.evidences]
      }));
    }

    this.cancelDraft();
    this.updateTracker();
    void this.saveSection();
  }

  // ── Delete ──────────────────────────────────────────────────────────

  confirmDelete(item: BilateralEvidenceItem): void {
    this.deleteTarget.set(item);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  executeDelete(): void {
    const item = this.deleteTarget();
    if (!item) return;

    this.evidenceBody.update(body => ({
      ...body,
      evidences: body.evidences.filter(e => e !== item)
    }));
    this.deleteTarget.set(null);
    this.updateTracker();
    void this.saveSection();
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  evidenceDisplayName(e: BilateralEvidenceItem): string {
    return e.sp_file_name || e.link || '';
  }

  isFileEvidence(e: BilateralEvidenceItem): boolean {
    return Boolean(e.is_sharepoint);
  }

  private updateTracker(): void {
    this.mdsTracker.setSectionFields('evidence', [
      {
        key: 'valid-link',
        label: 'Evidence with valid link',
        filled: this.hasValidLink,
      },
    ]);
  }
}
