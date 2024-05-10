import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalCompletenessStatusComponent } from './global-completeness-status.component';
import { HttpClientModule } from '@angular/common/http';
import { FilterInitWithRoleCoordAndLeadModule } from '../../../pages/init-admin-section/pipes/filter-init-with-role-coord-and-lead/filter-init-with-role-coord-and-lead.module';
import { FilterByTextModule } from '../../pipes/filter-by-text.module';
import { PrMultiSelectComponent } from '../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrButtonComponent } from '../../../custom-fields/pr-button/pr-button.component';
import { TableModule } from 'primeng/table';
import { ResultHistoryOfChangesModalComponent } from '../../../pages/admin-section/pages/completeness-status/components/result-history-of-changes-modal/result-history-of-changes-modal.component';
import { FormsModule } from '@angular/forms';
import { ListFilterByTextAndAttrPipe } from '../../../custom-fields/pr-multi-select/pipes/list-filter-by-text-and-attr.pipe';
import { PrFieldHeaderComponent } from '../../../custom-fields/pr-field-header/pr-field-header.component';
import { DialogModule } from 'primeng/dialog';

describe('GlobalCompletenessStatusComponent', () => {
  let component: GlobalCompletenessStatusComponent;
  let fixture: ComponentFixture<GlobalCompletenessStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        GlobalCompletenessStatusComponent,
        PrMultiSelectComponent,
        PrButtonComponent,
        ResultHistoryOfChangesModalComponent,
        ListFilterByTextAndAttrPipe,
        PrFieldHeaderComponent
      ],
      imports: [HttpClientModule, FilterInitWithRoleCoordAndLeadModule, FilterByTextModule, TableModule, DialogModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalCompletenessStatusComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
