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
    it('should set readOnly to false and return isAdmin true when role_id is 1', () => {
      const application = { role_id: 1 };
      const result = service.validateApplication(application);

      expect(service.readOnly).toBe(false);
      expect(result.isAdmin).toBe(true);
    });

    it('should set readOnly to true and return isAdmin false when role_id is not 1', () => {
      const application = { role_id: 2 };
      const result = service.validateApplication(application);

      expect(service.readOnly).toBe(true);
      expect(result.isAdmin).toBe(false);
    });

    it('should handle null application', () => {
      const result = service.validateApplication(null);

      expect(service.readOnly).toBe(true);
      expect(result.isAdmin).toBe(false);
    });

    it('should handle undefined application', () => {
      const result = service.validateApplication(undefined);

      expect(service.readOnly).toBe(true);
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

    it('should handle null localStorage value', async () => {
      localStorage.removeItem('roles');

      await service.updateRolesListFromLocalStorage();

      expect(service.roles).toBeNull();
      expect(service.firstValidationOfReadOnly).toBe(true);
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

    it('should handle API errors', done => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('API Error');
      mockAuthService.GET_allRolesByUser.mockReturnValue(throwError(() => error));

      service.updateRolesList();

      // Since the promise doesn't reject on error (only logs to console),
      // we wait a bit and then check if console.error was called
      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(error);
        consoleErrorSpy.mockRestore();
        done();
      }, 100);
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

    it('should set readOnly to true when roles is null after update', async () => {
      service.platformIsClosed = false;
      service.roles = null;
      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(() => {
        service.roles = null;
        return Promise.resolve();
      });

      await service.validateReadOnly();

      // The function sets readOnly to true when roles is null
      expect(service.readOnly).toBe(true);
    });

    it('should set canDdit to true when user is admin', done => {
      service.platformIsClosed = false;
      const mockRoles = {
        application: { role_id: 1 },
        initiative: []
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });

      service.validateReadOnly().then(() => {
        // Give time for the async updateMyRoles to complete
        setTimeout(() => {
          expect(service.access.canDdit).toBe(true);
          done();
        }, 100);
      });
    });

    it('should return undefined when result is not provided and user is not admin', async () => {
      service.platformIsClosed = false;
      const mockRoles = {
        application: { role_id: 2 },
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });

      const result = await service.validateReadOnly();

      expect(result).toBeUndefined();
    });

    it('should set canDdit to true and readOnly to false when initiative is found', done => {
      service.platformIsClosed = false;
      const mockRoles = {
        application: { role_id: 2 },
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });

      const result = { initiative_id: 1 };

      service.validateReadOnly(result).then(() => {
        setTimeout(() => {
          expect(service.access.canDdit).toBe(true);
          expect(service.readOnly).toBe(false);
          done();
        }, 100);
      });
    });

    it('should set canDdit to false and readOnly to true when initiative is not found', done => {
      service.platformIsClosed = false;
      const mockRoles = {
        application: { role_id: 2 },
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(async () => {
        service.roles = mockRoles;
      });

      const result = { initiative_id: 2 };

      service.validateReadOnly(result).then(() => {
        setTimeout(() => {
          expect(service.access.canDdit).toBe(false);
          expect(service.readOnly).toBe(true);
          done();
        }, 100);
      });
    });

    it('should call updateRolesList when localStorageUser exists', done => {
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

      service.validateReadOnly().then(() => {
        setTimeout(() => {
          expect(updateListSpy).toHaveBeenCalled();
          done();
        }, 100);
      });
    });

    it('should handle roles being set after waiting for promise', done => {
      service.platformIsClosed = false;
      service.roles = null;

      const mockRoles = {
        application: { role_id: 2 },
        initiative: [{ initiative_id: 1, role_id: 5 }]
      };

      jest.spyOn(service, 'updateRolesListFromLocalStorage').mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            service.roles = mockRoles;
            resolve();
          }, 50);
        });
      });

      service.validateReadOnly().then(() => {
        setTimeout(() => {
          expect(service.roles).toEqual(mockRoles);
          done();
        }, 100);
      });
    });
  });
});
