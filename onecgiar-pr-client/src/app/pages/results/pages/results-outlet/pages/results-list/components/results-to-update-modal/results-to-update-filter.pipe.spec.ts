import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

describe('ResultsToUpdateFilterPipe', () => {
  let pipe: ResultsToUpdateFilterPipe;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      shouldShowUpdate: jest.fn().mockReturnValue(true),
      canUpdateBilateral: jest.fn().mockReturnValue(false),
      rolesSE: { isAdmin: true },
      dataControlSE: {
        getCurrentPhases: jest.fn(() => of({})), // Mock function
        reportingCurrentPhase: { phaseYear: 2024 } // Add mock data as needed
      }
    };

    TestBed.configureTestingModule({
      declarations: [ResultsToUpdateFilterPipe],
      providers: [{ provide: ApiService, useValue: mockApiService }, ResultsToUpdateFilterPipe]
    });

    pipe = TestBed.inject(ResultsToUpdateFilterPipe);
  });

  it('should return the filtered list when the search word is not provided', () => {
    const inputList = [
      { result_type_id: 1, phase_status: null, role_id: 2, joinAll: 'Result1', phase_year: 2021, initiative_entity_map: [{ entityId: 1 }] },
      { result_type_id: 6, phase_status: 'Completed', role_id: 3, joinAll: 'Result2', initiative_entity_map: [{ entityId: 1 }] }
    ];

    const filteredList = pipe.transform(inputList, 'R');

    expect(filteredList).toEqual([inputList[0]]);
  });

  it('should filter results based on the search word', () => {
    mockApiService.rolesSE.isAdmin = false;
    const inputList = [
      { result_type_id: 1, phase_status: null, role_id: 2, joinAll: 'Result1', phase_year: 2021, initiative_entity_map: [{ entityId: 1 }] },
      { result_type_id: 6, phase_status: 'Completed', role_id: 3, joinAll: 'Result2', phase_year: 2021, initiative_entity_map: [{ entityId: 1 }] },
      {
        result_type_id: 1,
        phase_status: 'In Progress',
        role_id: 1,
        joinAll: 'AnotherResult',
        phase_year: 2021,
        initiative_entity_map: [{ entityId: 1 }]
      }
    ];

    const filteredList = pipe.transform(inputList, 'Result');

    expect(filteredList).toEqual([inputList[0]]);
  });

  it('should handle an empty input list', () => {
    const inputList = [];

    const filteredList = pipe.transform(inputList, 'Result');

    expect(filteredList).toEqual([]);
  });

  it('should correctly filter items based on joinAll and search word', () => {
    const inputList = [
      { result_type_id: 1, phase_status: null, role_id: 2 },
      { result_type_id: 6, phase_status: 'Completed', role_id: 3, joinAll: 'Result2' },
      { result_type_id: 1, phase_status: 'In Progress', role_id: 1, joinAll: 'AnotherResult' }
    ];

    const filteredList = pipe.transform(inputList, 'Result');

    expect(filteredList).toEqual([]);
  });

  describe('W3/Bilateral rows (same rule as the row menu, P2-3229)', () => {
    const bilateral = { id: 8208, result_type_id: 1, phase_status: null, phase_year: 2021, source_name: 'W3/Bilaterals', submitter: 'SP10', joinAll: '8208' };

    it('hides a bilateral row when canUpdateBilateral says no, even if the user belongs to the program', () => {
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2026, portfolioAcronym: 'P25' };
      mockApiService.canUpdateBilateral.mockReturnValue(false);

      expect(pipe.transform([bilateral], '')).toEqual([]);
      expect(mockApiService.canUpdateBilateral).toHaveBeenCalledWith(bilateral, mockApiService.dataControlSE.reportingCurrentPhase);
      expect(mockApiService.shouldShowUpdate).not.toHaveBeenCalled();
    });

    it('shows a bilateral row when canUpdateBilateral allows it (lead centre + Approved)', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2026, portfolioAcronym: 'P25' };
      mockApiService.canUpdateBilateral.mockReturnValue(true);

      expect(pipe.transform([bilateral], '')).toEqual([bilateral]);
    });

    it('keeps the W1/W2 rule for AVISA (SGP-02) bilaterals', () => {
      mockApiService.dataControlSE.reportingCurrentPhase = { phaseYear: 2026, portfolioAcronym: 'P25' };
      const avisa = { ...bilateral, submitter: 'SGP-02' };

      expect(pipe.transform([avisa], '')).toEqual([avisa]);
      expect(mockApiService.canUpdateBilateral).not.toHaveBeenCalled();
      expect(mockApiService.shouldShowUpdate).toHaveBeenCalled();
    });
  });
});
