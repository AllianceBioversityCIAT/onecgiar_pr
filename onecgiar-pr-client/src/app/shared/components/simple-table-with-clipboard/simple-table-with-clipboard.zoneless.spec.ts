import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrToastService } from 'src/app/shared/components/pr-toast';

import { SimpleTableWithClipboardComponent } from './simple-table-with-clipboard.component';

/**
 * P2-3322 — zoneless change detection regression guard.
 *
 * `copyTable()` sets `flatFormat = true` so the wrapper drops its styling while the table is copied,
 * then clears it inside nested `setTimeout`s. Before the fix `flatFormat` was a plain field, so the
 * delayed write notified nothing and the table stayed stuck in the flat layout. This test drives the
 * real `(click)` binding and asserts on the RENDERED class, not on the flag.
 */
describe('SimpleTableWithClipboardComponent (zoneless change detection)', () => {
  let component: SimpleTableWithClipboardComponent;
  let fixture: ComponentFixture<SimpleTableWithClipboardComponent>;

  const boxEl = () => fixture.nativeElement.querySelector('.box') as HTMLElement;
  const copyButtonEl = () => fixture.nativeElement.querySelector('.copy_to_clipboard_button') as HTMLElement;

  /**
   * 🛑 Poll, never a fixed sleep. `copyTable` clears the flag through two NESTED 200 ms
   * `setTimeout`s (`simple-table-with-clipboard.component.ts:41-55`), so the old `wait(600)` left
   * only 200 ms of slack: enough on this Mac, not on a CI agent running 597 suites. Jenkins build
   * #2354 (21-Sep) went red on exactly this assertion while the same test passed three times in a
   * row locally, and a red build blocks prtest for the whole team.
   *
   * The guard keeps its teeth: if the repaint never happens the condition never holds, the deadline
   * runs out and the assertions below fail — which is the regression this test exists for.
   */
  const waitForRepaint = async (condition: () => boolean, timeoutMs = 5000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 25));
      await fixture.whenStable();

      if (condition()) return;
    }
  };

  beforeEach(async () => {
    (document as any).execCommand = jest.fn().mockReturnValue(true);
    document.getSelection = jest.fn(() => ({ removeAllRanges: jest.fn(), addRange: jest.fn() })) as any;

    await TestBed.configureTestingModule({
      declarations: [SimpleTableWithClipboardComponent],
      imports: [CommonModule],
      providers: [provideZonelessChangeDetection(), { provide: PrToastService, useValue: { add: jest.fn() } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleTableWithClipboardComponent);
    component = fixture.componentInstance;
    component.tableTitle = 'A table';
    component.header = [{ attr: 'name', name: 'Name', type: 'normal' }] as any;
    component.data = [{ name: 'A row' }] as any;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('restores the normal table layout once the copy timers clear flatFormat', async () => {
    expect(boxEl().classList).not.toContain('flatFormat');

    copyButtonEl().click();
    await fixture.whenStable();

    // Set from the click handler, so it repaints even without the fix.
    expect(boxEl().classList).toContain('flatFormat');

    await waitForRepaint(() => !boxEl().classList.contains('flatFormat'));

    expect(component.flatFormat).toBe(false);
    // Fails without the fix: the flag flipped inside the nested timer but nothing repainted, so the
    // table stayed in the flat layout after copying.
    expect(boxEl().classList).not.toContain('flatFormat');
  }, 15000);
});
