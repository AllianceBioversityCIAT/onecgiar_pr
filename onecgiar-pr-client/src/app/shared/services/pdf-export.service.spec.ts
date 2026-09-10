import { TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { PdfExportService } from './pdf-export.service';
import { PrToastService } from 'src/app/shared/components/pr-toast';

describe('PdfExportService', () => {
  let service: PdfExportService;
  let mockClipboard: { copy: jest.Mock };
  let mockToast: { add: jest.Mock };

  beforeEach(() => {
    mockClipboard = { copy: jest.fn() };
    mockToast = { add: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Clipboard, useValue: mockClipboard },
        { provide: PrToastService, useValue: mockToast }
      ]
    });

    service = TestBed.inject(PdfExportService);
  });

  it('should start disabled with the menu closed and no link', () => {
    expect(service.enabled()).toBe(false);
    expect(service.menuOpen()).toBe(false);
    expect(service.link()).toBe('');
  });

  describe('toggle()', () => {
    it('should open the menu when closed and close it when open', () => {
      service.toggle();
      expect(service.menuOpen()).toBe(true);

      service.toggle();
      expect(service.menuOpen()).toBe(false);
    });
  });

  describe('close()', () => {
    it('should close the menu', () => {
      service.menuOpen.set(true);
      service.close();
      expect(service.menuOpen()).toBe(false);
    });
  });

  describe('view()', () => {
    it('should open the PDF link in a new tab and close the menu', () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
      service.link.set('https://test-link.com');
      service.menuOpen.set(true);

      service.view();

      expect(windowOpenSpy).toHaveBeenCalledWith('https://test-link.com', '_blank');
      expect(service.menuOpen()).toBe(false);
      windowOpenSpy.mockRestore();
    });

    it('should not open a window when there is no link', () => {
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
      service.link.set('');

      service.view();

      expect(windowOpenSpy).not.toHaveBeenCalled();
      windowOpenSpy.mockRestore();
    });
  });

  describe('copy()', () => {
    it('should copy the PDF link, show a success toast and close the menu', () => {
      service.link.set('https://test-link.com');
      service.menuOpen.set(true);

      service.copy();

      expect(mockClipboard.copy).toHaveBeenCalledWith('https://test-link.com');
      expect(mockToast.add).toHaveBeenCalledWith({
        key: 'copyResultLinkPdf',
        severity: 'success',
        summary: 'PDF link copied'
      });
      expect(service.menuOpen()).toBe(false);
    });
  });

  describe('disable()', () => {
    it('should reset enabled, menu and link', () => {
      service.enabled.set(true);
      service.menuOpen.set(true);
      service.link.set('https://test-link.com');

      service.disable();

      expect(service.enabled()).toBe(false);
      expect(service.menuOpen()).toBe(false);
      expect(service.link()).toBe('');
    });
  });
});
