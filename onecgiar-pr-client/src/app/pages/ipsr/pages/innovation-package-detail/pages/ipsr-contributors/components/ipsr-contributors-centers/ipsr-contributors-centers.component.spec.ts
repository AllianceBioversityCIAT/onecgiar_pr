import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrContributorsCentersComponent } from './ipsr-contributors-centers.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrMultiSelectComponent } from '../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { FormsModule } from '@angular/forms';

describe('IpsrContributorsCentersComponent', () => {
  let component: IpsrContributorsCentersComponent;
  let fixture: ComponentFixture<IpsrContributorsCentersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        IpsrContributorsCentersComponent,
        PrMultiSelectComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule,
        FormsModule
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(IpsrContributorsCentersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('validatePrimarySelection', () => {
    it('should call validatePrimarySelection correctly', () => {
      component.contributorsBody.contributing_center = [{ primary: true, code: '', name: 'name' }];

      component.validatePrimarySelection();

      expect(component.contributorsBody.contributing_center[0].primary).toBeTruthy();
    });
  });

  describe('addPrimary', () => {
    it('should call addPrimary correctly', () => {
      const center = { primary: true, code: '', name: 'name' };
      component.contributorsBody.contributing_center = [center];

      component.addPrimary(center);

      expect(component.contributorsBody.contributing_center[0].primary).toBeTruthy();
    });
  });

  describe('deletContributingCenter', () => {
    it('should call deletContributingCenter correctly', () => {
      const index = 0;
      component.contributorsBody.contributing_center = [{ primary: true, code: '', name: 'name' }];

      component.deletContributingCenter(index);

      expect(component.contributorsBody.contributing_center.length).toBe(0);
    });
  });
});
