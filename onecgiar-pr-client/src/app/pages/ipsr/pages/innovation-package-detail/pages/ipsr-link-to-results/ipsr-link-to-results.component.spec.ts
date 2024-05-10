import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsrLinkToResultsComponent } from './ipsr-link-to-results.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LinksToResultsGlobalComponent } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { TableModule } from 'primeng/table';
import { FilterResultNotLinkedPipe } from '../../../../../results/pages/result-detail/pages/rd-links-to-results/pipe/filter-result-not-linked.pipe';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';

describe('IpsrLinkToResultsComponent', () => {
  let component: IpsrLinkToResultsComponent;
  let fixture: ComponentFixture<IpsrLinkToResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrLinkToResultsComponent, LinksToResultsGlobalComponent, DetailSectionTitleComponent, PrFieldHeaderComponent, FilterResultNotLinkedPipe, SaveButtonComponent],
      imports: [HttpClientTestingModule, TableModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrLinkToResultsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
