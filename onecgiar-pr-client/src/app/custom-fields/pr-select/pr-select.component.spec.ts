import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrSelectComponent } from './pr-select.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrFieldHeaderComponent } from '../pr-field-header/pr-field-header.component';
import { LabelNamePipe } from './label-name.pipe';
import { FormsModule } from '@angular/forms';

describe('PrSelectComponent', () => {
  let component: PrSelectComponent;
  let fixture: ComponentFixture<PrSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrSelectComponent, PrFieldHeaderComponent, LabelNamePipe],
      imports: [HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses a distinct trigger id for select instances with the same option value', () => {
    fixture.componentRef.setInput('optionValue', 'id');
    fixture.detectChanges();

    const secondFixture = TestBed.createComponent(PrSelectComponent);
    secondFixture.componentRef.setInput('optionValue', 'id');
    secondFixture.detectChanges();

    expect(component.triggerId).not.toBe(secondFixture.componentInstance.triggerId);
  });

  it('closes its own expanded dropdown after selecting an option', () => {
    fixture.componentRef.setInput('optionValue', 'id');
    fixture.componentRef.setInput('expandSpaceOnOpen', true);
    fixture.detectChanges();
    component.isDropdownOpen.set(true);

    component.removeFocus({ id: 2 });

    expect(component.isDropdownOpen()).toBe(false);
  });
});
