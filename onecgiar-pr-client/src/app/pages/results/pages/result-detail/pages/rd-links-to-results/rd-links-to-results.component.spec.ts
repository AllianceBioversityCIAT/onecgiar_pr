import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RdLinksToResultsComponent } from './rd-links-to-results.component';
import { LinksToResultsGlobalComponent } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterResultNotLinkedPipe } from './pipe/filter-result-not-linked.pipe';

describe('RdLinksToResultsComponent', () => {
  let component: RdLinksToResultsComponent;
  let fixture: ComponentFixture<RdLinksToResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        RdLinksToResultsComponent,
        LinksToResultsGlobalComponent,
        FilterResultNotLinkedPipe
      ],
      imports: [
        HttpClientTestingModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RdLinksToResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
