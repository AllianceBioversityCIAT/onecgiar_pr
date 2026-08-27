import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { highlightPlannedSearch } from './planned-search.util';

/**
 * Highlights the full query phrase and each word (token) in yellow.
 * Escapes HTML so content cannot inject markup.
 */
@Pipe({ name: 'highlightSearch', standalone: true, pure: true })
export class HighlightSearchPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(text: string | null | undefined, query: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(highlightPlannedSearch(text ?? '', query));
  }
}
