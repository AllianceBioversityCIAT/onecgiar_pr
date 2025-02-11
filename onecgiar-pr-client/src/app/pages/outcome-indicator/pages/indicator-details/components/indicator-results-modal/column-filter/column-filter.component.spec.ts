import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnFilterComponent } from './column-filter.component';
import { CommonModule } from '@angular/common';
import { Table, TableModule, TableService } from 'primeng/table';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';

describe('ColumnFilterComponent', () => {
  let component: ColumnFilterComponent;
  let fixture: ComponentFixture<ColumnFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, TableModule, MultiSelectModule, FormsModule],
      providers: [Table, TableService]
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnFilterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
