import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FooterComponent],
      imports: [HttpClientModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set isFloating to true when route is in the list', () => {
    component.routes = [{ path: '/', floating: true }];
    component.showIfRouteIsInList();
    expect(component.isFloating).toBe(true);
  });

  it('should set isFloatingFix to true when route is in the list', () => {
    component.routes = [{ path: '/', floatingFix: true }];
    component.showIfRouteIsInList();
    expect(component.isFloatingFix).toBe(true);
  });

  it('should set isFloatingFix and isFloating to false when route is not in the list', () => {
    component.routes = [{ path: '/login', floatingFix: true }];
    component.showIfRouteIsInList();
    expect(component.isFloatingFix).toBe(false);
    expect(component.isFloating).toBe(false);
  });

  it('should set isHover to true on mouse enter', () => {
    component.onMouseEnter();
    expect(component.isHover).toBe(true);
  });

  it('should set isHover to false on mouse leave', () => {
    component.onMouseLeave();
    expect(component.isHover).toBe(false);
  });
});
