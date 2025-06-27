import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationBarComponent } from './navigation-bar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';

describe('NavigationBarComponent', () => {
  let component: NavigationBarComponent;
  let fixture: ComponentFixture<NavigationBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [NavigationBarComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(NavigationBarComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should return true when validateAdminModuleAndRole is called with an option that has onlytest true and environment is production', () => {
    const option = { onlytest: true };
    environment.production = true;
    expect(component.validateAdminModuleAndRole(option)).toBe(true);
  });

  it('should return false when validateAdminModuleAndRole is called and user is an admin', () => {
    const option = { path: 'init-admin-module' };
    component.rolesSE.isAdmin = true;
    expect(component.validateAdminModuleAndRole(option)).toBe(false);
  });

  it('should return the result of validateCoordAndLead when validateAdminModuleAndRole is called with an option that has path "init-admin-module" and user is not an admin', () => {
    const option = { path: 'init-admin-module' };
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
  it('should return false when validateAdminModuleAndRole is called with an option that does not have onlytest true and environment is not production', () => {
    const option = { onlytest: false };
    environment.production = false;
    expect(component.validateAdminModuleAndRole(option)).toBe(false);
  });
});
