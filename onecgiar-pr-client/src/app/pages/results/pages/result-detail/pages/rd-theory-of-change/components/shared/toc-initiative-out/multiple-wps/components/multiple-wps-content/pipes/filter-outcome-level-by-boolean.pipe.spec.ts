import { TestBed } from '@angular/core/testing';
import { FilterOutcomeLevelByBooleanPipe } from './filter-outcome-level-by-boolean.pipe';
import { DataControlService } from '../../../../../../../../../../../../../shared/services/data-control.service';

describe('FilterOutcomeLevelByBooleanPipe', () => {
  let pipe: FilterOutcomeLevelByBooleanPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataControlService,
          useValue: {
            currentResult: {
              appliesforTOCMWfilter: true
            },
            rolesSE: {
              isAdmin: false
            }
          }
        },
        FilterOutcomeLevelByBooleanPipe
      ]
    });
    pipe = TestBed.inject(FilterOutcomeLevelByBooleanPipe);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty array if list is empty', () => {
    expect(pipe.transform([], true)).toEqual([]);
  });
});
