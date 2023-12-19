import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdLinksToResultsComponent } from './rd-links-to-results.component';
import { LinksToResultsGlobalComponent } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterResultNotLinkedPipe } from './pipe/filter-result-not-linked.pipe';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { TableModule } from 'primeng/table';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
describe('RdLinksToResultsComponent', () => {
  let component: RdLinksToResultsComponent;
  let fixture: ComponentFixture<RdLinksToResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        RdLinksToResultsComponent,
        LinksToResultsGlobalComponent,
        FilterResultNotLinkedPipe,
        PrFieldHeaderComponent,
        SaveButtonComponent,
        DetailSectionTitleComponent
      ],
      imports: [
        HttpClientTestingModule,
        TableModule
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RdLinksToResultsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
