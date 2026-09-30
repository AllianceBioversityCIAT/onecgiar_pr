import { Component, EventEmitter, Output, inject, signal, computed, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BILATERAL_AI_PROCESSES_COPY } from '../../../../internationalization/bilateral-ai-processes.copy';

interface UploadFileEntry {
  id: string;
  file: File;
  type: 'document' | 'audio';
  progress?: number;
  url?: string;
}

const DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.xls', '.xlsx', '.pptx'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.flac'];

/**
 * P2-3437 #5 - these MUST mirror the server, which is the only authority.
 * See onecgiar-pr-server/src/api/bilateral-ai/services/bilateral-ai-file-storage.service.ts:
 *   :19  maxFileSize = 25_000_000  -> every source, document or audio alike
 *   :20  maxSources  = 6           -> counted at :28 as files + (text ? 1 : 0)
 *   :59  text length > 50_000      -> rejected
 * The screen used to advertise 50 MB / 100 MB and 6 files "not counting text",
 * which invited uploads the server was always going to reject with a 400.
 */
const MAX_FILE_SIZE = 25_000_000;
const MAX_FILE_SIZE_LABEL = '25 MB';
const MAX_SOURCES = 6;
const MAX_TEXT_LENGTH = 50_000;

@Component({
  selector: 'app-bilateral-ai-upload',
  imports: [CommonModule, FormsModule],
  templateUrl: './bilateral-ai-upload.component.html',
  styleUrl: './bilateral-ai-upload.component.scss',
})
export class BilateralAiUploadComponent implements OnInit, OnDestroy {
  private readonly creationService = inject(BilateralCreationService);
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly bilateralAiService = inject(BilateralAiService);
  private readonly messageService = inject(PrToastService);
  private readonly route = inject(ActivatedRoute);

  /**
   * `AIQ-R-7` B: emitted when the reporter dismisses the post-submit confirmation card via
   * "Choose another project". The host decides what that means for its own wizard/drawer state —
   * this component only knows it just finished with the project it had.
   */
  @Output() readonly chooseAnotherProject = new EventEmitter<void>();

  /**
   * P2-3853 fix: emitted from `onOpenAiProcesses()` so a host that stacks a drawer/dialog on top
   * of its own drawer (`bilateral-manual-create-drawer-host`) can close itself first. A host that
   * has nothing on top of (the wizard page) simply doesn't bind it — today's behavior there is
   * unchanged.
   */
  @Output() readonly openedAiProcesses = new EventEmitter<void>();

  readonly copy = BILATERAL_AI_PROCESSES_COPY;

  files = signal<UploadFileEntry[]>([]);
  contextText = signal('');
  isUploading = signal(false);
  isDragging = signal(false);
  isRecording = signal(false);
  recordingError = signal<string | null>(null);

  uploadState = this.bilateralAiService.uploadState;

  /**
   * `AIQ-R-7` B: set on a 202, cleared by either confirmation-card action. The form itself is
   * ALWAYS rendered underneath (`AIQ-R-7` A/B "must NOT replace the upload form with a processing
   * panel") — this only toggles the confirmation banner above it.
   */
  justSubmittedProjectName = signal<string | null>(null);

  private mediaRecorder: MediaRecorder | null = null;
  private currentStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  recordingDuration = signal(0);
  private recordingTimer: ReturnType<typeof setInterval> | null = null;
  recordingSaved = signal(false);
  lastRecordingName = '';

  playingAudioId = signal<string | null>(null);
  currentAudioTime = signal(0);
  audioDuration = signal(0);
  private audioElement: HTMLAudioElement | null = null;

  readonly MAX_SOURCES = MAX_SOURCES;
  readonly MAX_FILE_SIZE_LABEL = MAX_FILE_SIZE_LABEL;
  readonly MAX_TEXT_LENGTH = MAX_TEXT_LENGTH;
  readonly acceptedDocumentTypes = DOCUMENT_EXTENSIONS.join(',');
  readonly acceptedAudioTypes = AUDIO_EXTENSIONS.join(',');

  /** P2-3103 AC2: full name of the center the user is reporting on behalf of. */
  reportingCenterName = computed(
    () => this.creationService.selectedProject()?.leadCenter?.name ?? '',
  );

  fileList = computed(() => this.files());
  documentCount = computed(() => this.files().filter(f => f.type === 'document').length);
  audioCount = computed(() => this.files().filter(f => f.type === 'audio').length);

  /** The typed context counts as one source on the server, so it counts here too. */
  hasTextSource = computed(() => this.contextText().trim().length > 0);
  sourceCount = computed(() => this.files().length + (this.hasTextSource() ? 1 : 0));
  canAddMore = computed(() => this.sourceCount() < MAX_SOURCES);
  tooManySources = computed(() => this.sourceCount() > MAX_SOURCES);
  textTooLong = computed(() => this.contextText().trim().length > MAX_TEXT_LENGTH);

  canSubmit = computed(
    () =>
      this.sourceCount() > 0 &&
      !this.tooManySources() &&
      !this.textTooLong() &&
      !this.isUploading(),
  );

  /**
   * `AIQ-T-7`: the `?job=` email-failure deep link (P-23, producer at
   * `bilateral-ai-notifications.service.ts:183-186`). Wherever this component is mounted, landing
   * with `?job=` opens the drawer highlighting that job — `startJob` (single-job polling) is gone;
   * the list service is the only source of truth now (design §6.1/§6.2).
   */
  ngOnInit(): void {
    const jobId = this.route.snapshot?.queryParams?.['job'];
    if (jobId) this.bilateralAiService.openDrawer(jobId);
  }

  ngOnDestroy(): void {
    this.cancelRecording();
    this.stopAudio();
    this.files().forEach(f => this.revokeUrl(f));
  }

  showToast(severity: 'success' | 'info' | 'warn' | 'error', summary: string, detail: string): void {
    this.messageService.add({
      key: 'globalUserNotification',
      severity,
      summary,
      detail,
    });
  }

  clearRecordingError(): void {
    this.recordingError.set(null);
  }

  /**
   * `AIQ-R-7` B: "Open AI processes" — dismiss the confirmation and open the drawer.
   * P2-3853 fix: also tell the host we just opened the AI processes drawer, so a host that is
   * itself a drawer (`bilateral-manual-create-drawer-host`) can close before the dialog opens on
   * top of it, instead of stacking two panels.
   */
  onOpenAiProcesses(): void {
    this.justSubmittedProjectName.set(null);
    this.bilateralAiService.openDrawer();
    this.openedAiProcesses.emit();
  }

  /** `AIQ-R-7` B: "Choose another project" — dismiss the confirmation; the host (wizard/drawer)
   *  decides what picking a different project means for its own state. */
  onChooseAnotherProject(): void {
    this.justSubmittedProjectName.set(null);
    this.chooseAnotherProject.emit();
  }

  // ── File Handling ───────────────────────────────────────────────────

  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    for (const file of Array.from(input.files)) {
      this.addFile(file, 'document');
    }
    input.value = '';
  }

  onAudioSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    for (const file of Array.from(input.files)) {
      this.addFile(file, 'audio');
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (!event.dataTransfer?.files.length) return;
    for (const file of Array.from(event.dataTransfer.files)) {
      const type = this.getFileType(file);
      if (type) this.addFile(file, type);
    }
  }

  removeFile(id: string): void {
    const entry = this.files().find(f => f.id === id);
    if (entry) this.revokeUrl(entry);
    if (this.playingAudioId() === id) this.stopAudio();
    this.files.update(list => list.filter(f => f.id !== id));
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getFileIcon(file: File): string {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (ext === '.pdf') return 'picture_as_pdf';
    if (ext === '.docx' || ext === '.doc') return 'article';
    if (['.xls', '.xlsx', '.csv'].includes(ext)) return 'table_chart';
    if (['.ppt', '.pptx'].includes(ext)) return 'slideshow';
    if (DOCUMENT_EXTENSIONS.includes(ext)) return 'description';
    return 'audiotrack';
  }

  getFileIconClass(file: File): string {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (ext === '.pdf') return 'aiu-file-badge--pdf';
    if (ext === '.docx' || ext === '.doc') return 'aiu-file-badge--doc';
    if (['.xls', '.xlsx', '.csv'].includes(ext)) return 'aiu-file-badge--sheet';
    if (['.ppt', '.pptx'].includes(ext)) return 'aiu-file-badge--pres';
    return 'aiu-file-badge--audio';
  }

  private getFileType(file: File): 'document' | 'audio' | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    return null;
  }

  private addFile(file: File, type: 'document' | 'audio'): void {
    if (this.sourceCount() >= MAX_SOURCES) {
      this.showToast(
        'warn',
        'Limit reached',
        `A maximum of ${MAX_SOURCES} sources is allowed. The additional context text counts as one source.`,
      );
      return;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (type === 'document' && !DOCUMENT_EXTENSIONS.includes(ext)) {
      this.showToast('error', 'Invalid format', `${file.name} is not a supported document format.`);
      return;
    }
    if (type === 'audio' && !AUDIO_EXTENSIONS.includes(ext)) {
      this.showToast('error', 'Invalid format', `${file.name} is not a supported audio format.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.showToast(
        'error',
        'File too large',
        `${file.name} exceeds the ${MAX_FILE_SIZE_LABEL} limit.`,
      );
      return;
    }

    const id = crypto.randomUUID();
    this.files.update(list => [...list, { id, file, type }]);
  }

  // ── Audio Playback ──────────────────────────────────────────────────

  playAudio(entry: UploadFileEntry): void {
    if (this.playingAudioId() === entry.id) {
      this.stopAudio();
      return;
    }

    this.stopAudio();
    const url = entry.url || URL.createObjectURL(entry.file);
    entry.url = url;

    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      this.audioDuration.set(audio.duration);
    };
    audio.ontimeupdate = () => {
      this.currentAudioTime.set(audio.currentTime);
    };
    audio.onended = () => {
      this.playingAudioId.set(null);
      this.currentAudioTime.set(0);
      this.audioElement = null;
    };

    audio.play().catch(() => {
      this.showToast('error', 'Playback failed', 'Could not play this audio file.');
    });

    this.audioElement = audio;
    this.playingAudioId.set(entry.id);
  }

  stopAudio(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.audioElement = null;
    }
    this.playingAudioId.set(null);
    this.currentAudioTime.set(0);
  }

  downloadFile(entry: UploadFileEntry): void {
    const url = entry.url || URL.createObjectURL(entry.file);
    entry.url = url;
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.file.name;
    a.click();
  }

  private revokeUrl(entry: UploadFileEntry): void {
    if (entry.url) {
      URL.revokeObjectURL(entry.url);
      entry.url = undefined;
    }
  }

  // ── Audio Recording ─────────────────────────────────────────────────

  async startRecording(): Promise<void> {
    this.recordingError.set(null);
    this.recordingSaved.set(false);

    if (this.sourceCount() >= MAX_SOURCES) {
      this.showToast(
        'warn',
        'Limit reached',
        `A maximum of ${MAX_SOURCES} sources is allowed. Remove a file or context text to record a voice note.`,
      );
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const isSecure = typeof window !== 'undefined' ? window.isSecureContext : true;
      const detail = !isSecure
        ? 'Voice recording requires a secure connection (HTTPS or localhost). Please access this site over HTTPS or localhost.'
        : 'Audio recording is not supported in this browser. Please use Chrome, Edge, Safari, or Firefox.';
      this.recordingError.set(detail);
      this.showToast('error', 'Recording unavailable', detail);
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      const detail = 'Your browser does not support MediaRecorder. Please try using a recent version of Chrome, Edge, Safari, or Firefox.';
      this.recordingError.set(detail);
      this.showToast('error', 'Recording unavailable', detail);
      return;
    }

    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];
      let selectedMimeType = '';
      for (const mime of candidateTypes) {
        if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(
        this.currentStream,
        selectedMimeType ? { mimeType: selectedMimeType } : undefined,
      );
      this.audioChunks = [];

      let ext = '.webm';
      const finalMime = this.mediaRecorder.mimeType || selectedMimeType || 'audio/webm';
      if (finalMime.includes('mp4') || finalMime.includes('m4a') || finalMime.includes('aac')) {
        ext = '.m4a';
      } else if (finalMime.includes('ogg')) {
        ext = '.ogg';
      } else if (finalMime.includes('wav')) {
        ext = '.wav';
      }

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: finalMime });
        if (blob.size === 0) {
          this.recordingError.set('No audio was captured. Please check your microphone and try again.');
          this.showToast('warn', 'Empty recording', 'No audio was detected in the recording.');
          this.stopStream();
          this.mediaRecorder = null;
          return;
        }

        const friendlyName = `Voice Recording (${this.formatDuration(this.recordingDuration())})${ext}`;
        const file = new File([blob], friendlyName, { type: finalMime });
        this.lastRecordingName = friendlyName;
        this.addFile(file, 'audio');
        this.recordingSaved.set(true);
        this.stopStream();
        this.mediaRecorder = null;
        this.showToast('success', 'Recording saved', `"${friendlyName}" added to your files.`);
      };

      this.mediaRecorder.start(1000);
      this.isRecording.set(true);
      this.recordingSaved.set(false);
      this.recordingDuration.set(0);
      this.recordingTimer = setInterval(() => {
        this.recordingDuration.update(d => d + 1);
      }, 1000);
    } catch (err: unknown) {
      this.stopStream();
      this.mediaRecorder = null;
      let detail = 'Could not start voice recording. Check your microphone permissions or try using Chrome/Edge.';
      if (err && typeof err === 'object' && 'name' in err) {
        const name = (err as { name?: string }).name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          detail = 'Microphone access was denied. Please allow microphone permissions in your browser address bar and try again.';
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          detail = 'No microphone was detected on this device. Please connect a microphone and try again.';
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          detail = 'The microphone is already in use by another application or browser tab.';
        } else if (name === 'SecurityError') {
          detail = 'Microphone access is blocked by browser security policy (requires HTTPS or localhost).';
        }
      } else if (err instanceof Error && err.message) {
        detail = err.message;
      }
      this.recordingError.set(detail);
      this.showToast('error', 'Recording failed', detail);
    }
  }

  cancelRecording(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = null;
      if (this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch {
          // ignore
        }
      }
      this.mediaRecorder = null;
    }
    this.stopStream();
    this.audioChunks = [];
    this.isRecording.set(false);
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.recordingDuration.set(0);
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.isRecording.set(false);
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  private stopStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(t => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
      this.currentStream = null;
    }
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Submit ──────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.canSubmit()) return;

    const project = this.creationService.selectedProject();
    const sp = this.creationService.selectedPrimarySp();

    if (!project?.id || !sp?.programCode || !project?.leadCenter?.id) {
      // The lead centre is not something the user picks — it rides along with the project — so a
      // message naming only the project and the Science Program sent people looking at two fields
      // that were already filled in. Name whatever is actually missing.
      const missing = [
        project?.id ? null : 'Project',
        sp?.programCode ? null : 'Science Program',
        project?.leadCenter?.id ? null : 'lead center for this project',
      ].filter((label): label is string => label !== null);
      this.showToast('error', 'Error', `Missing: ${missing.join(', ')}.`);
      return;
    }

    this.isUploading.set(true);
    this.bilateralAiService.setUploadStatus('uploading');

    const formData = new FormData();
    formData.append('project_id', String(project.id));
    formData.append('center_id', String(project.leadCenter.id));
    formData.append('program_code', sp.programCode);
    if (this.contextText().trim()) {
      formData.append('text', this.contextText().trim());
    }

    for (const entry of this.files()) {
      if (entry.type === 'document') {
        formData.append('documents', entry.file, entry.file.name);
      } else {
        formData.append('audio', entry.file, entry.file.name);
      }
    }

    // `AIQ-R-7` B: read before the form resets below, or the confirmation card would name whatever
    // project the reporter has selected AFTER the reset (none).
    const projectLabel = project.shortName || project.fullName || this.reportingCenterName() || 'Your project';

    this.bilateralApi.POST_bilateralAiJob(formData).subscribe({
      next: ({ response }) => {
        this.isUploading.set(false);
        // `addSubmittedJob(response)` is `startJob`'s multi-job replacement (design §6.2, `AIQ-R-7`
        // B "the new job appears in the drawer at once").
        this.bilateralAiService.addSubmittedJob(response);
        // Never-blocking submit (`AIQ-R-7` B): the form resets to empty — the panel this used to
        // hand off to is retired (`AIQ-DD-8`) — and a dismissible confirmation + a toast with a
        // View action point at the drawer instead. `clearUploadState()` only narrows this
        // component's own idle/uploading status now (DD-11); it no longer touches any job state.
        this.files.set([]);
        this.contextText.set('');
        this.bilateralAiService.clearUploadState();
        this.justSubmittedProjectName.set(projectLabel);
        this.messageService.add({
          key: 'globalUserNotification',
          severity: 'success',
          summary: this.copy.toast.summary(projectLabel),
          detail: this.copy.toast.detail,
          // P2-3853 fix: route the toast's View action through the same handler as the
          // confirmation card's "Open AI processes" button, so it also emits `openedAiProcesses`
          // and a host that is itself a drawer closes instead of stacking on top of itself.
          action: { label: this.copy.toast.viewAction, run: () => this.onOpenAiProcesses() },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isUploading.set(false);
        this.bilateralAiService.setUploadStatus('idle');
        this.handleUploadError(err);
      },
    });
  }

  onReset(): void {
    this.files.set([]);
    this.contextText.set('');
    this.bilateralAiService.clearUploadState();
  }

  private handleUploadError(err: HttpErrorResponse): void {
    const status = err.status;
    if (status === 400) {
      const detail = err.error?.message ?? 'Check file format and try again.';
      this.showToast('error', 'Invalid request', detail);
    } else if (status === 413) {
      this.showToast('error', 'File too large', 'Each source must be no larger than 25 MB.');
    } else if (status === 415) {
      this.showToast('error', 'Unsupported format', 'Accepted documents: PDF, DOCX, TXT, XLS, XLSX, PPTX. Audio: MP3, WAV, M4A, OGG, FLAC, WEBM.');
    } else if (status === 503) {
      this.showToast('error', 'Service unavailable', 'AI service temporarily unavailable. Please try again later.');
    } else {
      this.showToast('error', 'Upload failed', err.error?.message || 'An unexpected error occurred.');
    }
  }
}
