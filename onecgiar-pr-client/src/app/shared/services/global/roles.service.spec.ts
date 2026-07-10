import { TestBed } from '@angular/core/testing';
import { RolesService } from './roles.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from '../api/auth.service';
import { DataControlService } from '../data-control.service';
import { of, throwError } from 'rxjs';

describe('RolesService', () => {
  let service: RolesService;
  let mockAuthService: any;
  let mockDataControlService: any;

  beforeEach(() => {
    mockAuthService = {
      GET_allRolesByUser: jest.fn().mockReturnValue(of({ response: {} })),
      localStorageUser: null
    };

    mockDataControlService = {
      currentResult: null
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        RolesService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: DataControlService, useValue: mockDataControlService }
      ]
    });

    service = TestBed.inject(RolesService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(service.platformIsClosed).toBe(false);
    expect(service.readOnly).toBe(true);
    expect(service.currentInitiativeRole).toBeNull();
    expect(service.isAdmin).toBe(false);
    expect(service.firstValidationOfReadOnly).toBe(false);
    expect(service.access.canDdit).toBe(false);
  });

  it('should have predefined restrictions', () => {
    expect(service.restrictions).toHaveLength(3);
    expect(service.restrictions[0].id).toBe(1);
    expect(service.restrictions[1].id).toBe(2);
    expect(service.restrictions[2].id).toBe(3);
  });

  describe('fieldValidation', () => {
    it('should return true when currentInitiativeRole matches restriction roleIds', () => {
      service.currentInitiativeRole = 5;
      const result = service.fieldValidation(1);
      expect(result).toBe(true);
    });

    it('should return false when currentInitiativeRole does not match restriction roleIds', () => {
      service.currentInitiativeRole = 3;
      const result = service.fieldValidation(1);
      expect(result).toBe(false);
    });

    it('should validate restriction with id 2 correctly', () => {
      service.currentInitiativeRole = 6;
      const result = service.fieldValidation(2);
      expect(result).toBe(true);
    });

    it('should validate restriction with id 3 correctly', () => {
      service.currentInitiativeRole = 6;
      const result = service.fieldValidation(3);
      expect(result).toBe(true);
    });
  });

  describe('validateApplication', () => {
    it('should set readOnly to false, isAdmin to true and return isAdmin true when role_id is 1', () => {
      const application = { role_id: 1 };
      const result = service.validateApplication(application);

      expect(service.readOnly).toBe(false);
      expect(service.isAdmin).toBe(true);
      expect(result.isAdmin).toBe(true);
    });

    it('should set readOnly to true, isAdmin to false and return isAdmin false when role_id is not 1', () => {
      const application = { role_id: 2 };
      const result = service.validateApplication(application);

      expect(service.readOnly).toBe(true);
      expect(service.isAdmin).toBe(false);
      expect(result.isAdmin).toBe(false);
    });

    it('should handle null application', () => {
      const result = service.validateApplication(null);

      expect(service.readOnly).toBe(true);
      expect(service.isAdmin).toBe(false);
      expect(result.isAdmin).toBe(false);
    });

    it('should handle undefined application', () => {
      const result = service.validateApplication(undefined);

      expect(service.readOnly).toBe(true);
      expect(service.isAdmin).toBe(false);
      expect(result.isAdmin).toBe(false);
    });
  });

  describe('getIsAdminValue', () => {
    it('should set isAdmin to true when role_id is 1', () => {
      service.roles = { application: { role_id: 1 } };
      service.getIsAdminValue();

      expect(service.isAdmin).toBe(true);
    });

    it('should set isAdmin to false when role_id is not 1', () => {
      service.roles = { application: { role_id: 2 } };
      service.getIsAdminValue();

      expect(service.isAdmin).toBe(false);
    });

    it('should handle null roles', () => {
      service.roles = null;
      service.getIsAdminValue();

      expect(service.isAdmin).toBe(false);
    });

    it('should handle undefined application', () => {
      service.roles = { application: undefined };
      service.getIsAdminValue();

      expect(service.isAdmin).toBe(false);
    });
  });

  describe('updateRolesListFromLocalStorage', () => {
    it('should load roles from localStorage and set isAdmin', async () => {
      const mockRoles = { application: { role_id: 1 }, initiative: [] };
      localStorage.setItem('roles', JSON.stringify(mockRoles));

      await service.updateRolesListFromLocalStorage();

      expect(service.roles).toEqual(mockRoles);
      expect(service.isAdmin).toBe(true);
      expect(service.firstValidationOfReadOnly).toBe(true);
    });

    it('should not overwrite roles when localStorage is empty', async () => {
      localStorage.removeItem('roles');
      service.roles = { application: { role_id: 1 }, initiative: [] };

      await service.updateRolesListFromLocalStorage();

      expect(service.roles).toEqual({ application: { role_id: 1 }, initiative: [] });
    });

    it('should set firstValidationOfReadOnly even when localStorage is empty and user is not logged in', async () => {
      localStorage.removeItem('roles');
      mockAuthService.localStorageUser = null;
      service.firstValidationOfReadOnly = false;

      await service.validateReadOnly();

      expect(service.firstValidationOfReadOnly).toBe(true);
    });
  });

  describe('applyRolesResponse', () => {
    it('should persist roles, set isAdmin and canDdit for admin users', () => {
      const mockResponse = {
        application: { role_id: 1 },
        initiative: []
      };

      service.applyRolesResponse(mockResponse);

      expect(service.roles).toEqual(mockResponse);
      expect(service.isAdmin).toBe(true);
      expect(service.access.canDdit).toBe(true);
      expect(localStorage.getItem('roles')).toBe(JSON.stringify(mockResponse));
    });

    it('should ignore null response', () => {
      service.roles = { application: { role_id: 1 } };
      service.applyRolesResponse(null);
      expect(service.roles).toEqual({ application: { role_id: 1 } });
    });
  });

  describe('updateRolesList', () => {
    it('should fetch roles from API and save to localStorage', async () => {
      const mockResponse = {
        application: { role_id: 1 },
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };

      mockAuthService.GET_allRolesByUser.mockReturnValue(of({ response: mockResponse }));

      const result = await service.updateRolesList();

      expect(service.roles).toEqual(mockResponse);
      expect(service.isAdmin).toBe(true);
      expect(service.firstValidationOfReadOnly).toBe(true);
      expect(localStorage.getItem('roles')).toBe(JSON.stringify(mockResponse));
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('API Error');
      mockAuthService.GET_allRolesByUser.mockReturnValue(throwError(() => error));

      await expect(service.updateRolesList()).rejects.toThrow('API Error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('validateInitiative', () => {
    it('should return true when initiative is found', () => {
      service.roles = {
        initiative: [
          { initiative_id: 1, role_id: 5 },
          { initiative_id: 2, role_id: 6 }
        ]
      };

      const result = service.validateInitiative(1);

      expect(result).toBe(true);
    });

    it('should return false when initiative is not found', () => {
      service.roles = {
        initiative: [
          { initiative_id: 1, role_id: 5 },
          { initiative_id: 2, role_id: 6 }
        ]
      };

      const result = service.validateInitiative(3);

      expect(result).toBe(false);
    });

    it('should return false when roles is null', () => {
      service.roles = null;

      const result = service.validateInitiative(1);

      expect(result).toBe(false);
    });

    it('should return false when initiative array is undefined', () => {
      service.roles = { initiative: undefined };

      const result = service.validateInitiative(1);

      expect(result).toBe(false);
    });
  });

  describe('accessToIPSRSubmit', () => {
    it('should return true when initiative is found and role_id is not 6', () => {
      service.roles = {
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };
      mockDataControlService.currentResult = { status_id: 1 };

      const result = service.accessToIPSRSubmit(1);

      expect(result).toBe(true);
    });

    it('should return false when initiative role_id is 6', () => {
      service.roles = {
        initiative: [{ initiative_id: 1, role_id: 6 }]
      };
      mockDataControlService.currentResult = { status_id: 1 };

      const result = service.accessToIPSRSubmit(1);

      expect(result).toBe(false);
    });

    it('should return false when result status_id is 2', () => {
      service.roles = {
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };
      mockDataControlService.currentResult = { status_id: 2 };

      const result = service.accessToIPSRSubmit(1);

      expect(result).toBe(false);
    });

    it('should return false when initiative is not found', () => {
      service.roles = {
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };
      mockDataControlService.currentResult = { status_id: 1 };

      const result = service.accessToIPSRSubmit(2);

      expect(result).toBe(false);
    });

    it('should handle null roles', () => {
      service.roles = null;
      mockDataControlService.currentResult = { status_id: 1 };

      const result = service.accessToIPSRSubmit(1);

      expect(result).toBe(false);
    });
  });

  describe('validateReadOnly', () => {
    it('should return null and set readOnly to true when platformIsClosed is true', async () => {
      service.platformIsClosed = true;
      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockResolvedValue();
      jest.spyOn(service, 'updateRolesList').mockResolvedValue({} as any);

      const result = await service.validateReadOnly();

      expect(result).toBeNull();
      expect(service.readOnly).toBe(true);
    });

    it('should set readOnly and isAdmin to false when roles is null after update', async () => {
      service.platformIsClosed = false;
      service.roles = null;
      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockResolvedValue();
      jest.spyOn(service, 'updateRolesList').mockResolvedValue(null as any);

      await service.validateReadOnly();

      expect(service.readOnly).toBe(true);
      expect(service.isAdmin).toBe(false);
    });

    it('should set canDdit to true when user is admin', async () => {
      service.platformIsClosed = false;
      const mockRoles = {
        application: { role_id: 1 },
        initiative: []
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });
      jest.spyOn(service, 'updateRolesList').mockResolvedValue(mockRoles as any);

      await service.validateReadOnly();

      expect(service.access.canDdit).toBe(true);
      expect(service.isAdmin).toBe(true);
    });

    it('should return null when result is not provided and user is not admin', async () => {
      service.platformIsClosed = false;
      const mockRoles = {
        application: { role_id: 2 },
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });
      jest.spyOn(service, 'updateRolesList').mockResolvedValue(mockRoles as any);

      const result = await service.validateReadOnly();

      expect(result).toBeNull();
    });

    it('should set canDdit to true and readOnly to false when initiative is found', async () => {
      service.platformIsClosed = false;
      const mockRoles = {
        application: { role_id: 2 },
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });
      jest.spyOn(service, 'updateRolesList').mockResolvedValue(mockRoles as any);

      const result = { initiative_id: 1 };

      await service.validateReadOnly(result);

      expect(service.access.canDdit).toBe(true);
      expect(service.readOnly).toBe(false);
    });

    it('should set canDdit to false and readOnly to true when initiative is not found', async () => {
      service.platformIsClosed = false;
      const mockRoles = {
        application: { role_id: 2 },
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });
      jest.spyOn(service, 'updateRolesList').mockResolvedValue(mockRoles as any);

      const result = { initiative_id: 2 };

      await service.validateReadOnly(result);

      expect(service.access.canDdit).toBe(false);
      expect(service.readOnly).toBe(true);
    });

    it('should call updateRolesList when localStorageUser exists', async () => {
      service.platformIsClosed = false;
      mockAuthService.localStorageUser = { id: 1 };
      const mockRoles = {
        application: { role_id: 1 },
        initiative: []
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });

      const updateListSpy = jest.spyOn(service, 'updateRolesList').mockResolvedValue(mockRoles as any);

      await service.validateReadOnly();

      expect(updateListSpy).toHaveBeenCalled();
    });
  });

  describe('center helpers', () => {
    it('getMyCenters should return center array from roles', () => {
      service.roles = {
        center: [{ center_id: 'CIMMYT', center_name: 'CIMMYT', center_acronym: 'CIMMYT', role_id: 9, role_name: 'Center User' }]
      };

      expect(service.getMyCenters()).toHaveLength(1);
      expect(service.getMyCenters()[0].center_id).toBe('CIMMYT');
    });

    it('validateCenterAccess should return true for assigned center', () => {
      service.isAdmin = false;
      service.roles = {
        center: [{ center_id: 'IRRI' }]
      };

      expect(service.validateCenterAccess('IRRI')).toBe(true);
      expect(service.validateCenterAccess('CIMMYT')).toBe(false);
    });

    it('validateCenterAccess should return true for admin regardless of centers', () => {
      service.isAdmin = true;
      service.roles = { center: [] };

      expect(service.validateCenterAccess('CIMMYT')).toBe(true);
    });
  });
});
