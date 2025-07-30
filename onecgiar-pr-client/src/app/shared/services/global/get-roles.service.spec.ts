import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { GetRolesService } from './get-roles.service';
import { ApiService } from '../api/api.service';

// Mock para ApiService
const mockApiService = {
  resultsSE: {
    GET_roles: jest.fn().mockReturnValue(
      of({
        response: [
          { role_id: 1, role_description: 'Admin' },
          { role_id: 2, role_description: 'Guest' }
        ]
      })
    )
  }
};

describe('GetRolesService', () => {
  let service: GetRolesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: ApiService, useValue: mockApiService }]
    });
    service = TestBed.inject(GetRolesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with roles from API', () => {
    // El constructor ya llama a getRoles()
    expect(mockApiService.resultsSE.GET_roles).toHaveBeenCalled();
    expect(service.roles()).toEqual([
      { role_id: 1, role_description: 'Admin' },
      { role_id: 2, role_description: 'Guest' }
    ]);
  });

  it('should update roles when getRoles is called', () => {
    const newRoles = [{ role_id: 3, role_description: 'Viewer' }];

    mockApiService.resultsSE.GET_roles.mockReturnValue(of({ response: newRoles }));

    service.getRoles();

    expect(service.roles()).toEqual(newRoles);
  });
});
