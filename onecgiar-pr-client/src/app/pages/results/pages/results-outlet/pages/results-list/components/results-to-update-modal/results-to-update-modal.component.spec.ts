import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsToUpdateModalComponent } from './results-to-update-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DialogModule } from 'primeng/dialog';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';
import { TableModule } from 'primeng/table';

describe('ResultsToUpdateModalComponent', () => {
  let component: ResultsToUpdateModalComponent;
  let fixture: ComponentFixture<ResultsToUpdateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ResultsToUpdateModalComponent, PrFieldHeaderComponent, ResultsToUpdateFilterPipe],
      imports: [HttpClientTestingModule, DialogModule, TableModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsToUpdateModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
