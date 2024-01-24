import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrNonPooledProjectsComponent } from './ipsr-non-pooled-projects.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoDataTextComponent } from '../../../../../../../../custom-fields/no-data-text/no-data-text.component';
import { PrFieldHeaderComponent } from '../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('IpsrNonPooledProjectsComponent', () => {
  let component: IpsrNonPooledProjectsComponent;
  let fixture: ComponentFixture<IpsrNonPooledProjectsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ 
        IpsrNonPooledProjectsComponent,
        NoDataTextComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(IpsrNonPooledProjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('deleteEvidence', () => {
    it('should delete evidence from contributing_np_projects array', () => {
      component.contributorsBody.contributing_np_projects = [{
        funder: 1, 
        grant_title: '', 
        center_grant_id: '', 
        lead_center: ''
      }];
  
      component.deleteEvidence(0);
  
      expect(component.contributorsBody.contributing_np_projects).toEqual([]);
    });
  });

  describe('addBilateralContribution', () => {
    it('should add a new donorInterfaceToc to contributing_np_projects array', () => {
      const initialLength = component.contributorsBody.contributing_np_projects.length;
  
      component.addBilateralContribution();
  
      expect(component.contributorsBody.contributing_np_projects.length).toBe(initialLength + 1);
      expect(component.contributorsBody.contributing_np_projects[initialLength]).toEqual({
        funder: null, 
        grant_title: null, 
        center_grant_id: null, 
        lead_center: null
      });
    });
  });
});
