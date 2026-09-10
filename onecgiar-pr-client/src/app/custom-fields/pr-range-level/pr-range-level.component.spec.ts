import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrRangeLevelComponent } from './pr-range-level.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RolesService } from '../../shared/services/global/roles.service';

describe('PrRangeLevelComponent', () => {
  let component: PrRangeLevelComponent;
  let fixture: ComponentFixture<PrRangeLevelComponent>;
  let rolesService: { readOnly: boolean };

  beforeEach(async () => {
    rolesService = { readOnly: false };

    await TestBed.configureTestingModule({
      declarations: [PrRangeLevelComponent],
      imports: [HttpClientTestingModule],
      providers: [{ provide: RolesService, useValue: rolesService }]
    }).compileComponents();

    fixture = TestBed.createComponent(PrRangeLevelComponent);
    component = fixture.componentInstance;
    component.options = [
      { id: 10, name: 'Level 0', definition: 'Basic principles.' },
      { id: 11, name: 'Level 1', definition: 'A longer narrative about basic research and impact pathways for partners.' },
      { id: 12, name: 'Level 2', definition: 'Short.' }
    ];
    component.optionValue = 'id';
    component.itemTitle = 'name';
    component.itemDescription = 'definition';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onSelectLevel updates value and emits', () => {
    const emitSpy = jest.spyOn(component.selectOptionEvent, 'emit');
    component.onSelectLevel(11);

    expect(component.value).toBe(11);
    expect(component.selectedIndex).toBe(1);
    expect(component.selectedTitle).toBe('Level 1');
    expect(emitSpy).toHaveBeenCalledWith(11);
  });

  it('progressPercent reflects selected index across the track', () => {
    component.onSelectLevel(10);
    expect(component.progressPercent).toBe(0);

    component.onSelectLevel(12);
    expect(component.progressPercent).toBe(100);

    component.onSelectLevel(11);
    expect(component.progressPercent).toBe(50);
  });

  it('does not select when disabled or read-only', () => {
    component.value = 10;

    component.disabled = true;
    component.onSelectLevel(11);
    expect(component.value).toBe(10);

    component.disabled = false;
    rolesService.readOnly = true;
    component.onSelectLevel(11);
    expect(component.value).toBe(10);
  });

  it('narrative always reflects selected level (no hover preview swap)', () => {
    component.onSelectLevel(10);
    expect(component.selectedTitle).toBe('Level 0');
    expect(component.selectedDescription).toBe('Basic principles.');

    component.onSelectLevel(11);
    expect(component.selectedTitle).toBe('Level 1');
    expect(component.selectedDescription).toContain('longer narrative');
  });
});
