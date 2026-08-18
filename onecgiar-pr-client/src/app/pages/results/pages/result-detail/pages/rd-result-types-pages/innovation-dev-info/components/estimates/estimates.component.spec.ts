import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstimatesComponent } from './estimates.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoDataTextComponent } from '../../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { TermPipe } from '../../../../../../../../../internationalization/term.pipe';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

describe('EstimatesComponent', () => {
  let component: EstimatesComponent;
  let fixture: ComponentFixture<EstimatesComponent>;
  let api: ApiService;

  /** Simulates GET_resultById resolving AFTER the component was created (P2-3276). */
  const loadCurrentResult = (result: any) => {
    api.dataControlSE.currentResult = result;
    api.dataControlSE.currentResultSignal.set(result);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimatesComponent, NoDataTextComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule, TermPipe]
    }).compileComponents();

    fixture = TestBed.createComponent(EstimatesComponent);
    component = fixture.componentInstance;
    api = TestBed.inject(ApiService);
    fixture.detectChanges();
  });

  describe('headerDescriptions()', () => {
    it('should have header descriptions defined', () => {
      const headerDescriptions = component.headerDescriptions();

      expect(headerDescriptions.n1).toBeDefined();
      expect(headerDescriptions.n2).toBeDefined();
      expect(headerDescriptions.n3).toBeDefined();
    });
  });

  describe('checkValueAlert', () => {
    it('should return true if item is determined', () => {
      const item = { is_determined: true, kind_cash: false };
      const result = component.checkValueAlert(item);
      expect(result).toBeTruthy();
    });

    it('should return true if item has kind_cash', () => {
      const item = { is_determined: false, kind_cash: true };
      const result = component.checkValueAlert(item);
      expect(result).toBeTruthy();
    });

    it('should return false if neither is_determined nor kind_cash is true', () => {
      const item = { is_determined: false, kind_cash: false };
      const result = component.checkValueAlert(item);
      expect(result).toBeFalsy();
    });
  });

  // P2-3276: the deep links to "Contributors & partners" used to be built from class fields read
  // at construction time, i.e. before the result was loaded, producing `/undefined/...?phase=undefined`.
  describe('deep-link params (P2-3276)', () => {
    it('should be undefined-free once the result loads after construction', () => {
      expect(component.resultCode).toBeFalsy();

      loadCurrentResult({ result_code: 5678, version_id: 12, portfolio: 'P25' });

      expect(component.resultCode).toBe(5678);
      expect(component.versionId).toBe(12);
    });

    it('should fall back to the route-derived code and phase while the result is still loading', () => {
      api.dataControlSE.currentResult = null;
      api.resultsSE.currentResultCode = 1234;
      api.resultsSE.currentResultPhase = 9;

      expect(component.resultCode).toBe(1234);
      expect(component.versionId).toBe(9);
    });

    it('should render the Contributors & partners links with the real result code and phase', () => {
      loadCurrentResult({ result_code: 5678, version_id: 12, portfolio: 'P25' });
      fixture.detectChanges();

      const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a.open_route'));

      expect(links.length).toBe(2);
      links.forEach(link => {
        expect(link.getAttribute('href')).toBe('/result/result-detail/5678/contributor-partners?phase=12');
        expect(link.textContent.trim()).toBe('"Contributors & partners"');
      });
    });
  });
});
