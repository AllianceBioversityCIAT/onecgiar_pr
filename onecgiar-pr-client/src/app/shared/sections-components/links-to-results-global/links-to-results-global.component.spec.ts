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
});
