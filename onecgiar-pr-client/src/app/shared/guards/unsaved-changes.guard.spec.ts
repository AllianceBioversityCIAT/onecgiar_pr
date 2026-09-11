import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UnsavedChangesGuard } from './unsaved-changes.guard';
import { CanComponentDeactivate } from './unsaved-changes.types';
import { UnsavedNavigationIntentService } from '../services/unsaved-changes/unsaved-navigation-intent.service';
import { UnsavedChangesDialogService } from '../components/unsaved-changes-dialog/unsaved-changes-dialog.service';

describe('UnsavedChangesGuard', () => {
  let guard: UnsavedChangesGuard;
  let intentSE: jest.Mocked<UnsavedNavigationIntentService>;
  let dialogSE: jest.Mocked<UnsavedChangesDialogService>;
  let component: jest.Mocked<CanComponentDeactivate>;

  beforeEach(() => {
    const intentServiceMock = {
      markSilent: jest.fn(),
      consumeSilent: jest.fn()
    };
    const dialogServiceMock = {
      openSaveDiscard: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        UnsavedChangesGuard,
        { provide: UnsavedNavigationIntentService, useValue: intentServiceMock },
        { provide: UnsavedChangesDialogService, useValue: dialogServiceMock }
      ]
    });

    guard = TestBed.inject(UnsavedChangesGuard);
    intentSE = TestBed.inject(UnsavedNavigationIntentService) as jest.Mocked<UnsavedNavigationIntentService>;
    dialogSE = TestBed.inject(UnsavedChangesDialogService) as jest.Mocked<UnsavedChangesDialogService>;

    component = {
      hasUnsavedChanges: jest.fn(),
      saveSection: jest.fn()
    };
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('returns true immediately when not dirty, and never calls the dialog or saveSection', () => {
    component.hasUnsavedChanges.mockReturnValue(false);
    intentSE.consumeSilent.mockReturnValue(false);

    const result = guard.canDeactivate(component);

    expect(result).toBe(true);
    expect(dialogSE.openSaveDiscard).not.toHaveBeenCalled();
    expect(component.saveSection).not.toHaveBeenCalled();
  });

  it('still consumes the silent flag when not dirty, clearing a stray leftover flag', () => {
    component.hasUnsavedChanges.mockReturnValue(false);
    intentSE.consumeSilent.mockReturnValue(true);

    guard.canDeactivate(component);

    expect(intentSE.consumeSilent).toHaveBeenCalledTimes(1);
  });

  it('dirty + silent flag set: calls saveSection() directly, never opens the dialog, resolves true on success', done => {
    component.hasUnsavedChanges.mockReturnValue(true);
    intentSE.consumeSilent.mockReturnValue(true);
    component.saveSection.mockReturnValue(of(true));

    const result = guard.canDeactivate(component);

    expect(dialogSE.openSaveDiscard).not.toHaveBeenCalled();
    expect(component.saveSection).toHaveBeenCalledTimes(1);

    (result as ReturnType<typeof of<boolean>>).subscribe(value => {
      expect(value).toBe(true);
      done();
    });
  });

  it('dirty + silent flag set: saveSection() fails resolves false (navigation blocked)', done => {
    component.hasUnsavedChanges.mockReturnValue(true);
    intentSE.consumeSilent.mockReturnValue(true);
    component.saveSection.mockReturnValue(of(false));

    const result = guard.canDeactivate(component);

    (result as ReturnType<typeof of<boolean>>).subscribe(value => {
      expect(value).toBe(false);
      done();
    });
  });

  it('dirty + silent flag NOT set: opens the dialog, does not call saveSection before the user answers', () => {
    component.hasUnsavedChanges.mockReturnValue(true);
    intentSE.consumeSilent.mockReturnValue(false);
    dialogSE.openSaveDiscard.mockReturnValue(of('discard'));

    guard.canDeactivate(component);

    expect(dialogSE.openSaveDiscard).toHaveBeenCalledTimes(1);
  });

  it("dialog resolves 'discard': resolves true without ever calling saveSection()", done => {
    component.hasUnsavedChanges.mockReturnValue(true);
    intentSE.consumeSilent.mockReturnValue(false);
    dialogSE.openSaveDiscard.mockReturnValue(of('discard'));

    const result = guard.canDeactivate(component);

    (result as ReturnType<typeof of<boolean>>).subscribe(value => {
      expect(value).toBe(true);
      expect(component.saveSection).not.toHaveBeenCalled();
      done();
    });
  });

  it("dialog resolves 'save': calls saveSection(); resolves true on success", done => {
    component.hasUnsavedChanges.mockReturnValue(true);
    intentSE.consumeSilent.mockReturnValue(false);
    dialogSE.openSaveDiscard.mockReturnValue(of('save'));
    component.saveSection.mockReturnValue(of(true));

    const result = guard.canDeactivate(component);

    (result as ReturnType<typeof of<boolean>>).subscribe(value => {
      expect(value).toBe(true);
      expect(component.saveSection).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it("dialog resolves 'save': saveSection() fails, resolves false on failure", done => {
    component.hasUnsavedChanges.mockReturnValue(true);
    intentSE.consumeSilent.mockReturnValue(false);
    dialogSE.openSaveDiscard.mockReturnValue(of('save'));
    component.saveSection.mockReturnValue(of(false));

    const result = guard.canDeactivate(component);

    (result as ReturnType<typeof of<boolean>>).subscribe(value => {
      expect(value).toBe(false);
      done();
    });
  });
});
