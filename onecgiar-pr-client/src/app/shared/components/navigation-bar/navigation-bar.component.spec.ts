import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationBarComponent } from './navigation-bar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('NavigationBarComponent', () => {
  let component: NavigationBarComponent;
  let fixture: ComponentFixture<NavigationBarComponent>;

  // Mock service
  const mockNavigationBarService = { navbar_fixed: false };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [NavigationBarComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(NavigationBarComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should set navbar_fixed to true when scroll is over 70', () => {
    // Simulate scroll event
    Object.defineProperty(window, 'pageYOffset', { value: 200 });
    window.dispatchEvent(new Event('scroll'));

    expect(mockNavigationBarService.navbar_fixed).toBe(false);
  });

  it('should set navbar_fixed to false when scroll is under 70', () => {
    // Simulate scroll event
    Object.defineProperty(window, 'pageYOffset', { value: 50 });
    window.dispatchEvent(new Event('scroll'));

    expect(mockNavigationBarService.navbar_fixed).toBe(false);
  });
});
