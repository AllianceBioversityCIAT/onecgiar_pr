import { ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KpContentComponent } from './kp-content.component';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('KpContentComponent', () => {
  let component: KpContentComponent;
  let fixture: ComponentFixture<KpContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [KpContentComponent] })
      .overrideComponent(KpContentComponent, {
        set: { template: '', imports: [], styles: [], changeDetection: ChangeDetectionStrategy.Default }
      })
      .compileComponents();

    fixture = TestBed.createComponent(KpContentComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('returns empty keyword lists without a result detail', () => {
    expect(component.getRegularKeywords()).toEqual([]);
    expect(component.getAgrovocKeywords()).toEqual([]);
  });

  it('returns empty keyword lists when the result type response has no keywords', () => {
    component.resultDetail = { resultTypeResponse: [{}] } as any;
    expect(component.getRegularKeywords()).toEqual([]);
    expect(component.getAgrovocKeywords()).toEqual([]);
  });

  it('returns empty keyword lists when the result type response is empty', () => {
    component.resultDetail = { resultTypeResponse: [] } as any;
    expect(component.getRegularKeywords()).toEqual([]);
  });

  it('splits regular and agrovoc keywords', () => {
    component.resultDetail = {
      resultTypeResponse: [{ keywords: [{ keyword: 'a', is_agrovoc: 0 }, { keyword: 'b', is_agrovoc: 1 }] }]
    } as any;
    expect(component.getRegularKeywords()).toEqual([{ keyword: 'a', is_agrovoc: 0 }]);
    expect(component.getAgrovocKeywords()).toEqual([{ keyword: 'b', is_agrovoc: 1 }]);
  });
});
