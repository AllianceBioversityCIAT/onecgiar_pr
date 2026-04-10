import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { KpContentComponent } from './kp-content.component';

describe('KpContentComponent', () => {
  let component: KpContentComponent;
  let fixture: ComponentFixture<KpContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpContentComponent, HttpClientTestingModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(KpContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getRegularKeywords', () => {
    it('should return empty array when resultDetail is null', () => {
      component.resultDetail = null as any;
      expect(component.getRegularKeywords()).toEqual([]);
    });

    it('should return empty array when resultTypeResponse is empty', () => {
      component.resultDetail = { resultTypeResponse: [] } as any;
      expect(component.getRegularKeywords()).toEqual([]);
    });

    it('should return empty array when keywords is undefined', () => {
      component.resultDetail = { resultTypeResponse: [{}] } as any;
      expect(component.getRegularKeywords()).toEqual([]);
    });

    it('should filter out agrovoc keywords and return only regular ones', () => {
      component.resultDetail = {
        resultTypeResponse: [{
          keywords: [
            { result_kp_keyword_id: '1', is_agrovoc: 0, keyword: 'regular1' },
            { result_kp_keyword_id: '2', is_agrovoc: 1, keyword: 'agrovoc1' },
            { result_kp_keyword_id: '3', is_agrovoc: 0, keyword: 'regular2' }
          ]
        }]
      } as any;

      const result = component.getRegularKeywords();
      expect(result.length).toBe(2);
      expect(result[0].keyword).toBe('regular1');
      expect(result[1].keyword).toBe('regular2');
    });

    it('should return empty array when all keywords are agrovoc', () => {
      component.resultDetail = {
        resultTypeResponse: [{
          keywords: [
            { result_kp_keyword_id: '1', is_agrovoc: 1, keyword: 'agrovoc1' }
          ]
        }]
      } as any;

      expect(component.getRegularKeywords()).toEqual([]);
    });
  });

  describe('getAgrovocKeywords', () => {
    it('should return empty array when resultDetail is null', () => {
      component.resultDetail = null as any;
      expect(component.getAgrovocKeywords()).toEqual([]);
    });

    it('should return empty array when resultTypeResponse is empty', () => {
      component.resultDetail = { resultTypeResponse: [] } as any;
      expect(component.getAgrovocKeywords()).toEqual([]);
    });

    it('should return empty array when keywords is undefined', () => {
      component.resultDetail = { resultTypeResponse: [{}] } as any;
      expect(component.getAgrovocKeywords()).toEqual([]);
    });

    it('should filter out regular keywords and return only agrovoc ones', () => {
      component.resultDetail = {
        resultTypeResponse: [{
          keywords: [
            { result_kp_keyword_id: '1', is_agrovoc: 0, keyword: 'regular1' },
            { result_kp_keyword_id: '2', is_agrovoc: 1, keyword: 'agrovoc1' },
            { result_kp_keyword_id: '3', is_agrovoc: 1, keyword: 'agrovoc2' }
          ]
        }]
      } as any;

      const result = component.getAgrovocKeywords();
      expect(result.length).toBe(2);
      expect(result[0].keyword).toBe('agrovoc1');
      expect(result[1].keyword).toBe('agrovoc2');
    });

    it('should return empty array when all keywords are regular', () => {
      component.resultDetail = {
        resultTypeResponse: [{
          keywords: [
            { result_kp_keyword_id: '1', is_agrovoc: 0, keyword: 'regular1' }
          ]
        }]
      } as any;

      expect(component.getAgrovocKeywords()).toEqual([]);
    });
  });
});
