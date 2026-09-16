import { Component, DestroyRef, inject, signal, computed, effect, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { AiProcessingPanelComponent } from '../ai-processing-panel/ai-processing-panel.component';
import { BilateralAiExpectations, BilateralAiMixClass, mixClass } from '../../bilateral-ai-job.model';

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
  imports: [CommonModule, FormsModule, AiProcessingPanelComponent],
  templateUrl: './bilateral-ai-upload.component.html',
  styleUrl: './bilateral-ai-upload.component.scss',
})
export class BilateralAiUploadComponent implements OnInit, OnDestroy {
  private readonly creationService = inject(BilateralCreationService);
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly bilateralAiService = inject(BilateralAiService);
  private readonly messageService = inject(PrToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ctx = inject(BilateralContextService);

  files = signal<UploadFileEntry[]>([]);
  contextText = signal('');
  isUploading = signal(false);
  isDragging = signal(false);
  isRecording = signal(false);
  recordingError = signal<string | null>(null);

  uploadState = this.bilateralAiService.uploadState;

  /** `APF-T-6`: fed straight into `<app-ai-processing-panel>`, never read/computed by this file. */
  currentJob = this.bilateralAiService.currentJob;
  /** 1 s tick for the panel's elapsed clock — runs only while a job is alive (`APF-R-6`). */
  now = signal(Date.now());
  /** `APF-R-6` D: served by the API, cached per mix by the service — never computed client-side. */
  expectation = signal<BilateralAiExpectations | null>(null);
  readonly startedAt = computed(() => this.bilateralAiService.getActiveJobSnapshot()?.startedAt ?? null);

  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private lastExpectationMix: BilateralAiMixClass | null = null;

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

  constructor() {
    // The panel owns no timer of its own (`APF-R-6` A AND-IT-MUST) — this host ticks it, and only
    // while a job is actually alive, so nothing spins once the outcome is terminal.
    effect(() => {
      const status = this.uploadState().status;
      const isLive = status === 'pending' || status === 'processing' || status === 'still_running';
      if (isLive) {
        this.startTick();
      } else {
        this.stopTick();
      }
    });

    // `APF-R-6` D: the expected range is served by the API per mix class; re-subscribing on every
    // poll would leak subscriptions on the `shareReplay(1)` cache, so this only calls out when the
    // mix actually changes (a job's source mix never changes mid-flight, so in practice: once).
    // `takeUntilDestroyed` (captured here, in the constructor's own injection context — not
    // inside the effect callback, which is not one) stops it with the component; `catchError`
    // keeps a failed call from ever reaching the service's `completionNotice`/toast machinery —
    // this is a soft "no range today" outcome, not a job failure — and resets `lastExpectationMix`
    // so a later poll for the SAME mix retries instead of being permanently skipped.
    const destroyRef = inject(DestroyRef);
    effect(() => {
      const job = this.currentJob();
      if (!job) return;
      const mix = mixClass(job);
      if (mix === this.lastExpectationMix) return;
      this.lastExpectationMix = mix;
      this.bilateralAiService
        .expectations(mix)
        .pipe(
          catchError(() => {
            if (this.lastExpectationMix === mix) this.lastExpectationMix = null;
            return of(null);
          }),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe(exp => this.expectation.set(exp));
    });
  }

  ngOnInit(): void {
    // `APF-DD-7`: registers this host as the live outcome surface so the app-wide completion
    // dialog stays silent while the panel is mounted (`APF-R-8` A/B).
    this.bilateralAiService.setPanelVisible(true);

    // `design.md` §6.1 / §2.3: a notification or the header chip deep-links here with `?job=<id>`
    // to open the panel for that specific job.
    const jobId = this.route.snapshot.queryParams['job'];
    if (jobId && this.bilateralAiService.currentJobId() !== jobId) {
      this.bilateralAiService.startJob(jobId);
    }
  }

  ngOnDestroy(): void {
    this.bilateralAiService.setPanelVisible(false);
    this.stopTick();
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

  private startTick(): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  private stopTick(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  // ── Processing panel integration (APF-T-6) ─────────────────────────

  onPanelRetry(): void {
    const jobId = this.uploadState().jobId;
    if (jobId) this.bilateralAiService.retryJob(jobId);
  }

  onPanelReset(): void {
    this.onReset();
  }

  onPanelOpenDrafts(): void {
    void this.router.navigate(['/bilateral', this.ctx.centerAcronym(), 'drafts']);
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
      this.showToast('error', 'Error', 'Project and Science Program required.');
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

    this.bilateralApi.POST_bilateralAiJob(formData).subscribe({
      next: ({ response }) => {
        this.isUploading.set(false);
        const jobId = response?.jobId;
        if (jobId) {
          this.bilateralAiService.startJob(jobId);
        }
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
