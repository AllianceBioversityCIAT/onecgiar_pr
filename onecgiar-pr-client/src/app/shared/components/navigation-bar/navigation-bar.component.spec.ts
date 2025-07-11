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

  it('should set isSticky to true when window.scrollY > 70 and ticking is false', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, configurable: true });
    component.isSticky = false;
    component['ticking'] = false;
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 1;
    });
    component.onScroll();
    expect(component.isSticky).toBe(true);
    expect(component['ticking']).toBe(true);
    rafSpy.mockRestore();
  });

  it('should set isSticky to false when window.scrollY <= 70 and ticking is false', () => {
    Object.defineProperty(window, 'scrollY', { value: 50, configurable: true });
    component.isSticky = true;
    component['ticking'] = false;
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      cb(0);
      return 1;
    });
    component.onScroll();
    expect(component.isSticky).toBe(false);
    expect(component['ticking']).toBe(true);
    rafSpy.mockRestore();
  });

  it('should not call requestAnimationFrame if ticking is true', () => {
    component['ticking'] = true;
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
    component.onScroll();
    expect(rafSpy).not.toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it('should remove scroll event listener on ngOnDestroy', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    component.ngOnDestroy();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', component.onScroll);
    removeEventListenerSpy.mockRestore();
  });

  it('should add scroll event listener on ngOnInit', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    component.ngOnInit();
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', component.onScroll, { passive: true });
    addEventListenerSpy.mockRestore();
  });
});
