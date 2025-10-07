import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrSelectComponent } from './pr-select.component';
import { HttpClientModule } from '@angular/common/http';
import { PrFieldHeaderComponent } from '../pr-field-header/pr-field-header.component';
import { LabelNamePipe } from './label-name.pipe';
import { FormsModule } from '@angular/forms';

describe('PrSelectComponent', () => {
  let component: PrSelectComponent;
  let fixture: ComponentFixture<PrSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrSelectComponent, PrFieldHeaderComponent, LabelNamePipe],
      imports: [HttpClientModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(PrSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
