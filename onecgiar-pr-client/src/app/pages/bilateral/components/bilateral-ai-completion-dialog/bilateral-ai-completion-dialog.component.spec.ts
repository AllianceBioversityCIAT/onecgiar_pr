import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BilateralAiCompletionDialogComponent } from './bilateral-ai-completion-dialog.component';

/**
 * `AIQ-T-5` (`design.md` §6.2, `AIQ-DD-6`): `BilateralAiService.completionNotice` /
 * `dismissCompletionNotice` / `openDraftsFromNotice` are removed — this dialog's real behavioral
 * coverage (every terminal-state rendering, the two action buttons, the provenance line, and the
 * `panelVisible` suppression regression that used to live here) is retired along with the dialog
 * itself by `AIQ-T-10` ("Retire the panel and the completion dialog; mount the watcher"), which
 * deletes `bilateral-ai-completion-dialog/` outright. This task only needed the suite to keep
 * compiling; it is intentionally reduced to that single fact rather than pinned to now-dead
 * single-job behavior that the very next reader-owning task removes anyway.
 */
describe('BilateralAiCompletionDialogComponent', () => {
  let fixture: ComponentFixture<BilateralAiCompletionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BilateralAiCompletionDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BilateralAiCompletionDialogComponent);
    fixture.detectChanges();
  });

  it('renders nothing — the dialog is inert pending AIQ-T-10', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('app-pr-dialog')).toBeNull();
  });
});
