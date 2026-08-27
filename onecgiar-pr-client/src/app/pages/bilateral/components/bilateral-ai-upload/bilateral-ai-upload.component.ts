import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PrToastService } from '../../../../shared/components/pr-toast/pr-toast.service';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';

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
export class BilateralAiUploadComponent implements OnDestroy {
  private readonly creationService = inject(BilateralCreationService);
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly bilateralAiService = inject(BilateralAiService);
  private readonly messageService = inject(PrToastService);

  files = signal<UploadFileEntry[]>([]);
  contextText = signal('');
  isUploading = signal(false);
  isDragging = signal(false);
  isRecording = signal(false);

  uploadState = this.bilateralAiService.uploadState;

  private mediaRecorder: MediaRecorder | null = null;
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

  ngOnDestroy(): void {
    this.stopRecording();
    this.stopAudio();
    this.files().forEach(f => this.revokeUrl(f));
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

  private getFileType(file: File): 'document' | 'audio' | null {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    return null;
  }

  private addFile(file: File, type: 'document' | 'audio'): void {
    if (this.sourceCount() >= MAX_SOURCES) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Limit reached',
        detail: `A maximum of ${MAX_SOURCES} sources is allowed. The additional context text counts as one source.`,
      });
      return;
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (type === 'document' && !DOCUMENT_EXTENSIONS.includes(ext)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid format', detail: `${file.name} is not a supported document format.` });
      return;
    }
    if (type === 'audio' && !AUDIO_EXTENSIONS.includes(ext)) {
      this.messageService.add({ severity: 'error', summary: 'Invalid format', detail: `${file.name} is not a supported audio format.` });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.messageService.add({
        severity: 'error',
        summary: 'File too large',
        detail: `${file.name} exceeds the ${MAX_FILE_SIZE_LABEL} limit.`,
      });
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
      this.messageService.add({ severity: 'error', summary: 'Playback failed', detail: 'Could not play this audio file.' });
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
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeTypes = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', ''];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (!mime || MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);
      this.audioChunks = [];
      const ext = selectedMimeType.includes('mp4') ? '.m4a' : selectedMimeType.includes('ogg') ? '.ogg' : '.webm';
      const finalMime = selectedMimeType || 'audio/webm';

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: finalMime });
        const friendlyName = `Voice Recording (${this.formatDuration(this.recordingDuration())})${ext}`;
        const file = new File([blob], friendlyName, { type: finalMime });
        this.lastRecordingName = friendlyName;
        this.addFile(file, 'audio');
        this.recordingSaved.set(true);
        stream?.getTracks().forEach(t => t.stop());
        this.mediaRecorder = null;
        this.messageService.add({ severity: 'success', summary: 'Recording saved', detail: `"${friendlyName}" added to your files.` });
      };

      this.mediaRecorder.start(1000);
      this.isRecording.set(true);
      this.recordingSaved.set(false);
      this.recordingDuration.set(0);
      this.recordingTimer = setInterval(() => {
        this.recordingDuration.update(d => d + 1);
      }, 1000);
    } catch {
      stream?.getTracks().forEach(t => t.stop());
      this.messageService.add({ severity: 'error', summary: 'Recording failed', detail: 'Could not start voice recording. Check your microphone permissions or try using Chrome/Edge.' });
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
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
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Project and Science Program required.' });
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
      this.messageService.add({ severity: 'error', summary: 'Invalid request', detail });
    } else if (status === 413) {
      this.messageService.add({ severity: 'error', summary: 'File too large', detail: 'Each source must be no larger than 25 MB.' });
    } else if (status === 415) {
      this.messageService.add({ severity: 'error', summary: 'Unsupported format', detail: 'Accepted documents: PDF, DOCX, TXT, XLS, XLSX, PPTX. Audio: MP3, WAV, M4A, OGG, FLAC, WEBM.' });
    } else if (status === 503) {
      this.messageService.add({ severity: 'error', summary: 'Service unavailable', detail: 'AI service temporarily unavailable. Please try again later.' });
    } else {
      this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: err.error?.message || 'An unexpected error occurred.' });
    }
  }
}
