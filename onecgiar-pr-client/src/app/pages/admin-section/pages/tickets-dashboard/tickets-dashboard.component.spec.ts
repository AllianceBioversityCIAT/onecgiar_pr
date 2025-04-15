import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketsDashboardComponent } from './tickets-dashboard.component';
import { GlobalLinksService } from '../../../../shared/services/variables/global-links.service';
import { DomSanitizer } from '@angular/platform-browser';

describe('TicketsDashboardComponent', () => {
  let component: TicketsDashboardComponent;
  let fixture: ComponentFixture<TicketsDashboardComponent>;
  let mockGlobalLinksService: any;
  let mockDomSanitizer: any;

  beforeEach(async () => {
    mockGlobalLinksService = {
      links: {
        url_t1r_bi_report: 'http://example.com/report',
        url_prms_tickets_dashboards: 'http://example.com/dashboard'
      }
    };

    mockDomSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn().mockReturnValue('sanitized-url')
    };

    await TestBed.configureTestingModule({
      declarations: [],
      providers: [
        { provide: GlobalLinksService, useValue: mockGlobalLinksService },
        { provide: DomSanitizer, useValue: mockDomSanitizer }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TicketsDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call sanitizeUrl on initialization', () => {
      const sanitizeUrlSpy = jest.spyOn(component, 'sanitizeUrl');
      component.ngOnInit();
      expect(sanitizeUrlSpy).toHaveBeenCalled();
    });
  });

  describe('sanitizeUrl', () => {
    it('should set ticketsDashboardUrl when url_t1r_bi_report exists', () => {
      component.sanitizeUrl();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('http://example.com/dashboard');
      expect(component.ticketsDashboardUrl).toBe('sanitized-url');
    });

    it('should not set ticketsDashboardUrl when url_t1r_bi_report does not exist', () => {
      mockGlobalLinksService.links.url_t1r_bi_report = null;
      component.sanitizeUrl();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
      expect(component.ticketsDashboardUrl).toBeNull();
    });
  });
});
