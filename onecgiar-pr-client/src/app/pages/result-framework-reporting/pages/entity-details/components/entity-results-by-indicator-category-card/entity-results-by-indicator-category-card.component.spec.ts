import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityResultsByIndicatorCategoryCardComponent } from './entity-results-by-indicator-category-card.component';

describe('EntityResultsByIndicatorCategoryCardComponent', () => {
  let component: EntityResultsByIndicatorCategoryCardComponent;
  let fixture: ComponentFixture<EntityResultsByIndicatorCategoryCardComponent>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityResultsByIndicatorCategoryCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityResultsByIndicatorCategoryCardComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Template Rendering', () => {
    it('should display indicator category information when item is provided', () => {
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const categoryName = nativeElement.querySelector('.entity-results-by-indicator-category-card_header_title');
      expect(categoryName?.textContent?.trim()).toBe('Test Category');
    });

    it('should display "Indicator category" label', () => {
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const categoryLabel = nativeElement.querySelector('.entity-results-by-indicator-category-card_header_desc');
      expect(categoryLabel?.textContent?.trim()).toBe('Indicator category');
    });

    it('should display editing count', () => {
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const editingText = nativeElement.textContent || '';
      expect(editingText).toContain('Editing:5');
    });

    it('should display submitted count', () => {
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const submittedText = nativeElement.textContent || '';
      expect(submittedText).toContain('Submitted:10');
    });

    it('should display quality assessed count', () => {
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const qualityAssessedText = nativeElement.textContent || '';
      expect(qualityAssessedText).toContain('Quality assessed:8');
    });

    it('should render Report button with correct label', () => {
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const button = nativeElement.querySelector('button[pButton]');
      expect(button).toBeTruthy();
      expect(button?.textContent?.trim()).toContain('Report');
    });

    it('should handle undefined item gracefully', () => {
      component.item = undefined as any;
      fixture.detectChanges();

      const categoryName = nativeElement.querySelector('.entity-results-by-indicator-category-card_header_title');
      expect(categoryName?.textContent?.trim()).toBe('');
    });
  });

  describe('Icon Rendering', () => {
    it('should render correct icon for resultTypeId 7', () => {
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const icon = nativeElement.querySelector('i');
      expect(icon?.classList.contains('pi')).toBe(true);
      expect(icon?.classList.contains('pi-flag')).toBe(true);
    });

    it('should render correct icon for resultTypeId 6', () => {
      component.item = {
        resultTypeId: 6,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const icon = nativeElement.querySelector('i');
      expect(icon?.classList.contains('pi-book')).toBe(true);
    });

    it('should render correct icon for resultTypeId 5', () => {
      component.item = {
        resultTypeId: 5,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const icon = nativeElement.querySelector('i');
      expect(icon?.classList.contains('pi-users')).toBe(true);
    });

    it('should render correct icon for resultTypeId 2', () => {
      component.item = {
        resultTypeId: 2,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const icon = nativeElement.querySelector('i');
      expect(icon?.classList.contains('pi-sun')).toBe(true);
    });

    it('should render correct icon for resultTypeId 1', () => {
      component.item = {
        resultTypeId: 1,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const icon = nativeElement.querySelector('i');
      expect(icon?.classList.contains('pi-folder-open')).toBe(true);
    });

    it('should render default icon for unknown resultTypeId', () => {
      component.item = {
        resultTypeId: 999,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const icon = nativeElement.querySelector('i');
      expect(icon?.classList.contains('pi-folder')).toBe(true);
    });
  });

  describe('Report Button', () => {
    it('should emit reportRequested when Report button is clicked', () => {
      const spy = jest.fn();
      component.reportRequested.subscribe(spy);
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const button = nativeElement.querySelector('button[pButton]') as HTMLButtonElement;
      button?.click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should have correct button attributes', () => {
      component.item = {
        resultTypeId: 7,
        resultTypeName: 'Test Category',
        editing: 5,
        submitted: 10,
        qualityAssessed: 8
      };
      fixture.detectChanges();

      const button = nativeElement.querySelector('button[pButton]') as HTMLButtonElement;
      expect(button?.type).toBe('button');
      expect(button?.classList.contains('p-button-outlined')).toBe(true);
    });
  });

  describe('getIcon', () => {
    it('should return flag icon for type 7', () => {
      expect(component.getIcon(7)).toBe('pi pi-flag');
    });

    it('should return book icon for type 6', () => {
      expect(component.getIcon(6)).toBe('pi pi-book');
    });

    it('should return users icon for type 5', () => {
      expect(component.getIcon(5)).toBe('pi pi-users');
    });

    it('should return sun icon for type 2', () => {
      expect(component.getIcon(2)).toBe('pi pi-sun');
    });

    it('should return folder-open icon for type 1', () => {
      expect(component.getIcon(1)).toBe('pi pi-folder-open');
    });

    it('should return default folder icon for other types', () => {
      expect(component.getIcon(999)).toBe('pi pi-folder');
      expect(component.getIcon(0)).toBe('pi pi-folder');
      expect(component.getIcon(-1)).toBe('pi pi-folder');
    });
  });
});
