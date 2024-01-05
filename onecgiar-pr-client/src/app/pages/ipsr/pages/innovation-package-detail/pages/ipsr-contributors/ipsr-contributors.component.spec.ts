import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { IpsrContributorsComponent } from './ipsr-contributors.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { IpsrContributorsCentersComponent } from './components/ipsr-contributors-centers/ipsr-contributors-centers.component';
import { PrMultiSelectComponent } from '../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('IpsrContributorsComponent', () => {
  let component: IpsrContributorsComponent;
  let fixture: ComponentFixture<IpsrContributorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IpsrContributorsComponent, SaveButtonComponent, IpsrContributorsCentersComponent, PrMultiSelectComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
