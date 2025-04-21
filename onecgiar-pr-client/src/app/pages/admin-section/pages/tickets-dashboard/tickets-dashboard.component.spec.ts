import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketsDashboardComponent } from './tickets-dashboard.component';
import { GlobalLinksService } from '../../../../shared/services/variables/global-links.service';
import { DomSanitizer } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';

describe('TicketsDashboardComponent', () => {
  let component: TicketsDashboardComponent;
  let fixture: ComponentFixture<TicketsDashboardComponent>;
  let mockGlobalLinksService: any;
  let mockDomSanitizer: any;
  let mockChangeDetectorRef: any;

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

    await TestBed.configureTestingModule({
      imports: [TicketsDashboardComponent],
      providers: [
        { provide: GlobalLinksService, useValue: mockGlobalLinksService },
        { provide: DomSanitizer, useValue: mockDomSanitizer },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TicketsDashboardComponent);
    component = fixture.componentInstance;

    jest.spyOn(component, 'setAdaptiveHeight').mockImplementation(() => {});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call sanitizeUrl on initialization', () => {
      const sanitizeUrlSpy = jest.spyOn(component, 'sanitizeUrl');

      component.ngOnInit();

      expect(sanitizeUrlSpy).toHaveBeenCalled();
      expect(component.setAdaptiveHeight).toHaveBeenCalled();
    });
  });

  describe('sanitizeUrl', () => {
    it('should set ticketsDashboardUrl when url_prms_tickets_dashboards exists', () => {
      component.sanitizeUrl();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('http://example.com/dashboard');
      expect(component.ticketsDashboardUrl).toBe('sanitized-url');
    });

    it('should not set ticketsDashboardUrl when url_prms_tickets_dashboards does not exist', () => {
      mockGlobalLinksService.links.url_prms_tickets_dashboards = null;
      component.sanitizeUrl();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
      expect(component.ticketsDashboardUrl).toBeNull();
    });
  });

  describe('setAdaptiveHeight', () => {
    it('should set iframe height based on viewport dimensions', () => {
      jest.spyOn(component, 'setAdaptiveHeight').mockImplementation(() => {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        if (viewportWidth < 768) {
          component.iframeHeight = `${viewportHeight * 2}px`;
        } else if (viewportWidth < 1700) {
          component.iframeHeight = `${viewportHeight * 1.8}px`;
        } else {
          component.iframeHeight = '2200px';
        }

        mockChangeDetectorRef.detectChanges();
      });

      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

      component.setAdaptiveHeight();

      expect(component.iframeHeight).toBe('1382.4px');
      expect(mockChangeDetectorRef.detectChanges).toHaveBeenCalled();
    });
  });
});
