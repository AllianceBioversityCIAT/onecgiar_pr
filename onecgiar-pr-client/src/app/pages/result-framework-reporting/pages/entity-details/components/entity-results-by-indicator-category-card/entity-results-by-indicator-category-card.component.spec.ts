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

  it('should emit reportRequested when Report button is clicked', () => {
    const spy = jest.fn();
    component.reportRequested.subscribe(spy);
    fixture.detectChanges();

    const button = nativeElement.querySelector('button');
    button?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledTimes(1);
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
