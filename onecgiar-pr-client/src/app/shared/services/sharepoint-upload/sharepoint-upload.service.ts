import { Injectable, inject } from '@angular/core';
import { firstValueFrom, isObservable } from 'rxjs';
import { ResultsApiService } from '../api/results-api.service';

/**
 * The shape every evidence-like item shares. Each surface has its own model, and none of them
 * declares all of these, so everything is optional and written back by index rather than by type.
 */
export interface SharePointUploadItem {
  file?: File | null;
  link?: string | null;
  percentage?: number | string;
  sp_document_id?: string | null;
  sp_file_name?: string | null;
  sp_folder_path?: string | null;
}

/**
 * Which upload session the surface needs. This is the whole reason the service exists: the caller
 * says WHAT it is uploading, never WHICH endpoint to use.
 *
 * - `evidences` → `POST evidences/createUploadSession`
 * - `innovation-development` → `POST v2 innovation-development/evidence_demand/createUploadSession`
 */
export type SharePointUploadFlow = 'evidences' | 'innovation-development';

export interface SharePointUploadOptions {
  resultId: string | number;
  flow?: SharePointUploadFlow;
  /** Skip items that already carry a `link` (already in SharePoint). `rd-evidences` re-uploads. */
  skipAlreadyUploaded?: boolean;
  /** Poll the session every 2 s and write `percentage`. Off where no progress bar is rendered. */
  trackProgress?: boolean;
  /** Prefix for the console error, so a failure says which surface it came from. */
  logLabel?: string;
  /**
   * When the SharePoint response carries no `name`, write the LOCAL file name into `sp_file_name`.
   *
   * Off by default, which is what `rd-evidences` and `bilateral/section-evidence` have always done:
   * a nameless response leaves `sp_file_name` empty there. `innovation-dev-info` is the surface that
   * needs it — its `user-evidence` template gates the whole uploaded-file row on
   * `*ngIf="evidence?.sp_file_name; else uploadfilefield"`, so an empty name makes the just-attached
   * file disappear from the screen and drop back to the drag-and-drop box. Explicit option rather
   * than a new default, so migrating the third surface changes nothing for the first two.
   */
  fallbackToLocalName?: boolean;
}

const PROGRESS_POLL_MS = 2000;

/**
 * P2-3220 — the single place an evidence file reaches SharePoint.
 *
 * Before this, `rd-evidences`, `innovation-dev-info` and `bilateral/section-evidence` each carried
 * their own copy of the same sequence — create session, poll progress, PUT the file, copy four
 * `sp_*` fields off the response — and they did not even share an entry point: two used
 * `POST_createUploadSession` and the third `POST_createUploadSessionP25`. Two doors, so "route
 * every upload through the shared flow" was not something the code could enforce; a new form could
 * call neither and nothing would notice.
 *
 * The contract is deliberately narrow: hand it the items and say what they are. It never throws —
 * it returns the names of the files that did not make it, so every caller can save the rest of its
 * section and still tell the user, by name, which file is not in SharePoint. Losing a whole section
 * of typing because one file failed is the behaviour this replaces.
 */
@Injectable({ providedIn: 'root' })
export class SharePointUploadService {
  private readonly api = inject(ResultsApiService);

  /**
   * Uploads every pending file and returns the names of the ones that failed (empty = all fine).
   */
  async uploadPending(items: SharePointUploadItem[] | null | undefined, options: SharePointUploadOptions): Promise<string[]> {
    const failed: string[] = [];
    if (!Array.isArray(items) || !options?.resultId) return failed;

    const skipAlreadyUploaded = options.skipAlreadyUploaded ?? true;
    let count = 0;

    for (const item of items) {
      if (!item?.file) continue;
      count++;
      if (skipAlreadyUploaded && item.link) continue;

      try {
        const uploadUrl = await this.createSession(options, item.file.name, count);
        const stopProgress = options.trackProgress ? this.trackProgress(uploadUrl, item) : null;

        const response = await this.api.PUT_loadFileInUploadSession(item.file, uploadUrl);

        stopProgress?.();
        this.applyResponse(item, response, options);
      } catch (error) {
        failed.push(item.file?.name ?? 'file');
        console.error(`[${options.logLabel ?? 'sharepoint-upload'}] SharePoint upload failed for`, item.file?.name, error);
      }
    }

    return failed;
  }

  /**
   * Resolves the upload URL for the requested flow.
   *
   * `POST_createUploadSession` returns a promise and `POST_createUploadSessionP25` an observable;
   * both are normalised here so the difference stops leaking into the components.
   */
  private async createSession(options: SharePointUploadOptions, fileName: string, count: number): Promise<string> {
    const body = { resultId: options.resultId, fileName, count };

    const call =
      options.flow === 'innovation-development'
        ? this.api.POST_createUploadSessionP25(body)
        : this.api.POST_createUploadSession(body);

    const envelope: any = isObservable(call) ? await firstValueFrom(call) : await call;

    // The server wraps everything in `{ response, message, status }`. Assigning the envelope
    // instead of `response` sent the PUT to a stringified object and always failed — that was one
    // of the two bugs behind P2-3220 in `section-evidence`.
    return envelope?.response;
  }

  /** Polls the session and writes `percentage`; returns the stopper, which also pins it at 100. */
  private trackProgress(uploadUrl: string, item: SharePointUploadItem): () => void {
    // The poll callback needs the stopper and the stopper needs the timer id, so the id lives in a
    // holder that both can close over without either being declared after its first use.
    const handle: { id?: ReturnType<typeof setInterval> } = {};

    const stop = () => {
      clearInterval(handle.id);
      item.percentage = 100;
    };

    handle.id = setInterval(async () => {
      try {
        const progress = await this.api.GET_loadFileInUploadSession(uploadUrl);
        if (progress?.nextExpectedRanges?.[0]) this.applyPercentage(item, progress);
      } catch {
        stop();
      }
    }, PROGRESS_POLL_MS);

    return stop;
  }

  private applyPercentage(item: SharePointUploadItem, progress: any): void {
    const nextRange = progress?.nextExpectedRanges?.[0];
    const [startByte, totalBytes] = (nextRange?.split('-') || []).map(Number);
    if (!totalBytes || Number(item.percentage) === 100) return;
    item.percentage = ((startByte / totalBytes) * 100).toFixed(0);
  }

  private applyResponse(item: SharePointUploadItem, response: any, options: SharePointUploadOptions): void {
    item.link = response?.webUrl;
    item.sp_document_id = response?.id;
    // `||`, not `??`: the old `innovation-dev-info` copy fell back on an empty string too.
    item.sp_file_name = options.fallbackToLocalName ? response?.name || item.file?.name : response?.name;
    item.sp_folder_path = response?.parentReference?.path?.split('root:')?.pop();
  }
}
