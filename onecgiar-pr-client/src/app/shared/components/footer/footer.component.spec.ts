import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FooterComponent],
      imports: [HttpClientTestingModule, RouterTestingModule]
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

  // P2-3145: the glossary link is the only way the Reporting Tool points at the
  // centralized CLARISA glossary, so both the label and the destination are asserted.
  it('should render the glossary link in the footer', () => {
    component.routes = [{ path: '/' }];
    fixture.detectChanges();

    const anchors: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('.footer a.f-button'));
    const glossary = anchors.find(anchor => anchor.textContent?.trim() === 'Glossary of Terms');

    expect(glossary).toBeTruthy();
    expect(glossary?.getAttribute('href')).toBe('https://clarisa.cgiar.org/landing-page/glossary');
    expect(glossary?.getAttribute('target')).toBe('_blank');
  });
});
