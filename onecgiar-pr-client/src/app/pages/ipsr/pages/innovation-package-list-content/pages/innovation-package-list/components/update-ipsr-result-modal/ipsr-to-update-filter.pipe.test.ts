// Unit tests using Jest
import { TestBed } from '@angular/core/testing';
import { IpsrToUpdateFilterPipe } from './ipsr-to-update-filter.pipe';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { DataControlService } from '../../../../../../../../shared/services/data-control.service';
import { of } from 'rxjs';

describe('IpsrToUpdateFilterPipe', () => {
  let pipe: IpsrToUpdateFilterPipe;
  let apiServiceMock: Partial<ApiService>;

  beforeEach(() => {
    apiServiceMock = {
      dataControlSE: {
        getCurrentIPSRPhase: jest.fn(() => of({})),
        IPSRCurrentPhase: { phaseName: 'IPSR 2023', phaseYear: 2023 },
        myInitiativesList: [{ id: 1 }, { id: 2 }]
      } as unknown as DataControlService,
      rolesSE: {
        isAdmin: false
      } as unknown as RolesService
    };

    TestBed.configureTestingModule({
      providers: [IpsrToUpdateFilterPipe, { provide: ApiService, useValue: apiServiceMock }]
    });

    pipe = TestBed.inject(IpsrToUpdateFilterPipe);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return an empty array if input list is empty', () => {
    expect(pipe.transform([], '')).toEqual([]);
  });

  it('should filter items based on phase year and phase status', () => {
    const mockList = [
      { phase_year: 2022, phase_status: false, initiative_id: 1, full_name: 'Test 1' },
      { phase_year: 2023, phase_status: false, initiative_id: 2, full_name: 'Test 2' },
      { phase_year: 2022, phase_status: true, initiative_id: 1, full_name: 'Test 3' }
    ];

    const result = pipe.transform(mockList, '');
    expect(result).toEqual([mockList[0]]);
  });

  it('should filter items based on initiative id when user is not admin', () => {
    const mockList = [
      { phase_year: 2022, phase_status: false, initiative_id: 1, full_name: 'Test 1' },
      { phase_year: 2022, phase_status: false, initiative_id: 3, full_name: 'Test 2' }
    ];

    const result = pipe.transform(mockList, '');
    expect(result).toEqual([mockList[0]]);
  });

  it('should not filter items based on initiative id when user is admin', () => {
    apiServiceMock.rolesSE.isAdmin = true;
    const mockList = [
      { phase_year: 2022, phase_status: false, initiative_id: 1, full_name: 'Test 1' },
      { phase_year: 2022, phase_status: false, initiative_id: 3, full_name: 'Test 2' }
    ];

    const result = pipe.transform(mockList, '');
    expect(result).toEqual(mockList);
  });

  it('should filter items based on search word', () => {
    const mockList = [
      { phase_year: 2022, phase_status: false, initiative_id: 1, full_name: 'Test One' },
      { phase_year: 2022, phase_status: false, initiative_id: 2, full_name: 'Test Two' }
    ];

    const result = pipe.transform(mockList, 'One');
    expect(result).toEqual([mockList[0]]);
  });
});
