import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAowComponent } from './entity-aow.component';
import { ProgressBarModule } from 'primeng/progressbar';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EntityAowService } from './services/entity-aow.service';
import { signal } from '@angular/core';
import { Router } from '@angular/router';

describe('EntityAowComponent', () => {
  let component: EntityAowComponent;
  let fixture: ComponentFixture<EntityAowComponent>;
  let entityAowServiceMock: any;
  let router: Router;

  beforeEach(async () => {
    entityAowServiceMock = {
      getClarisaGlobalUnits: jest.fn(),
      entityAows: signal<any[]>([]),
      sideBarItems: signal<any[]>([])
    };

    await TestBed.configureTestingModule({
      imports: [EntityAowComponent, ProgressBarModule, RouterTestingModule, HttpClientTestingModule],
      providers: [{ provide: EntityAowService, useValue: entityAowServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAowComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call getClarisaGlobalUnits', () => {
      const getClarisaGlobalUnitsSpy = jest.spyOn(entityAowServiceMock, 'getClarisaGlobalUnits');
      component.ngOnInit();
      expect(getClarisaGlobalUnitsSpy).toHaveBeenCalled();
    });
  });

  describe('getCurrentRoute', () => {
    beforeEach(() => {
      // Mock router.url
      Object.defineProperty(router, 'url', {
        writable: true,
        value: ''
      });
    });

    it('should return empty string when no sidebar items exist', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([]);
      Object.defineProperty(router, 'url', { value: '/some/url' });

      const result = component.getCurrentRoute();

      expect(result).toBe('');
    });

    it('should return empty string when URL does not contain /aow/ and no matching item found', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        { label: 'Unplanned results', itemLink: '/aow/unplanned' }
      ]);
      Object.defineProperty(router, 'url', { value: '/different/url' });

      const result = component.getCurrentRoute();

      expect(result).toBe('');
    });

    it('should return label when URL contains /aow/ and matches top-level item', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        { label: 'Unplanned results', itemLink: '/aow/unplanned' }
      ]);
      Object.defineProperty(router, 'url', { value: '/entity/123/aow/all' });

      const result = component.getCurrentRoute();

      expect(result).toBe('All indicators');
    });

    it('should return label when URL does not contain /aow/ but matches top-level item exactly', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        { label: 'Unplanned results', itemLink: '/aow/unplanned' }
      ]);
      Object.defineProperty(router, 'url', { value: '/aow/all' });

      const result = component.getCurrentRoute();

      expect(result).toBe('All indicators');
    });

    it('should return label when URL contains /aow/ and matches nested tree item', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        {
          isTree: true,
          label: 'By AOW',
          items: [
            { label: 'AOW1', itemLink: '/aow/AOW1' },
            { label: 'AOW2', itemLink: '/aow/AOW2' }
          ]
        }
      ]);
      Object.defineProperty(router, 'url', { value: '/entity/123/aow/AOW1' });

      const result = component.getCurrentRoute();

      expect(result).toBe('AOW1');
    });

    it('should return label when URL does not contain /aow/ but matches nested tree item exactly', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        {
          isTree: true,
          label: 'By AOW',
          items: [
            { label: 'AOW1', itemLink: '/aow/AOW1' },
            { label: 'AOW2', itemLink: '/aow/AOW2' }
          ]
        }
      ]);
      Object.defineProperty(router, 'url', { value: '/aow/AOW2' });

      const result = component.getCurrentRoute();

      expect(result).toBe('AOW2');
    });

    it('should return empty string when URL contains /aow/ but no matching item found in tree', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        {
          isTree: true,
          label: 'By AOW',
          items: [
            { label: 'AOW1', itemLink: '/aow/AOW1' },
            { label: 'AOW2', itemLink: '/aow/AOW2' }
          ]
        }
      ]);
      Object.defineProperty(router, 'url', { value: '/entity/123/aow/nonexistent' });

      const result = component.getCurrentRoute();

      expect(result).toBe('');
    });

    it('should return empty string when tree item exists but items is not an array', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        {
          isTree: true,
          label: 'By AOW',
          items: 'not an array'
        }
      ]);
      Object.defineProperty(router, 'url', { value: '/entity/123/aow/AOW1' });

      const result = component.getCurrentRoute();

      expect(result).toBe('');
    });

    it('should return empty string when tree item exists but isTree is false', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        {
          isTree: false,
          label: 'By AOW',
          items: [
            { label: 'AOW1', itemLink: '/aow/AOW1' },
            { label: 'AOW2', itemLink: '/aow/AOW2' }
          ]
        }
      ]);
      Object.defineProperty(router, 'url', { value: '/entity/123/aow/AOW1' });

      const result = component.getCurrentRoute();

      expect(result).toBe('');
    });

    it('should return empty string when multiple tree items exist but none match', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        {
          isTree: true,
          label: 'By AOW',
          items: [{ label: 'AOW1', itemLink: '/aow/AOW1' }]
        },
        {
          isTree: true,
          label: 'By Category',
          items: [{ label: 'Category1', itemLink: '/aow/category1' }]
        }
      ]);
      Object.defineProperty(router, 'url', { value: '/entity/123/aow/nonexistent' });

      const result = component.getCurrentRoute();

      expect(result).toBe('');
    });

    it('should return label from first matching tree item when multiple trees have matching items', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([
        { label: 'All indicators', itemLink: '/aow/all' },
        {
          isTree: true,
          label: 'By AOW',
          items: [{ label: 'AOW1', itemLink: '/aow/AOW1' }]
        },
        {
          isTree: true,
          label: 'By Category',
          items: [{ label: 'AOW1', itemLink: '/aow/AOW1' }]
        }
      ]);
      Object.defineProperty(router, 'url', { value: '/entity/123/aow/AOW1' });

      const result = component.getCurrentRoute();

      expect(result).toBe('AOW1');
    });

    it('should handle empty URL gracefully', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([{ label: 'All indicators', itemLink: '/aow/all' }]);
      Object.defineProperty(router, 'url', { value: '' });

      const result = component.getCurrentRoute();

      expect(result).toBe('');
    });

    it('should handle URL with only /aow/ at the end', () => {
      entityAowServiceMock.sideBarItems = signal<any[]>([{ label: 'All indicators', itemLink: '/aow/all' }]);
      Object.defineProperty(router, 'url', { value: '/some/path/aow/' });

      const result = component.getCurrentRoute();

      expect(result).toBe('');
    });
  });

  describe('toggleAOWTree', () => {
    it('should toggle the AOW tree', () => {
      component.toggleAOWTree({ isOpen: true });
      expect(component.isAOWTreeOpen()).toBe(false);
    });
  });
});
