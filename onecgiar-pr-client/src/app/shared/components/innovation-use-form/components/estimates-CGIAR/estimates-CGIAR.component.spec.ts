import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { EstimatesCgiarComponent } from './estimates-cgiar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

// Minimal stubs for injected services via ApiService usage
class ApiServiceStub {
  dataControlSE = { currentResult: { result_code: '123', version_id: 1 } };
}

class TerminologyServiceStub {}

describe('EstimatesCgiarComponent', () => {
  let component: EstimatesCgiarComponent;
  let fixture: ComponentFixture<EstimatesCgiarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimatesCgiarComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: (await import('../../../../services/api/api.service')).ApiService, useClass: ApiServiceStub },
        { provide: (await import('../../../../../internationalization/terminology.service')).TerminologyService, useClass: TerminologyServiceStub }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EstimatesCgiarComponent);
    component = fixture.componentInstance;
    component.body = { investment_programs: [], investment_bilateral: [], investment_partners: [] };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('headerDescriptions should return three html strings', () => {
    const res = component.headerDescriptions();
    expect(res.n1).toContain('<ul>');
    expect(res.n2).toContain('<ul>');
    expect(res.n3).toContain('<ul>');
  });

  it('onRadioChange should clear kind_cash when is_determined is true', () => {
    const item: any = { is_determined: true, kind_cash: 100 };
    component.onRadioChange(item);
    expect(item.kind_cash).toBeNull();
  });

  it('onInputChange should clear is_determined when kind_cash has value', () => {
    const item: any = { is_determined: true, kind_cash: 250 };
    component.onInputChange(item);
    expect(item.is_determined).toBeNull();
  });

  describe('checkValueAlert', () => {
    it('returns true when is_determined is true', () => {
      expect(component.checkValueAlert({ is_determined: true, kind_cash: null })).toBe(true);
    });

    it('returns true when kind_cash has value', () => {
      expect(component.checkValueAlert({ is_determined: null, kind_cash: 100 })).toBe(true);
    });

    it('returns false when neither is_determined nor kind_cash are set', () => {
      expect(component.checkValueAlert({ is_determined: null, kind_cash: null })).toBe(false);
    });
  });
});


