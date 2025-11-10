import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Renderer2 } from '@angular/core';
import { TawkComponent } from './tawk.component';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from '../../services/api/api.service';

describe('TawkComponent', () => {
  let component: TawkComponent;
  let fixture: ComponentFixture<TawkComponent>;
  let mockApiService: any;
  let mockRenderer: any;
  let mockDocument: any;
  let mockScriptElement: any;

  beforeEach(async () => {
    mockScriptElement = {
      text: '',
      async: false,
      src: '',
      charset: '',
      setAttribute: jest.fn()
    };

    mockApiService = {
      setTWKAttributes: jest.fn()
    };

    mockRenderer = {
      createElement: jest.fn().mockReturnValue(mockScriptElement),
      appendChild: jest.fn()
    };

    // Create a real container element
    const container = document.createElement('div');
    container.className = 'Tawk_API_container';
    document.body.appendChild(container);

    mockDocument = {
      querySelector: jest.fn().mockReturnValue(container),
      querySelectorAll: jest.fn().mockReturnValue([]),
      getElementsByTagName: jest.fn().mockReturnValue([]),
      createElement: jest.fn().mockImplementation((tag) => document.createElement(tag)),
      body: document.body,
      head: document.head
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientModule, TawkComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: Renderer2, useValue: mockRenderer },
        { provide: DOCUMENT, useValue: mockDocument }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TawkComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    const container = document.querySelector('.Tawk_API_container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call initializeTawkIo', () => {
      jest.spyOn(component, 'initializeTawkIo');
      component.ngOnInit();
      expect(component.initializeTawkIo).toHaveBeenCalled();
    });
  });

  describe('initializeTawkIo', () => {
    it('should not initialize Tawk when user is undefined', () => {
      component.user = undefined;
      component.initializeTawkIo();
      
      expect(mockRenderer.appendChild).not.toHaveBeenCalled();
      expect(mockApiService.setTWKAttributes).not.toHaveBeenCalled();
    });



    it('should set script text correctly when user is defined', () => {
      component.user = { name: 'Test User' };
      
      // Ensure container exists
      let container = document.querySelector('.Tawk_API_container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'Tawk_API_container';
        document.body.appendChild(container);
      }
      
      component.initializeTawkIo();
      
      // Verify script text contains the Tawk.io initialization code
      expect(component.script.text).toBeTruthy();
      expect(component.script.text.length).toBeGreaterThan(0);
      expect(component.script.text).toContain('document.createElement("script")');
      expect(component.script.text).toContain('s1.async=true');
      expect(component.script.text).toContain('s1.setAttribute("crossorigin","*")');
    });


    it('should include environment.tawkId in script src', () => {
      component.user = { name: 'Test User' };
      
      // Ensure container exists
      let container = document.querySelector('.Tawk_API_container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'Tawk_API_container';
        document.body.appendChild(container);
      }
      
      component.initializeTawkIo();
      
      // The script should contain the tawkId in the URL
      expect(component.script.text).toContain('embed.tawk.to');
    });
  });
});
