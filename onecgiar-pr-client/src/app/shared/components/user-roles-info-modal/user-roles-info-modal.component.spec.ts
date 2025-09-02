import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserRolesInfoModalComponent } from './user-roles-info-modal.component';
import { HttpClientModule } from '@angular/common/http';
import { TooltipModule } from 'primeng/tooltip';

describe('UserRolesInfoModalComponent', () => {
  let component: UserRolesInfoModalComponent;
  let fixture: ComponentFixture<UserRolesInfoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      imports: [HttpClientModule, UserRolesInfoModalComponent, TooltipModule]
    }).compileComponents();

    fixture = TestBed.createComponent(UserRolesInfoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open the information link in a new window with correct parameters', () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    const url = component.globalLinksSE.links.url_platform_information;
    const w = window.innerWidth - window.innerWidth / 3;
    const h = window.innerHeight - window.innerHeight / 4;
    const top = window.screenY + (window.outerHeight - h) / 2.5;
    const left = window.screenX + (window.outerWidth - w) / 2;

    component.openInfoLink();

    expect(windowOpenSpy).toHaveBeenCalledWith(url, 'Information center', `left=${left},top=${top},width=${w},height=${h}`);

    windowOpenSpy.mockRestore();
  });
});
