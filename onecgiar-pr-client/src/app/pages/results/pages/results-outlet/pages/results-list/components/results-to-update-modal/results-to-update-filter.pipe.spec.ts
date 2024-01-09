import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';
import { TestBed } from '@angular/core/testing';

describe('ResultsToUpdateFilterPipe', () => {
  let pipe: ResultsToUpdateFilterPipe;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      rolesSE: { isAdmin: true }
    };

    TestBed.configureTestingModule({
      declarations: [ResultsToUpdateFilterPipe],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        ResultsToUpdateFilterPipe
      ],
    });

    pipe = TestBed.inject(ResultsToUpdateFilterPipe);
  });

  it('should return the filtered list when the search word is not provided', () => {
    const inputList = [
      { result_type_id: 1, phase_status: null, role_id: 2, joinAll: 'Result1' },
      { result_type_id: 6, phase_status: 'Completed', role_id: 3, joinAll: 'Result2' },
    ];

    const filteredList = pipe.transform(inputList, '');

    expect(filteredList).toEqual([inputList[0]]);
  });

  it('should filter results based on the search word', () => {
    mockApiService.rolesSE.isAdmin = false
    const inputList = [
      { result_type_id: 1, phase_status: null, role_id: 2, joinAll: 'Result1' },
      { result_type_id: 6, phase_status: 'Completed', role_id: 3, joinAll: 'Result2' },
      { result_type_id: 1, phase_status: 'In Progress', role_id: 1, joinAll: 'AnotherResult' },
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
      { result_type_id: 1, phase_status: 'In Progress', role_id: 1, joinAll: 'AnotherResult' },
    ];

    const filteredList = pipe.transform(inputList, 'Result');

    expect(filteredList).toEqual([]);
  });
});
