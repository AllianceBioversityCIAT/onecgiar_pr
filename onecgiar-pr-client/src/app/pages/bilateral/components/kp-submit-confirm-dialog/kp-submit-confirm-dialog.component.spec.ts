import { readFileSync } from 'fs';
import { join } from 'path';
import { TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { of } from 'rxjs';
import { HlmDialogService } from '@spartan/dialog';
import { KpSubmitConfirmDialogComponent } from './kp-submit-confirm-dialog.component';
import { KpSubmitConfirmDialogService } from './kp-submit-confirm-dialog.service';
import { BILATERAL_KP_SUBMIT_COPY } from '../../../../internationalization/bilateral-kp-submit.copy';

describe('KpSubmitConfirmDialogComponent (P2-3980)', () => {
  const html = readFileSync(join(__dirname, 'kp-submit-confirm-dialog.component.html'), 'utf8');
  let dialogRef: { close: jest.Mock };

  const mount = () => {
    const fixture = TestBed.createComponent(KpSubmitConfirmDialogComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    dialogRef = { close: jest.fn() };
    TestBed.configureTestingModule({
      imports: [KpSubmitConfirmDialogComponent],
      providers: [{ provide: BrnDialogRef, useValue: dialogRef }],
    });
  });

  it('states that the result goes to the Science Program', () => {
    expect(BILATERAL_KP_SUBMIT_COPY.body).toBe('This result will be sent to the Science Program for review.');
    const text = mount().nativeElement.textContent;
    expect(text).toContain('Submit for review');
    expect(text).toContain('This result will be sent to the Science Program for review.');
  });

  it('Submit resolves "submit"', () => {
    mount().nativeElement.querySelector('[data-testid="kp-submit-confirm"]').click();
    expect(dialogRef.close).toHaveBeenCalledWith('submit');
  });

  it('Cancel resolves "cancel"', () => {
    mount().nativeElement.querySelector('[data-testid="kp-submit-cancel"]').click();
    expect(dialogRef.close).toHaveBeenCalledWith('cancel');
  });

  it('Escape cancels (never submits)', () => {
    const fixture = mount();
    fixture.nativeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dialogRef.close).toHaveBeenCalledWith('cancel');
    expect(dialogRef.close).not.toHaveBeenCalledWith('submit');
  });

  it('renders its copy from the copy file, not hardcoded in the template', () => {
    expect(html).toContain('copy.title');
    expect(html).toContain('copy.body');
    expect(html).not.toContain('Science Program');
  });
});

describe('KpSubmitConfirmDialogService (P2-3980)', () => {
  it('opens a non-dismissable alertdialog and maps a missing result to cancel', (done) => {
    const open = jest.fn().mockReturnValue({ closed$: of(undefined) });
    TestBed.configureTestingModule({ providers: [{ provide: HlmDialogService, useValue: { open } }] });

    TestBed.inject(KpSubmitConfirmDialogService).open().subscribe((result) => {
      expect(result).toBe('cancel');
      expect(open).toHaveBeenCalledWith(
        KpSubmitConfirmDialogComponent,
        expect.objectContaining({ disableClose: true, showCloseButton: false, role: 'alertdialog' }),
      );
      done();
    });
  });

  it('passes the chosen result through', (done) => {
    const open = jest.fn().mockReturnValue({ closed$: of('submit') });
    TestBed.configureTestingModule({ providers: [{ provide: HlmDialogService, useValue: { open } }] });
    TestBed.inject(KpSubmitConfirmDialogService).open().subscribe((result) => {
      expect(result).toBe('submit');
      done();
    });
  });
});
