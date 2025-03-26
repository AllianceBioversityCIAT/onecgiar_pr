import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketsDashboardComponent } from './tickets-dashboard.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { GlobalLinksService } from '../../../../shared/services/variables/global-links.service';

describe('TicketsDashboardComponent', () => {
  let component: TicketsDashboardComponent;
  let fixture: ComponentFixture<TicketsDashboardComponent>;
  let mockGlobalLinksService: any;
  let mockDomSanitizer: any;

  beforeEach(async () => {
    mockGlobalLinksService = {
      links: {
        url_t1r_bi_report: 'https://example.com/bi/dashboard'
      }
    };

    mockDomSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn().mockImplementation(url => url)
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, TicketsDashboardComponent],
      providers: [
        {
          provide: GlobalLinksService,
          useValue: mockGlobalLinksService
        },
        {
          provide: DomSanitizer,
          useValue: mockDomSanitizer
        }
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
      const spy = jest.spyOn(component, 'sanitizeUrl');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('sanitizeUrl', () => {
    it('should set ticketsDashboardUrl with sanitized URL', () => {
      component.sanitizeUrl();
      expect(component.ticketsDashboardUrl).toBeTruthy();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('https://example.com/bi/IBD-ticket-tracking');
      expect(component.ticketsDashboardUrl).toBe('https://example.com/bi/IBD-ticket-tracking');
    });

    it('should handle case when url_t1r_bi_report is undefined', () => {
      mockGlobalLinksService.links.url_t1r_bi_report = undefined;
      component.sanitizeUrl();
      expect(component.ticketsDashboardUrl).toBeFalsy();
      expect(mockDomSanitizer.bypassSecurityTrustResourceUrl).not.toHaveBeenCalled();
      expect(component.ticketsDashboardUrl).toBeFalsy();
    });
  });
});
