import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhaseSwitcherComponent } from './phase-switcher.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PhaseSwitcherComponent', () => {
  let component: PhaseSwitcherComponent;
  let fixture: ComponentFixture<PhaseSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PhaseSwitcherComponent],
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'testId' }),
            snapshot: { queryParams: {} }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhaseSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return ipsrPhaseList when inIpsr is true', () => {
    component.ipsrDataControlSE.inIpsr = true;
    component.ipsrDataControlSE.ipsrPhaseList = [{ id: 1, name: 'Phase 1' }];
    const result = component.getFilterPhases();
    expect(result).toEqual(component.ipsrDataControlSE.ipsrPhaseList);
  });

  it('should return resultPhaseList when inIpsr is false', () => {
    component.ipsrDataControlSE.inIpsr = false;
    component.api.dataControlSE.resultPhaseList = [{ id: 2, name: 'Phase 2' }];
    const result = component.getFilterPhases();
    expect(result).toEqual(component.api.dataControlSE.resultPhaseList);
  });

  it('should mark the phase matching the ?phase query param as selected, regardless of type', () => {
    component.activatedRoute.snapshot.queryParams = { phase: '5' };
    expect(component.isSelectedPhase({ id: 5, status: false })).toBe(true);
    expect(component.isSelectedPhase({ id: 6, status: true })).toBe(false);
  });

  it('should fall back to the open phase as selected when there is no ?phase query param', () => {
    component.activatedRoute.snapshot.queryParams = {};
    expect(component.isSelectedPhase({ id: 5, status: true })).toBe(true);
    expect(component.isSelectedPhase({ id: 6, status: false })).toBe(false);
  });
});
