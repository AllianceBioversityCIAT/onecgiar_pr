import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationBarComponent } from './navigation-bar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';

describe('NavigationBarComponent', () => {
  let component: NavigationBarComponent;
  let fixture: ComponentFixture<NavigationBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NavigationBarComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(NavigationBarComponent);
    component = fixture.componentInstance;
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should return true when validateAdminModuleAndRole is called with an option that has onlyTest true and environment is production', () => {
    const option = { onlyTest: true, prName: 'Admin module' };
    environment.production = true;
    expect(component.validateAdminModuleAndRole(option)).toBe(true);
  });

  it('should return false when validateAdminModuleAndRole is called and user is an admin', () => {
    const option = { path: 'init-admin-module', prName: 'Admin module' };
    component.rolesSE.isAdmin = true;
    expect(component.validateAdminModuleAndRole(option)).toBe(false);
  });

  it('should return the result of validateCoordAndLead when validateAdminModuleAndRole is called with an option that has path "init-admin-module" and user is not an admin', () => {
    const option = { path: 'init-admin-module', prName: 'Admin module' };
    component.rolesSE.isAdmin = false;
    const validateCoordAndLeadSpy = jest.spyOn(component, 'validateCoordAndLead');
    component.validateAdminModuleAndRole(option);
    expect(validateCoordAndLeadSpy).toHaveBeenCalled();
  });

  it('should return false when validateCoordAndLead is called and user has a role of "Lead" or "Coordinator"', () => {
    component.dataControlSE.myInitiativesList = [{ role: 'Lead' }, { role: 'Coordinator' }];
    expect(component.validateCoordAndLead()).toBe(false);
  });

  it('should return true when validateCoordAndLead is called and user does not have a role of "Lead" or "Coordinator"', () => {
    component.dataControlSE.myInitiativesList = [{ role: 'Support' }];
    expect(component.validateCoordAndLead()).toBe(true);
  });
  it('should handle undefined myInitiativesList and return true', () => {
    // myInitiativesList is undefined by default; ensures the `?? []` branch is used
    component.dataControlSE.myInitiativesList = undefined as any;
    expect(component.validateCoordAndLead()).toBe(true);
  });
  it('should handle null myInitiativesList and return true', () => {
    component.dataControlSE.myInitiativesList = null as any;
    expect(component.validateCoordAndLead()).toBe(true);
  });
  it('should return false when validateAdminModuleAndRole is called with an option that does not have onlyTest true and environment is not production', () => {
    const option = { onlyTest: false, prName: 'Admin module' };
    environment.production = false;
    expect(component.validateAdminModuleAndRole(option)).toBe(false);
  });
});
