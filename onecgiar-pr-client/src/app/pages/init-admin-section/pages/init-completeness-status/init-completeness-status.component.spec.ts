import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InitCompletenessStatusComponent } from './init-completeness-status.component';
import { GlobalCompletenessStatusComponent } from '../../../../shared/components/global-completeness-status/global-completeness-status.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterInitWithRoleCoordAndLeadPipe } from '../../pipes/filter-init-with-role-coord-and-lead/filter-init-with-role-coord-and-lead.pipe';
import { FilterByTextPipe } from '../../../../shared/pipes/filter-by-text.pipe';
import { PrButtonComponent } from '../../../../custom-fields/pr-button/pr-button.component';
import { FormsModule } from '@angular/forms';
import { PrMultiSelectComponent } from '../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { ListFilterByTextAndAttrPipe } from '../../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { PrFieldHeaderComponent } from '../../../../custom-fields/pr-field-header/pr-field-header.component';
import { ResultHistoryOfChangesModalComponent } from '../../../../pages/admin-section/pages/completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.component';

describe('InitCompletenessStatusComponent', () => {
  let component: InitCompletenessStatusComponent;
  let fixture: ComponentFixture<InitCompletenessStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        InitCompletenessStatusComponent,
        GlobalCompletenessStatusComponent,
        FilterInitWithRoleCoordAndLeadPipe,
        FilterByTextPipe,
        PrButtonComponent,
        PrMultiSelectComponent,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent,
        ResultHistoryOfChangesModalComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        ScrollingModule,
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(InitCompletenessStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
