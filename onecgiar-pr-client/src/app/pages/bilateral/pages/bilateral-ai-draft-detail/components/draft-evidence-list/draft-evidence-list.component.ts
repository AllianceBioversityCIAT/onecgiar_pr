import { Component, input, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { BilateralAiJob } from '../../../../services/bilateral-ai.interfaces';

@Component({
  selector: 'app-draft-evidence-list',
  imports: [CommonModule],
  templateUrl: './draft-evidence-list.component.html',
  styleUrl: './draft-evidence-list.component.scss',
})
export class DraftEvidenceListComponent implements OnDestroy {
  private readonly bilateralApi = inject(BilateralApiService);

  job = input<BilateralAiJob | null>(null);

  signedUrls = signal<Record<string, string>>({});
  loadingUrls = signal(true);

  private subs: Subscription[] = [];
  private effectRef = effect(() => {
    const j = this.job();
    if (j) {
      this.signedUrls.set({});
      this.loadingUrls.set(true);
      this.loadSignedUrls(j);
    }
  });

  private loadSignedUrls(job: BilateralAiJob): void {
    this.unsubscribeAll();
    const keys = [
      ...(job.document_keys ?? []),
      ...(job.audio_keys ?? []),
    ];

    if (!keys.length) {
      this.loadingUrls.set(false);
      return;
    }

    const requests = keys.map(key =>
      this.bilateralApi.GET_bilateralAiFileSignedUrl(key).pipe(
        map(({ response }) => ({ key, url: response.url })),
        catchError(() => of({ key, url: null })),
      )
    );

    this.subs.push(
      forkJoin(requests).subscribe(results => {
        const map: Record<string, string> = {};
        for (const { key, url } of results) {
          if (url) map[key] = url;
        }
        this.signedUrls.set(map);
        this.loadingUrls.set(false);
      })
    );
  }

  private unsubscribeAll(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
    this.subs = [];
  }

  ngOnDestroy(): void {
    this.effectRef.destroy();
    this.unsubscribeAll();
  }

  get documents(): string[] {
    return this.job()?.document_keys ?? [];
  }

  get audioFiles(): string[] {
    return this.job()?.audio_keys ?? [];
  }

  get textContext(): string | null {
    return this.job()?.text_context ?? null;
  }

  getFileName(key: string): string {
    const parts = key.split('/');
    return parts[parts.length - 1] ?? key;
  }

  getSignedUrl(key: string): string | undefined {
    return this.signedUrls()[key];
  }

  hasAnyEvidence(): boolean {
    return this.documents.length > 0 || this.audioFiles.length > 0 || !!this.textContext;
  }

  isPdf(key: string): boolean {
    return this.getFileName(key).toLowerCase().endsWith('.pdf');
  }

  isViewableImage(key: string): boolean {
    return /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(this.getFileName(key));
  }
}
