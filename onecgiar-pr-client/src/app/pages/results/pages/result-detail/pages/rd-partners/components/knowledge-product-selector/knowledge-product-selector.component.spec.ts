import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { KnowledgeProductSelectorComponent } from './knowledge-product-selector.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AlertStatusComponent } from '../../../../../../../../custom-fields/alert-status/alert-status.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';

describe('KnowledgeProductSelectorComponent', () => {
  let component: KnowledgeProductSelectorComponent;
  let fixture: ComponentFixture<KnowledgeProductSelectorComponent>;
  let mockApiService: any
  let mockInstitutionsService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        currentResult: {
          result_code: 123,
          version_id: 456
        },
        currentResultSignal: () => ({ result_code: 123, version_id: 456 })
      },
      // A Proxy, not a plain object: this mock is shared (via ApiService DI override) with every REAL
      // singleton service that sits behind this component (RdPartnersService -> CentersService,
      // InstitutionsService, ...), each of which calls its own `resultsSE.GET_*` methods. A plain
      // object without those methods turns their existing `resultsSE?.GET_x()` optional-chaining
      // no-op into a hard "is not a function" throw. Anything not explicitly stubbed below returns a
      // no-op observable instead.
      resultsSE: new Proxy(
        {
          currentResultCode: 999,
          currentResultPhase: 888,
          GET_resultknowledgeProducts: () => of({ response: {} })
        },
        { get: (target: any, prop: string) => (prop in target ? target[prop] : () => of({ response: {} })) }
      ),
      rolesSE: {
        readOnly: false
      }
    }
    mockInstitutionsService = {
      institutionsList: [
        {
          institutions_id: 5,
          institutions_type_name: 'Type 1'
        }
      ]
    }

    await TestBed.configureTestingModule({
      declarations: [
        KnowledgeProductSelectorComponent,
        AlertStatusComponent
      ],
      imports: [
        HttpClientTestingModule,
      ],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: InstitutionsService,
          useValue: mockInstitutionsService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeProductSelectorComponent);
    component = fixture.componentInstance;
  });

  // P2-3301: `resultCode` and `versionId` used to be class-field initializers, evaluated ONCE while the
  // component was under construction — before `currentResult` was populated. The Theory of Change deep
  // link froze as `/result/result-detail/undefined/theory-of-change?phase=undefined`, which 404s and
  // bounces the user home. They are getters now, re-evaluated on every change detection.
  describe('Theory of Change deep link (P2-3301)', () => {
    const tocLinkHref = (): string => {
      const alert: HTMLElement = fixture.nativeElement.querySelector('app-alert-status');
      return alert?.querySelector('a.open_route')?.getAttribute('href') ?? '';
    };

    it('should build the link from the currently loaded result, with no "undefined" segment', () => {
      fixture.detectChanges();

      expect(component.resultCode).toBe(123);
      expect(component.versionId).toBe(456);
      expect(tocLinkHref()).toBe('/result/result-detail/123/theory-of-change?phase=456');
      expect(tocLinkHref()).not.toContain('undefined');
    });

    it('should fall back to the route-derived code and phase while the result is still loading', () => {
      mockApiService.dataControlSE.currentResult = null;
      mockApiService.dataControlSE.currentResultSignal = () => ({});

      fixture.detectChanges();

      expect(tocLinkHref()).toBe('/result/result-detail/999/theory-of-change?phase=888');
      expect(tocLinkHref()).not.toContain('undefined');
    });

    // Reads the getters directly, bypassing the DOM: the regression this guards against is the
    // frozen-at-construction VALUE (a field initializer captures whatever `currentResult` held while
    // the component was being built and never re-reads it), not template re-rendering timing. A plain
    // field initializer here would keep returning the construction-time value (`undefined`, since
    // `currentResult` is null at this point) even after `currentResult` is populated below.
    it('should use the loaded result when it arrives AFTER the component was constructed', () => {
      mockApiService.dataControlSE.currentResult = null;
      mockApiService.dataControlSE.currentResultSignal = () => ({});
      fixture.detectChanges();

      mockApiService.dataControlSE.currentResult = { result_code: 5678, version_id: 12 };
      mockApiService.dataControlSE.currentResultSignal = () => ({ result_code: 5678, version_id: 12 });

      expect(component.resultCode).toBe(5678);
      expect(component.versionId).toBe(12);
      expect(component.alertStatusMessage).toContain('/result/result-detail/5678/theory-of-change?phase=12');
      expect(component.alertStatusMessage).not.toContain('undefined');
    });
  });

  describe('institutions_institutions_type_name()', () => {
    it('should set institutions_type_name in institutions_institutions_type_name method', () => {
      const partner = {
        institutions_id: 5,
        obj_institutions: {
          obj_institution_type_code: {
            name: ''
          }
        }
      };

      component.institutions_institutions_type_name(partner);

      expect(partner.obj_institutions.obj_institution_type_code.name).toEqual('Type 1');
    });
  });

  describe('generateDescription()', () => {
    it('should return predicted message with confidence when is_predicted=true', () => {
      const partner: any = {
        is_predicted: true,
        result_kp_mqap_institution_object: { confidant: 87 }
      };
      const msg = component.generateDescription(partner);
      expect(msg).toContain('predicted match');
      expect(msg).toContain('87%');
    });

    it("should return 'not found' message when is_predicted=false", () => {
      const partner: any = {
        is_predicted: false,
        result_kp_mqap_institution_object: { confidant: 42 }
      };
      const msg = component.generateDescription(partner);
      expect(msg).toContain("We couldn't find a matching partner");
      expect(msg).toContain('alert-event');
    });
  });
});
