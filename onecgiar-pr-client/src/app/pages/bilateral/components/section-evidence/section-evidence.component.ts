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
import { SharePointUploadService } from '../../../../shared/services/sharepoint-upload/sharepoint-upload.service';
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
  private readonly sharePointUploadSE = inject(SharePointUploadService);

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
   * W1/W2's option lists (evidence-item.component.ts), on the boolean the model already carries.
   * No per-evidence impact-area / result-type checkboxes here: they are not MDS for bilateral
   * results and the fields stay optional on the shared endpoint (Juan, 2026-09-03).
   */
  readonly evidencesType = [
    { id: false, name: 'Link' },
    { id: true, name: 'Upload file' }
  ];

  readonly isPublicFileOptions = [
    { id: false, name: 'No' },
    { id: true, name: 'Yes' }
  ];

  /** W1/W2's "Incorrect format" state for the dropzone (evidence-item `incorrectFile`). */
  readonly incorrectFile = signal(false);

  /** Same copy W1/W2 shows under the public/private answer (`dynamicAlertStatusBasedOnVisibility`). */
  publicFileNote(): string {
    if (this.draftItem().is_public_file) {
      return `
        <b>If you indicate that the file being uploaded to the PRMS repository is public:</b>
        <li>You confirm that the file is publicly accessible.</li>
        <li>You confirm that all intellectual property rights related to the file have been observed. This includes any rights relevant to the document owner’s Center affiliation and any specific rights tied to content within the document, such as images.</li>
        <li>Evidence marked 'Yes' to this question will be displayed in the Results Dashboard and included in technical reporting products.</li>
      `;
    }
    return `
      <b>If you indicate that the file being uploaded to the PRMS repository is NOT public:</b>
      <li>You confirm that the file should not be publicly accessible.</li>
      <li>The file will not be accessible through the CGIAR Results Dashboard.</li>
      <li>The file will be stored in the PRMS repository and will only be accessible by CGIAR staff with the repository link.</li>
    `;
  }

  countWords(text: string | undefined | null): number {
    return (text ?? '').trim().split(/\s+/).filter(Boolean).length;
  }

  get draftDescriptionWords(): number {
    return this.countWords(this.draftItem().description);
  }

  // The W1/W2 "Principal score needs evidence" warning (P2-3375) is deliberately NOT ported here:
  // Impact Area scores are not part of the bilateral MDS, so no evidence is asked for them
  // (Nicoleta Trifa via Ángel Jarrín, 2026-09-03).

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
    // Confirm/delete already persist (W1/W2 behaviour, below). Save draft re-runs the save so a
    // section left in `'error'` — a file that did not reach SharePoint — has a way back.
    this.manualSaveSub = this.autoSave.manualSave$.subscribe(section => {
      if (section !== 'evidence') return;
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
    this.draftItem.update(d => ({ ...d, is_sharepoint: false, file: undefined, sp_file_name: undefined, is_public_file: null }));
  }

  setDraftFileMode(): void {
    this.draftItem.update(d => ({ ...d, is_sharepoint: true, link: undefined }));
  }

  /** "Source of the evidence" radio (W1/W2 `cleanSource`): switching clears the other source's data. */
  onSourceChange(isSharepoint: boolean): void {
    this.incorrectFile.set(false);
    if (isSharepoint) this.setDraftFileMode();
    else this.setDraftLinkMode();
  }

  setDraftLink(value: string): void {
    this.draftItem.update(d => ({ ...d, link: value }));
  }

  setDraftPublic(value: boolean | null): void {
    this.draftItem.update(d => ({ ...d, is_public_file: value }));
  }

  setDraftDescription(value: string): void {
    this.draftItem.update(d => ({ ...d, description: value }));
  }

  onDraftLinkInput(event: Event): void {
    this.setDraftLink((event.target as HTMLInputElement).value);
  }

  onDraftDescriptionInput(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    // P2-3375: the description is capped at 50 WORDS. Extra words are refused rather than truncated
    // mid-word, and the value is pushed back so the control cannot drift from the model.
    if (this.countWords(el.value) > this.maxDescriptionWords) {
      el.value = this.draftItem().description ?? '';
      return;
    }
    this.setDraftDescription(el.value);
  }

  // ── File Handling ───────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (this.validateFileTypes(file)) {
      this.draftItem.update(d => ({ ...d, file, sp_file_name: file.name }));
      this.incorrectFile.set(false);
    } else {
      // W1/W2 shows the "Incorrect format" line under the dropzone instead of a browser alert.
      this.incorrectFile.set(true);
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
      this.incorrectFile.set(false);
    } else {
      this.incorrectFile.set(true);
      setTimeout(() => this.incorrectFile.set(false), 3000);
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
   * The sequence itself now lives in `SharePointUploadService`, the single place an evidence file
   * reaches SharePoint. This section skips items that already carry a `link` and renders no
   * progress bar, hence `skipAlreadyUploaded: true` / `trackProgress: false`.
   *
   * ⚠️ Two bugs lived in the copy this replaced, and the shared service is what keeps them fixed.
   * `POST_createUploadSession` resolves with the whole envelope (`{ response: uploadUrl, message,
   * status }` — see the server's `ReturnResponseUtil.format` in `share-point.service.ts`), and the
   * old code assigned that object straight to `uploadUrl`, so the PUT went to a stringified object
   * and ALWAYS failed. The empty `catch` then swallowed it, so the evidence was saved with no
   * `link` and no `sp_*` metadata and nobody was told. The file itself still reached the backend
   * through the multipart body in `performSave`, so nothing was lost — but the evidence was never
   * linked to SharePoint, which is the whole point of P2-3218.
   *
   * ⚠️ It also passed `count: 0` for every file. The server builds the SharePoint filename as
   * `lastSharepointId + count`, so two files in one save were written to the SAME name and the
   * second overwrote the first. The shared service counts from 1 upwards, which fixes that.
   */
  private async uploadPendingFiles(): Promise<number> {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return 0;

    const failed = await this.sharePointUploadSE.uploadPending(this.evidences, {
      resultId,
      flow: 'evidences',
      skipAlreadyUploaded: true,
      trackProgress: true,
      logLabel: 'section-evidence'
    });

    return failed.length;
  }

  // ── Confirm draft ───────────────────────────────────────────────────
  // W1/W2 behaviour (rd-evidences `confirmCreateEvidence` / `deleteEvidenceWithConfirm`): confirming
  // the modal or a delete persists at once — upload + POST + reload — so nothing is lost by
  // navigating away. Decided over the staged-only variant on 2026-09-03 (Juan): the W1/W2
  // functionality prevails for Evidence. Save draft in the footer re-runs the same save.

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

  evidenceTypeLabel(e: BilateralEvidenceItem): string {
    return this.isFileEvidence(e) ? 'File Evidence' : 'Link Evidence';
  }

  /** A file evidence is "uploading" while the section saves and its link has not landed yet. */
  isEvidenceUploading(e: BilateralEvidenceItem): boolean {
    return Boolean(this.isSaving() && e?.is_sharepoint && e?.file && !e?.link);
  }

  evidenceUploadingName(e: BilateralEvidenceItem): string {
    return e?.file?.name || e?.sp_file_name || 'Uploading file…';
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
