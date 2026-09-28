import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { BULK_UPLOADER_ACCESS_COPY } from '../../../../internationalization/bilateral-header-info.copy';
import { BulkUploaderAccessDialogComponent } from './bulk-uploader-access-dialog.component';

describe('BulkUploaderAccessDialogComponent', () => {
  let fixture: ComponentFixture<BulkUploaderAccessDialogComponent>;
  let closeSpy: jest.Mock;
  let openSpy: jest.SpyInstance;

  beforeEach(async () => {
    closeSpy = jest.fn();

    await TestBed.configureTestingModule({
      imports: [BulkUploaderAccessDialogComponent],
      providers: [{ provide: BrnDialogRef, useValue: { close: closeSpy } }]
    }).compileComponents();

    fixture = TestBed.createComponent(BulkUploaderAccessDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => openSpy?.mockRestore());

  function buttons(): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
  }

  function continueButton(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="bulk-uploader-access-continue"]') as HTMLButtonElement;
  }

  it('renders the warning, the contact line and exactly two actions', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain(BULK_UPLOADER_ACCESS_COPY.title);
    expect(text).toContain(BULK_UPLOADER_ACCESS_COPY.body);
    expect(text).toContain(BULK_UPLOADER_ACCESS_COPY.contact);
    expect(buttons().map(b => b.textContent?.trim())).toEqual([
      BULK_UPLOADER_ACCESS_COPY.cancelLabel,
      BULK_UPLOADER_ACCESS_COPY.continueLabel
    ]);
  });

  it('moves focus to Continue Anyway on init', () => {
    expect(document.activeElement).toBe(continueButton());
  });

  it('opens the tab inside the Continue click, severs its opener, and closes with the handle', () => {
    const tab = { opener: {} as unknown };
    openSpy = jest.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);

    continueButton().click();

    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    expect(tab.opener).toBeNull();
    expect(closeSpy).toHaveBeenCalledWith({ tab });
  });

  it('closes with a null tab when the popup is blocked', () => {
    openSpy = jest.spyOn(window, 'open').mockReturnValue(null);

    continueButton().click();

    expect(closeSpy).toHaveBeenCalledWith({ tab: null });
  });

  it('opens no tab and closes with undefined on Cancel', () => {
    openSpy = jest.spyOn(window, 'open');

    buttons()[0].click();

    expect(openSpy).not.toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalledWith(undefined);
  });
});
