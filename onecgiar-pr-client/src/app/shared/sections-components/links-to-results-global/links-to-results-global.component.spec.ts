import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinksToResultsGlobalComponent } from './links-to-results-global.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DetailSectionTitleComponent } from '../../../custom-fields/detail-section-title/detail-section-title.component';
import { PrFieldHeaderComponent } from '../../../custom-fields/pr-field-header/pr-field-header.component';
import { TableModule } from 'primeng/table';
import { FilterResultNotLinkedPipe } from '../../../pages/results/pages/result-detail/pages/rd-links-to-results/pipe/filter-result-not-linked.pipe';
import { SaveButtonComponent } from '../../../custom-fields/save-button/save-button.component';

describe('LinksToResultsGlobalComponent', () => {
  let component: LinksToResultsGlobalComponent;
  let fixture: ComponentFixture<LinksToResultsGlobalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        LinksToResultsGlobalComponent,
        DetailSectionTitleComponent,
        PrFieldHeaderComponent,
        FilterResultNotLinkedPipe,
        SaveButtonComponent
      ],
      imports: [HttpClientTestingModule, TableModule]
    }).compileComponents();

    fixture = TestBed.createComponent(LinksToResultsGlobalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  describe('validateOrder', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = document.createElement('table');
      mockElement.id = 'resultListTable';
      document.body.appendChild(mockElement);
    });

    afterEach(() => {
      document.body.removeChild(mockElement);
    });

    it('should set combine to true when columnAttr is "result_code"', done => {
      component.validateOrder('result_code');

      setTimeout(() => {
        expect(component.combine).toBe(true);
        done();
      }, 100);
    });

    it('should set combine to true when there are no sorted columns', done => {
      component.validateOrder('other_attr');

      setTimeout(() => {
        expect(component.combine).toBe(true);
        done();
      }, 100);
    });
  });
  describe('contributeDescription', () => {
    it('should return the correct HTML string', () => {
      const expectedHTML = `<ul>
      <li>To search for results that have already been reported, enter keywords into the title box below and click on the link button of the result found if it contributes to this result you are reporting.</li>
      <li>Users will be able to select other results from previous phase</li>
    </ul>`;

      const result = component.contributeDescription();

      expect(result).toEqual(expectedHTML);
    });
  });
  describe('getFirstByDate', () => {
    it('should return the result with the most recent date', () => {
      const results = [{ created_date: '2022-01-01' }, { created_date: '2022-01-02' }, { created_date: '2022-01-03' }];

      const expected = { created_date: '2022-01-03' };

      const result = component.getFirstByDate(results);

      expect(result).toEqual(expected);
    });
  });
});
