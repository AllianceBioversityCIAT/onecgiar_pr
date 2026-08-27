import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { HighlightSearchPipe } from './highlight-search.pipe';

describe('HighlightSearchPipe', () => {
  let pipe: HighlightSearchPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        HighlightSearchPipe,
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustHtml: (v: string) => v
          }
        }
      ]
    });
    pipe = TestBed.inject(HighlightSearchPipe);
  });

  it('returns escaped text when query is empty', () => {
    expect(pipe.transform('A <b>tag', '')).toBe('A &lt;b&gt;tag');
  });

  it('highlights each word when the query is split', () => {
    const html = pipe.transform('Market Intelligence', 'intelligence ma') as string;
    expect(html).toContain('<mark class="planned-search-hit">Ma</mark>');
    expect(html).toContain('<mark class="planned-search-hit">Intelligence</mark>');
  });

  it('escapes regex metacharacters in the query', () => {
    const html = pipe.transform('cost is $5.00', '$5.00') as string;
    expect(html).toContain('<mark class="planned-search-hit">$5.00</mark>');
  });
});
