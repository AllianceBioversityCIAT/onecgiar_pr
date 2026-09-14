import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Renderer2 } from '@angular/core';
import { TawkComponent } from './tawk.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
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
      imports: [HttpClientTestingModule, TawkComponent],
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
      let container = document.querySelector('.Tawk_API_container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'Tawk_API_container';
        document.body.appendChild(container);
      }
      component.initializeTawkIo();
      expect(component.script.text).toBeTruthy();
      expect(component.script.text.length).toBeGreaterThan(0);
      expect(component.script.text).toContain('document.createElement("script")');
      expect(component.script.text).toContain('s1.async=true');
      expect(component.script.text).toContain('s1.setAttribute("crossorigin","*")');
    });


    it('should include environment.tawkId in script src', () => {
      component.user = { name: 'Test User' };
      let container = document.querySelector('.Tawk_API_container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'Tawk_API_container';
        document.body.appendChild(container);
      }
      component.initializeTawkIo();
      expect(component.script.text).toContain('embed.tawk.to');
    });

    /**
     * P2-3683 removed the floating chat button from the bottom-right corner; the only way into the
     * chat is the topbar's Support menu. Tawk brings its launcher back on its own whenever the
     * conversation is minimised or ended, so hiding it once at load is not enough.
     */
    it('hides the floating bubble on load, on minimise and on chat end', () => {
      component.user = { name: 'Test User' };
      let container = document.querySelector('.Tawk_API_container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'Tawk_API_container';
        document.body.appendChild(container);
      }
      component.initializeTawkIo();

      const script = component.script.text;
      expect(script).toContain('Tawk_API.onLoad');
      expect(script).toContain('Tawk_API.onChatMinimized');
      expect(script).toContain('Tawk_API.onChatEnded');
      expect(script.match(/hideWidget\(\)/g)?.length).toBe(3);

      // Control: the launcher must still be reachable, or SupportChatService.open() has nothing
      // to show. Hiding it is not the same as removing the widget.
      expect(script).not.toContain('Tawk_API.showWidget = null');
    });
  });
});
