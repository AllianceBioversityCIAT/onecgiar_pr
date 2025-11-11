import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { CookiesDialogComponent } from './cookies-dialog.component';
import { ClarityService } from '../../services/clarity.service';

describe('CookiesDialogComponent', () => {
  let component: CookiesDialogComponent;
  let fixture: ComponentFixture<CookiesDialogComponent>;
  let mockClarityService: jest.Mocked<ClarityService>;

  beforeEach(async () => {
    mockClarityService = {
      setCookieConsent: jest.fn()
    } as any;

    // Mock globalThis.clarity
    globalThis.clarity = jest.fn() as any;

    await TestBed.configureTestingModule({
      imports: [CookiesDialogComponent, HttpClientTestingModule, BrowserAnimationsModule],
      providers: [{ provide: ClarityService, useValue: mockClarityService }]
    }).compileComponents();

    fixture = TestBed.createComponent(CookiesDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should show dialog when no consent is saved', () => {
      localStorage.removeItem('cookieConsent');
      component.ngOnInit();
      expect(component.visible).toBe(true);
      expect(mockClarityService.setCookieConsent).toHaveBeenCalledWith(false);
    });

    it('should hide dialog and apply consent when accepted is saved', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      component.ngOnInit();
      expect(component.visible).toBe(false);
      expect(mockClarityService.setCookieConsent).toHaveBeenCalledWith(true);
    });

    it('should hide dialog and apply consent when rejected is saved', () => {
      localStorage.setItem('cookieConsent', 'rejected');
      component.ngOnInit();
      expect(component.visible).toBe(false);
      expect(mockClarityService.setCookieConsent).toHaveBeenCalledWith(false);
    });
  });

  describe('acceptAll', () => {
    it('should save accepted consent and hide dialog', () => {
      component.visible = true;
      component.acceptAll();
      expect(localStorage.getItem('cookieConsent')).toBe('accepted');
      expect(component.visible).toBe(false);
      expect(mockClarityService.setCookieConsent).toHaveBeenCalledWith(true);
    });

    it('should call clarity consent API', () => {
      component.acceptAll();
      expect(globalThis.clarity).toHaveBeenCalledWith('consentv2', {
        ad_Storage: 'granted',
        analytics_Storage: 'granted'
      });
    });
  });

  describe('rejectAll', () => {
    it('should save rejected consent and hide dialog', () => {
      component.visible = true;
      component.rejectAll();
      expect(localStorage.getItem('cookieConsent')).toBe('rejected');
      expect(component.visible).toBe(false);
      expect(mockClarityService.setCookieConsent).toHaveBeenCalledWith(false);
    });

    it('should call clarity consent API', () => {
      component.rejectAll();
      expect(globalThis.clarity).toHaveBeenCalledWith('consentv2', {
        ad_Storage: 'denied',
        analytics_Storage: 'denied'
      });
    });
  });

  describe('showDialog', () => {
    it('should set visible to true', () => {
      component.visible = false;
      component.showDialog();
      expect(component.visible).toBe(true);
    });
  });
});
