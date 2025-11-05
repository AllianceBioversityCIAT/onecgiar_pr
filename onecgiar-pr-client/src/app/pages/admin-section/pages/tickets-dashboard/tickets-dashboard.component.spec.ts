import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TicketsDashboardComponent } from './tickets-dashboard.component';
import { GlobalLinksService } from '../../../../shared/services/variables/global-links.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ChangeDetectorRef, ElementRef } from '@angular/core';
import { LoggerService } from '../../../../shared/services/logger.service';

describe('TicketsDashboardComponent', () => {
  let component: TicketsDashboardComponent;
  let fixture: ComponentFixture<TicketsDashboardComponent>;
  let mockGlobalLinksService: any;
  let mockDomSanitizer: any;
  let mockChangeDetectorRef: any;
  let mockLoggerService: any;

  beforeEach(async () => {
    mockGlobalLinksService = {
      links: {
        url_prms_tickets_dashboards: 'http://example.com/dashboard'
      }
    };

    mockDomSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn().mockReturnValue('sanitized-url')
    };

    mockChangeDetectorRef = {
      detectChanges: jest.fn()
    };

    mockLoggerService = {
      error: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TicketsDashboardComponent],
      providers: [
        { provide: GlobalLinksService, useValue: mockGlobalLinksService },
        { provide: DomSanitizer, useValue: mockDomSanitizer },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
        { provide: LoggerService, useValue: mockLoggerService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TicketsDashboardComponent);
    component = fixture.componentInstance;

    // Prevent actual detectChanges calls during initialization
    jest.spyOn(component.cdr, 'detectChanges').mockImplementation(() => {});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with null ticketsDashboardUrl', () => {
    expect(component.ticketsDashboardUrl).toBeNull();
  });

  describe('ngOnInit', () => {
    it('should call sanitizeUrl and setAdaptiveHeight on initialization', () => {
      const sanitizeUrlSpy = jest.spyOn(component, 'sanitizeUrl');
      const setAdaptiveHeightSpy = jest.spyOn(component, 'setAdaptiveHeight');

      component.ngOnInit();

      expect(sanitizeUrlSpy).toHaveBeenCalled();
      expect(setAdaptiveHeightSpy).toHaveBeenCalled();
    });
  });

  describe('ngAfterViewInit', () => {
    it('should add window event listeners for message and resize', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      component.ngAfterViewInit();

      expect(addEventListenerSpy).toHaveBeenCalledWith('message', component.handleFrameMessage);
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should set onload handler when iframeElement exists', fakeAsync(() => {
      const mockNativeElement = {
        onload: null
      };
      component.iframeElement = {
        nativeElement: mockNativeElement
      } as ElementRef;

      const setAdaptiveHeightSpy = jest.spyOn(component, 'setAdaptiveHeight');
      const tryAdjustIframeHeightSpy = jest.spyOn(component, 'tryAdjustIframeHeight');

      component.ngAfterViewInit();

      // Trigger the onload handler
      mockNativeElement.onload();
      tick(800);

      expect(setAdaptiveHeightSpy).toHaveBeenCalled();
      expect(tryAdjustIframeHeightSpy).toHaveBeenCalled();
    }));

    it('should not set onload handler when iframeElement is null', () => {
      component.iframeElement = null;

      expect(() => component.ngAfterViewInit()).not.toThrow();
    });

    it('should not set onload handler when iframeElement.nativeElement is null', () => {
      component.iframeElement = { nativeElement: null } as ElementRef;

      expect(() => component.ngAfterViewInit()).not.toThrow();
    });
  });

  describe('ngOnDestroy', () => {
    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      component.ngAfterViewInit();
      component.ngOnDestroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('message', component.handleFrameMessage);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should not throw error if resizeListener is not set', () => {
      component['resizeListener'] = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('handleFrameMessage', () => {
    it('should update iframeHeight when receiving resize message', () => {
      const event = {
        data: {
          type: 'resize',
          height: 1500
        }
      };

      component.handleFrameMessage(event);

      expect(component.iframeHeight).toBe('1500px');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });

    it('should not update iframeHeight when event.data is null', () => {
      const event = { data: null };
      const initialHeight = component.iframeHeight;

      component.handleFrameMessage(event);

      expect(component.iframeHeight).toBe(initialHeight);
    });

    it('should not update iframeHeight when type is not resize', () => {
      const event = {
        data: {
          type: 'other',
          height: 1500
        }
      };
      const initialHeight = component.iframeHeight;

      component.handleFrameMessage(event);

      expect(component.iframeHeight).toBe(initialHeight);
    });

    it('should not update iframeHeight when height is missing', () => {
      const event = {
        data: {
          type: 'resize'
        }
      };
      const initialHeight = component.iframeHeight;

      component.handleFrameMessage(event);

      expect(component.iframeHeight).toBe(initialHeight);
    });
  });

  describe('setAdaptiveHeight', () => {
    it('should set height for mobile viewport (width < 768)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });

      component.setAdaptiveHeight();

      expect(component.iframeHeight).toBe('1600px');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });

    it('should set height for medium viewport (768 <= width < 1700)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true });

      component.setAdaptiveHeight();

      // Note: Using toContain due to floating point precision issues (768 * 2.4 = 1843.1999999999998)
      expect(component.iframeHeight).toContain('1843');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });

    it('should set height for large viewport (width >= 1700)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true, configurable: true });

      component.setAdaptiveHeight();

      expect(component.iframeHeight).toBe('2200px');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });

    it('should handle edge case of exactly 768px width', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, writable: true, configurable: true });

      component.setAdaptiveHeight();

      expect(component.iframeHeight).toBe('1440px');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });

    it('should handle edge case of exactly 1700px width', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1700, writable: true, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, writable: true, configurable: true });

      component.setAdaptiveHeight();

      expect(component.iframeHeight).toBe('2200px');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });
  });

  describe('sanitizeUrl', () => {
    it('should set ticketsDashboardUrl when url_prms_tickets_dashboards exists', () => {
      component.sanitizeUrl();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('http://example.com/dashboard');
      expect(component.ticketsDashboardUrl).toBe('sanitized-url');
    });

    it('should not set ticketsDashboardUrl when url_prms_tickets_dashboards is null', () => {
      mockGlobalLinksService.links.url_prms_tickets_dashboards = null;
      component.sanitizeUrl();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
    });

    it('should not set ticketsDashboardUrl when globalLinksSE is null', () => {
      component.globalLinksSE = null;
      component.sanitizeUrl();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
    });

    it('should not set ticketsDashboardUrl when links is null', () => {
      mockGlobalLinksService.links = null;
      component.sanitizeUrl();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
    });
  });

  describe('tryAdjustIframeHeight', () => {
    it('should call adjustIframeHeight successfully', () => {
      const adjustIframeHeightSpy = jest.spyOn(component, 'adjustIframeHeight').mockImplementation(() => {});

      component.tryAdjustIframeHeight();

      expect(adjustIframeHeightSpy).toHaveBeenCalled();
      expect(mockLoggerService.error).not.toHaveBeenCalled();
    });

    it('should catch and log error when adjustIframeHeight throws', () => {
      const error = new Error('Iframe adjustment failed');
      jest.spyOn(component, 'adjustIframeHeight').mockImplementation(() => {
        throw error;
      });

      component.tryAdjustIframeHeight();

      expect(mockLoggerService.error).toHaveBeenCalledWith('Error ajustando altura del iframe', error);
    });
  });

  describe('adjustIframeHeight', () => {
    it('should adjust iframe height when content is accessible and height > 300', () => {
      const mockContentDocument = {
        documentElement: {
          scrollHeight: 1500
        },
        body: {
          scrollHeight: 1400
        }
      };

      const mockIframe = {
        contentWindow: {
          document: mockContentDocument
        }
      };

      component.iframeElement = {
        nativeElement: mockIframe
      } as any;

      component.adjustIframeHeight();

      expect(component.iframeHeight).toBe('1500px');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });

    it('should use body scrollHeight when documentElement scrollHeight is null', () => {
      const mockContentDocument = {
        documentElement: {
          scrollHeight: null
        },
        body: {
          scrollHeight: 1200
        }
      };

      const mockIframe = {
        contentWindow: {
          document: mockContentDocument
        }
      };

      component.iframeElement = {
        nativeElement: mockIframe
      } as any;

      component.adjustIframeHeight();

      expect(component.iframeHeight).toBe('1200px');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });

    it('should not adjust height when height is less than or equal to 300', () => {
      const mockContentDocument = {
        documentElement: {
          scrollHeight: 250
        },
        body: {
          scrollHeight: 250
        }
      };

      const mockIframe = {
        contentWindow: {
          document: mockContentDocument
        }
      };

      component.iframeElement = {
        nativeElement: mockIframe
      } as any;

      const initialHeight = component.iframeHeight;
      component.adjustIframeHeight();

      expect(component.iframeHeight).toBe(initialHeight);
      expect(component.cdr.detectChanges).not.toHaveBeenCalled();
    });

    it('should use contentDocument.parentWindow when contentWindow is null', () => {
      const mockContentDocument = {
        documentElement: {
          scrollHeight: 1500
        },
        body: {
          scrollHeight: 1400
        }
      };

      const mockIframe = {
        contentWindow: null,
        contentDocument: {
          parentWindow: {
            document: mockContentDocument
          }
        }
      };

      component.iframeElement = {
        nativeElement: mockIframe
      } as any;

      component.adjustIframeHeight();

      expect(component.iframeHeight).toBe('1500px');
      expect(component.cdr.detectChanges).toHaveBeenCalled();
    });

    it('should log error when accessing iframe content fails', () => {
      const error = new Error('Cross-origin error');
      const mockIframe = {
        get contentWindow() {
          throw error;
        }
      };

      component.iframeElement = {
        nativeElement: mockIframe
      } as any;

      component.adjustIframeHeight();

      expect(mockLoggerService.error).toHaveBeenCalledWith('Error accediendo al contenido del iframe', error);
    });

    it('should not adjust height when document.body is null', () => {
      const mockContentDocument = {
        body: null
      };

      const mockIframe = {
        contentWindow: {
          document: mockContentDocument
        }
      };

      component.iframeElement = {
        nativeElement: mockIframe
      } as any;

      const initialHeight = component.iframeHeight;
      component.adjustIframeHeight();

      expect(component.iframeHeight).toBe(initialHeight);
    });
  });
});
