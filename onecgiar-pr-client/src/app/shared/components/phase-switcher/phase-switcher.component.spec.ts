import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhaseSwitcherComponent } from './phase-switcher.component';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('PhaseSwitcherComponent', () => {
  let component: PhaseSwitcherComponent;
  let fixture: ComponentFixture<PhaseSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PhaseSwitcherComponent],
      imports: [HttpClientModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 'testId' })
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
});
