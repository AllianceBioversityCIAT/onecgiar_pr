import { TestBed } from '@angular/core/testing';
import { HlmDialogService } from '@spartan/dialog';
import { of } from 'rxjs';
import { UnsavedChangesDialogComponent } from './unsaved-changes-dialog.component';
import { UnsavedChangesDialogService } from './unsaved-changes-dialog.service';

describe('UnsavedChangesDialogService', () => {
  let openSpy: jest.Mock;

  function setup(closedValue: 'save' | 'discard' | undefined): UnsavedChangesDialogService {
    openSpy = jest.fn().mockReturnValue({ closed$: of(closedValue) });

    TestBed.configureTestingModule({
      providers: [UnsavedChangesDialogService, { provide: HlmDialogService, useValue: { open: openSpy } }]
    });

    return TestBed.inject(UnsavedChangesDialogService);
  }

  it('opens UnsavedChangesDialogComponent with no third exit path (disableClose, no close button)', (done) => {
    const service = setup('save');

    service.openSaveDiscard().subscribe((result) => {
      expect(result).toBe('save');
      expect(openSpy).toHaveBeenCalledWith(
        UnsavedChangesDialogComponent,
        expect.objectContaining({ disableClose: true, showCloseButton: false })
      );
      done();
    });
  });

  it('resolves discard', (done) => {
    const service = setup('discard');

    service.openSaveDiscard().subscribe((result) => {
      expect(result).toBe('discard');
      done();
    });
  });

  it('defensively maps an undefined resolution to discard (no path should produce this today)', (done) => {
    const service = setup(undefined);

    service.openSaveDiscard().subscribe((result) => {
      expect(result).toBe('discard');
      done();
    });
  });
});
