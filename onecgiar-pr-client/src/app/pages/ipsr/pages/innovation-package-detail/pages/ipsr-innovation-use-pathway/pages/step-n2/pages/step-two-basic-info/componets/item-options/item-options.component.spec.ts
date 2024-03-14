import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemOptionsComponent } from './item-options.component';
import { PrFieldHeaderComponent } from '../../../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ItemOptionsComponent', () => {
  let component: ItemOptionsComponent;
  let fixture: ComponentFixture<ItemOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ItemOptionsComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ItemOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize selectedOne and selectedCategories arrays', () => {
    expect(component.selectedOne).toEqual([]);
    expect(component.selectedCategories).toEqual([]);
  });

  it('should update selectedOne and selectedCategories arrays when selectes method is called', () => {
    const category = {
      complementary_innovation_enabler_types_id: 1,
      subCategories: []
    };
    component.selectedCategories = [category];

    component.selectes(category);

    expect(component.typeOne).toEqual([]);
    expect(component.typeTwo).toEqual([category]);
  });

  it('should update selectedOne array when index is not -1 and subCategories length is not 0', () => {
    const category = {
      complementary_innovation_enabler_types_id: 1,
      subCategories: []
    };
    component.selectedCategories = [category];

    component.selectes(category);

    expect(component.selectedOne).toEqual([]);
  });

  it('should update selectedOne to empty array when index is -1 and subCategories length is not 0', () => {
    const category = {
      complementary_innovation_enabler_types_id: 1,
      subCategories: [{}, {}]
    };
    component.selectedCategories = [];

    component.selectes(category);

    expect(component.selectedOne).toEqual([]);
  });

  it('should update selectedCategories array when category subCategories length is not equal to selectedOne length', () => {
    const category = {
      complementary_innovation_enabler_types_id: 1,
      subCategories: []
    };
    component.selectedOne = [{}];
    component.selectedCategories = [category];

    component.subSelectes(category);

    expect(component.selectedCategories).toEqual([]);
  });

  it('should update selectedCategories array when category subCategories length is equal to selectedOne length', () => {
    const category = {
      complementary_innovation_enabler_types_id: 1,
      subCategories: [{}, {}]
    };
    component.selectedOne = [{}, {}];
    component.selectedCategories = [];

    component.subSelectes(category);

    expect(component.selectedCategories).toEqual([category]);
  });
});
