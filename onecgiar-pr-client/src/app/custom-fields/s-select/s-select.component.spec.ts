import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SSelectComponent } from './s-select.component';
import { HttpClientModule } from '@angular/common/http';
import { PrFieldHeaderComponent } from '../pr-field-header/pr-field-header.component';
import { LabelNamePipe } from '../pr-select/label-name.pipe';
import { FormsModule } from '@angular/forms';

describe('SSelectComponent', () => {
  let component: SSelectComponent;
  let fixture: ComponentFixture<SSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SSelectComponent, PrFieldHeaderComponent, LabelNamePipe],
      imports: [HttpClientModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
