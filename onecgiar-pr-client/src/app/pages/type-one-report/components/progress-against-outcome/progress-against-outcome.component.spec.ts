import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressAgainstOutcomeComponent } from './progress-against-outcome.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ProgressAgainstOutcomeComponent', () => {
  let component: ProgressAgainstOutcomeComponent;
  let fixture: ComponentFixture<ProgressAgainstOutcomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressAgainstOutcomeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('generatePDFLink', () => {
    it('should return IPSR details URL when is_ipsr is true', () => {
      const result = {
        is_ipsr: true,
        result_code: '123',
        version_id: '456'
      };

      const url = component.generatePDFLink(result);
      expect(url).toBe('reports/ipsr-details/123?phase=456');
    });

    it('should return result details URL when is_ipsr is false', () => {
      const result = {
        is_ipsr: false,
        result_code: '789',
        version_id: '012'
      };

      const url = component.generatePDFLink(result);
      expect(url).toBe('/reports/result-details/789?phase=012');
    });
  });
});
