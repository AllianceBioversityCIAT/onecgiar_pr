import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../../shared/services/api/api.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralEvidenceItem, BilateralEvidenceBody } from './section-evidence.model';
import { FormSkeletonComponent } from '../form-skeleton/form-skeleton.component';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-section-evidence',
  imports: [CommonModule, FormsModule, FormSkeletonComponent],
  templateUrl: './section-evidence.component.html',
  styleUrl: './section-evidence.component.scss'
})
export class SectionEvidenceComponent implements OnInit {
  readonly api = inject(ApiService);
  readonly creationService = inject(BilateralCreationService);
  readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly http = inject(HttpClient);

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

  saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  readonly maxItems = 6;

  get evidences(): BilateralEvidenceItem[] {
    return this.evidenceBody().evidences ?? [];
  }

  get canAddMore(): boolean {
    return this.evidences.length < this.maxItems;
  }

  get hasValidLink(): boolean {
    return this.evidences.some(e => e.link && !this.isCloudLink(e.link));
  }

  private readonly CLOUD_REGEX =
    /^(https?:\/\/)?(www\.)?(drive\.google\.com|docs\.google\.com|onedrive\.live\.com|1drv\.ms|dropbox\.com|([\w-]+\.)?sharepoint\.com)(\/.*)?$/i;

  private readonly CGSPACE_REGEX =
    /^https:\/\/(?:cgspace\.cgiar\.org\/items\/[0-9a-f-]{36}|cgspace\.cgiar\.org\/handle\/10568\/\d+)$/;

  private readonly VALID_EXTENSIONS = ['.jpg', '.png', '.pdf', '.doc', '.docx', '.pptx', '.jpeg', '.xlsx', '.xlsm'];

  ngOnInit(): void {
    this.loadEvidences();
  }

  loadEvidences(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;

    this.isLoading.set(true);
    this.api.resultsSE.GET_evidences().subscribe({
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
      const t = d ? new Date(d).getTime() : NaN;
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
    const regex =
      /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}(:[0-9]{1,5})?(\/\S*)?$/i;
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
    const value = (event.target as HTMLTextAreaElement).value;
    this.draftItem.update(d => ({ ...d, description: value }));
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

  async saveSection(): Promise<void> {
    this.saveStatus.set('saving');
    this.isSaving.set(true);

    await this.uploadPendingFiles();

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

    this.http
      .post<any>(`${this.api.resultsSE.apiBaseUrl}evidences/create/${resultId}`, formData)
      .subscribe({
        next: () => {
          this.saveStatus.set('saved');
          this.isSaving.set(false);
          setTimeout(() => this.saveStatus.set('idle'), 2500);
          this.loadEvidences();
        },
        error: () => {
          this.saveStatus.set('error');
          this.isSaving.set(false);
        }
      });
  }

  private async uploadPendingFiles(): Promise<void> {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;

    for (const evidence of this.evidences) {
      if (!evidence.file || evidence.link) continue;
      try {
        const uploadUrl = await this.api.resultsSE.POST_createUploadSession({
            resultId,
            fileName: evidence.file.name,
            count: 0
          });
        const response = await this.api.resultsSE.PUT_loadFileInUploadSession(evidence.file, uploadUrl);
        evidence.link = response?.webUrl;
        evidence.sp_document_id = response?.id;
        evidence.sp_file_name = response?.name;
        evidence.sp_folder_path = response?.parentReference?.path?.split('root:').pop();
      } catch {
        // file upload failed — evidence stays without link
      }
    }
  }

  // ── Confirm draft (add to local list before section save) ───────────

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
  }

  // ── Delete ──────────────────────────────────────────────────────────

  deleteItem(item: BilateralEvidenceItem): void {
    if (!confirm('Are you sure you want to delete this evidence?')) return;

    this.evidenceBody.update(body => ({
      ...body,
      evidences: body.evidences.filter(e => e !== item)
    }));
    this.updateTracker();
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  evidenceDisplayName(e: BilateralEvidenceItem): string {
    return e.sp_file_name || e.link || '';
  }

  isFileEvidence(e: BilateralEvidenceItem): boolean {
    return Boolean(e.is_sharepoint);
  }

  private updateTracker(): void {
    const filled = this.hasValidLink ? 1 : 0;
    this.mdsTracker.updateSection('evidence', filled);
  }
}
