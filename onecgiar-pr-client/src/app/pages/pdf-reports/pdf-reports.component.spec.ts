import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfReportsComponent } from './pdf-reports.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../shared/services/api/auth.service';
import { DomSanitizer } from '@angular/platform-browser';
import { signal } from '@angular/core';

describe('PdfReportsComponent', () => {
  let component: PdfReportsComponent;
  let fixture: ComponentFixture<PdfReportsComponent>;
  let httpTestingController: HttpTestingController;
  let mockAuthService: any;

  beforeEach(async () => {
    mockAuthService = {
      inLogin: signal(false)
    };

    await TestBed.configureTestingModule({
      declarations: [PdfReportsComponent],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => 'some-id',
                params: { id: 'some-id' }
              },
              queryParamMap: {
                params: {}
              },
              _routerState: {
                url: '/result/123'
              }
            }
          }
        },
        {
          provide: AuthService,
          useValue: mockAuthService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PdfReportsComponent);
    component = fixture.componentInstance;
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should set inLogin to true and set body overflow to hidden', () => {
      const getPdfDataSpy = jest.spyOn(component, 'getPdfData').mockReturnValue(null);

      component.ngOnInit();

      expect(mockAuthService.inLogin()).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
      expect(getPdfDataSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should set inLogin to false and restore body overflow', () => {
      component.ngOnDestroy();

      expect(mockAuthService.inLogin()).toBe(false);
      expect(document.body.style.overflow).toBe('auto');
    });
  });

  describe('getPdfData', () => {
    it('should set error to warning and return early when no id param', () => {
      const route = TestBed.inject(ActivatedRoute);
      route.snapshot.paramMap.get = () => null;

      component.getPdfData();

      expect(component.error).toBe('warning');
      expect(component.iframeLoaded).toBeNull();
    });

    it('should set iframeLoaded to true and make HTTP request when id is present', () => {
      component.getPdfData();

      expect(component.iframeLoaded).toBe(true);

      const req = httpTestingController.expectOne(r => r.url.includes('api/platform-report/'));
      req.flush({ pdf: 'https://example.com/report.pdf' });

      expect(component.pdfUrl).toBeTruthy();
      expect(component.mobilePdfUrl).toBeTruthy();
      expect(component.iframeLoaded).toBe(false);
    });

    it('should set error to "error" when response is falsy', () => {
      component.getPdfData();

      const req = httpTestingController.expectOne(r => r.url.includes('api/platform-report/'));
      req.flush(null);

      expect(component.error).toBe('error');
    });

    it('should set error to "warning" when response has response.error', () => {
      component.getPdfData();

      const req = httpTestingController.expectOne(r => r.url.includes('api/platform-report/'));
      req.flush({ response: { error: 'Something went wrong' } });

      expect(component.error).toBe('warning');
    });

    it('should set error to "warning" and iframeLoaded to false on HTTP error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      component.getPdfData();

      const req = httpTestingController.expectOne(r => r.url.includes('api/platform-report/'));
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(component.error).toBe('warning');
      expect(component.iframeLoaded).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('Report class', () => {
    it('should construct iframeRoute with result module', () => {
      expect(component.report.iframeRoute).toContain('api/platform-report/result/');
    });

    it('should use ipsr module when URL contains ipsr', () => {
      const route = TestBed.inject(ActivatedRoute);
      route.snapshot._routerState = { url: '/ipsr/123' };
      // Re-create report to pick up changed route
      const sanitizer = TestBed.inject(DomSanitizer);
      const report = new (component.report.constructor as any)(route, sanitizer);
      expect(report.iframeRoute).toContain('api/platform-report/ipsr/');
    });

    it('should append query params when present', () => {
      const route = TestBed.inject(ActivatedRoute);
      route.snapshot.queryParamMap = {
        params: { phase: '2', token: 'abc' }
      } as any;
      const sanitizer = TestBed.inject(DomSanitizer);
      const report = new (component.report.constructor as any)(route, sanitizer);
      expect(report.iframeRoute).toContain('?phase=2&token=abc');
    });

    it('should return empty string for qParamsObjectToqueryParams when no params', () => {
      const result = component.report.qParamsObjectToqueryParams();
      expect(result).toBe('');
    });

    it('should handle params with falsy values', () => {
      const route = TestBed.inject(ActivatedRoute);
      route.snapshot.queryParamMap = {
        params: { phase: '', token: 'abc' }
      } as any;
      const sanitizer = TestBed.inject(DomSanitizer);
      const report = new (component.report.constructor as any)(route, sanitizer);
      const qParams = report.qParamsObjectToqueryParams();
      expect(qParams).toContain('token=abc');
    });
  });
});
