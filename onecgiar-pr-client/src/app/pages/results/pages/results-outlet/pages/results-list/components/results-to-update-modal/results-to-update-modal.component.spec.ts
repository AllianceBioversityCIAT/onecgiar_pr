import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultsToUpdateModalComponent } from './results-to-update-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ResultsToUpdateFilterPipe } from './results-to-update-filter.pipe';
import { TableModule } from 'primeng/table';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('ResultsToUpdateModalComponent', () => {
  let component: ResultsToUpdateModalComponent;
  let fixture: ComponentFixture<ResultsToUpdateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ResultsToUpdateModalComponent,
        ResultsToUpdateFilterPipe,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        TableModule,
        FormsModule,
        DialogModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultsToUpdateModalComponent);
    component = fixture.componentInstance;
  });

  describe('onPressAction()', () => {
    it('onPressAction should update properties correctly', () => {
      const mockResult = {
        title: 'Title',
        id: 1,
      };

      component.onPressAction(mockResult);

      expect(component.api.resultsSE.currentResultId).toBe(1);
      expect(component.api.dataControlSE.currentResult).toBe(mockResult);
      expect(component.api.dataControlSE.chagePhaseModal).toBeTruthy();
    });
  });
});
