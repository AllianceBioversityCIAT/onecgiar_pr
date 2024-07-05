import { TestBed } from '@angular/core/testing';
import { FilterOutcomeLevelByBooleanPipe } from './filter-outcome-level-by-boolean.pipe';
import { DataControlService } from '../../../../../../../../../../../../../shared/services/data-control.service';

describe('FilterOutcomeLevelByBooleanPipe', () => {
  let pipe: FilterOutcomeLevelByBooleanPipe;
  const list = [
    {
      toc_level_id: 1,
      name: 'Work package Output',
      description: ''
    },
    {
      toc_level_id: 2,
      name: 'Work package Outcome',
      description: ''
    },
    {
      toc_level_id: 3,
      name: 'End of Initiative Outcome',
      description: ''
    },
    {
      toc_level_id: 4,
      name: 'Action Area Outcome',
      description: ''
    }
  ];

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

  it('should return list with toc_level_id 3 if yes is true and appliesforTOCMWfilter is false', () => {
    expect(pipe.transform(list, false)).toEqual([
      {
        toc_level_id: 3,
        name: 'End of Initiative Outcome',
        description: ''
      },
      {
        toc_level_id: 4,
        name: 'Action Area Outcome',
        description: ''
      }
    ]);
  });
});
