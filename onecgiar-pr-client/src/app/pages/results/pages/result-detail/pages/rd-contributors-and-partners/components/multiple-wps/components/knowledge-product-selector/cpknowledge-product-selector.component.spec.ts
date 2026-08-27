import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';

import { CPKnowledgeProductSelectorComponent } from './knowledge-product-selector.component';
import { AlertStatusComponent } from '../../../../../../../../../../custom-fields/alert-status/alert-status.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

describe('CPKnowledgeProductSelectorComponent', () => {
  let component: CPKnowledgeProductSelectorComponent;
  let fixture: ComponentFixture<CPKnowledgeProductSelectorComponent>;
  let api: ApiService;

  /** Simulates `GET_resultById` resolving AFTER the component was created (P2-3301). */
  const loadCurrentResult = (result: any) => {
    api.dataControlSE.currentResult = result;
    api.dataControlSE.currentResultSignal.set(result);
  };

  /** href of the "Section 2, Theory of Change" link inside the first info note. */
  const tocLinkHref = (): string => {
    const alert: HTMLElement = fixture.nativeElement.querySelector('app-alert-status');
    return alert.querySelector('a.open_route')?.getAttribute('href') ?? '';
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CPKnowledgeProductSelectorComponent, AlertStatusComponent],
      imports: [HttpClientTestingModule, FormsModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    api = TestBed.inject(ApiService);

    // `result-detail.getData()` clears the result stores on entry and fills the route-derived code
    // and phase synchronously, long before `GET_resultById` resolves. That is the state this
    // component is constructed in.
    api.dataControlSE.currentResult = null;
    api.dataControlSE.currentResultSignal.set({});
    api.resultsSE.currentResultCode = '1234';
    api.resultsSE.currentResultPhase = '9';

    fixture = TestBed.createComponent(CPKnowledgeProductSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // P2-3301: `resultCode`, `versionId` and `alertStatusMessage` were class-field initializers, so they
  // were evaluated once at construction time — before `GET_resultById` filled `currentResult`. The
  // Theory of Change deep link froze as `/result/result-detail/undefined/theory-of-change?phase=undefined`,
  // which 404s and bounces the user home with a raw "Result not found" dialog.
  describe('Theory of Change deep link (P2-3301)', () => {
    it('should fall back to the route-derived code and phase while the result is still loading', () => {
      expect(component.resultCode).toBe('1234');
      expect(component.versionId).toBe('9');
      expect(tocLinkHref()).toBe('/result/result-detail/1234/theory-of-change?phase=9');
      expect(tocLinkHref()).not.toContain('undefined');
    });

    it('should use the loaded result when it arrives AFTER the component was constructed', () => {
      loadCurrentResult({ result_code: 5678, version_id: 12 });
      fixture.detectChanges();

      expect(component.resultCode).toBe(5678);
      expect(component.versionId).toBe(12);
      expect(tocLinkHref()).toBe('/result/result-detail/5678/theory-of-change?phase=12');
    });

    it('should never render "undefined" in the link once the result loads after construction', () => {
      loadCurrentResult({ result_code: 5678, version_id: 12 });
      fixture.detectChanges();

      expect(tocLinkHref()).not.toContain('undefined');
      expect(component.alertStatusMessage).not.toContain('undefined');
    });
  });
});
