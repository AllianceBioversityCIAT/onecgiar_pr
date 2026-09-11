import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ComplementaryInnovationComponent } from './complementary-innovation.component';
import { DataControlService } from '../../../../../../../../../../shared/services/data-control.service';

/**
 * P2-3572 (epic P2-3243) — from the 2026 reporting phase Step 2 also lists Innovation Use (2),
 * Policy Change (1) and Capacity Sharing for Development (5) next to Innovation Development (7).
 * Knowledge Products (6) stay excluded, and packages on phases <= 2025 keep the table they have.
 *
 * The fixture deliberately mixes all five types in one payload: a revert to the old
 * `result_type_id === 7` filter fails the 2026 case, and a filter that simply stopped filtering
 * fails the Knowledge Product and the 2025 cases.
 */
describe('ComplementaryInnovationComponent — P2-3572 enabler types', () => {
  let component: ComplementaryInnovationComponent;
  let dataControlSE: DataControlService;

  const MIXED_PAYLOAD = [
    { result_id: '1', result_code: 'PC-1', title: 'Policy change', result_type_id: 1 },
    { result_id: '2', result_code: 'IU-1', title: 'Innovation use', result_type_id: 2 },
    { result_id: '3', result_code: 'CS-1', title: 'Capacity sharing for development', result_type_id: 5 },
    { result_id: '4', result_code: 'KP-1', title: 'Knowledge product', result_type_id: 6 },
    { result_id: '5', result_code: 'ID-1', title: 'Innovation development', result_type_id: 7 },
    { result_id: '6', result_code: 'CI-1', title: 'Complementary innovation', result_type_id: 11 }
  ];

  const loadWithPhaseYear = (phase_year: number | null) => {
    dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year } as any);
    jest.spyOn(component.api.resultsSE, 'GETinnovationpathwayStepTwo').mockReturnValue(of({ response: JSON.parse(JSON.stringify(MIXED_PAYLOAD)) }) as any);
    component.loadInformationComplementaryInnovations();
    return component.informationInnovationDevelopments.map(item => item.result_type_id);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ComplementaryInnovationComponent],
      imports: [RouterTestingModule, HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    component = TestBed.createComponent(ComplementaryInnovationComponent).componentInstance;
    dataControlSE = TestBed.inject(DataControlService);
  });

  it('lists Innovation Development only for a 2025 package', () => {
    expect(loadWithPhaseYear(2025)).toEqual([7]);
  });

  it('adds Policy Change, Innovation Use and Capacity Sharing from the 2026 phase on', () => {
    expect(loadWithPhaseYear(2026).sort()).toEqual([1, 2, 5, 7]);
  });

  it('never lists Knowledge Products, on either phase', () => {
    expect(loadWithPhaseYear(2025)).not.toContain(6);
    expect(loadWithPhaseYear(2026)).not.toContain(6);
  });

  it('never lists Complementary innovation rows — those come from the modal, not this table', () => {
    expect(loadWithPhaseYear(2026)).not.toContain(11);
  });

  it('falls back to the 2025 table when the phase year is not known', () => {
    expect(loadWithPhaseYear(null)).toEqual([7]);
  });

  it('still marks an already-bundled result as selected across the widened types', () => {
    dataControlSE.currentResultSignal.set({ portfolio: 'P25', phase_year: 2026 } as any);
    jest.spyOn(component.api.resultsSE, 'GETinnovationpathwayStepTwo').mockReturnValue(of({ response: JSON.parse(JSON.stringify(MIXED_PAYLOAD)) }) as any);
    component.innovationPackageCreatorBody = [{ result_id: '2' }] as any;

    component.loadInformationComplementaryInnovations();

    const innovationUseRow = component.informationInnovationDevelopments.find(item => item.result_id === '2');
    expect(innovationUseRow.selected).toBe(true);
  });
});
