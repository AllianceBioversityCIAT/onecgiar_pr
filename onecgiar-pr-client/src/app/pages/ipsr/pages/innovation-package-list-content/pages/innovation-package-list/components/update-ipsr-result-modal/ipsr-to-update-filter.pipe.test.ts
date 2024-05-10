import { TestBed } from '@angular/core/testing';
import { IpsrToUpdateFilterPipe } from './ipsr-to-update-filter.pipe';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

describe('IpsrToUpdateFilterPipe', () => {
  let pipe: IpsrToUpdateFilterPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ApiService,
          useValue: {
            dataControlSE: {
              IPSRCurrentPhase: {
                phaseYear: 2021
              }
            },
            rolesSE: {
              isAdmin: false
            }
          }
        },
        IpsrToUpdateFilterPipe
      ]
    });
    pipe = TestBed.inject(IpsrToUpdateFilterPipe);
  });

  it('should return empty array if list is empty', () => {
    expect(pipe.transform([], 'test')).toEqual([]);
  });

  it('should filter out items based on conditions', () => {
    const list = [
      { result_type_id: 6, phase_year: 2022, phase_status: true, role_id: null, joinAll: 'test' },
      { result_type_id: 5, phase_year: 2020, phase_status: false, role_id: 1, joinAll: 'test' }
    ];
    const result = pipe.transform(list, '');
    expect(result).toEqual([list[1]]);
  });

  it('should filter out items based on search word', () => {
    const list = [
      { result_type_id: 5, phase_year: 2020, phase_status: false, role_id: 1, joinAll: 'test' },
      { result_type_id: 5, phase_year: 2020, phase_status: false, role_id: 1, joinAll: 'other' }
    ];
    const result = pipe.transform(list, 'test');
    expect(result).toEqual([list[0]]);
  });
});
