import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IpsrGeoscopeCreatorComponent } from './ipsr-geoscope-creator.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrRadioButtonComponent } from '../../../../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
describe('IpsrGeoscopeCreatorComponent', () => {
  let component: IpsrGeoscopeCreatorComponent;
  let fixture: ComponentFixture<IpsrGeoscopeCreatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        IpsrGeoscopeCreatorComponent,
        PrRadioButtonComponent,
        PrFieldHeaderComponent
      ],
      imports: [
        HttpClientTestingModule
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(IpsrGeoscopeCreatorComponent);
    component = fixture.componentInstance;
    component.body = {
      countries: [
        {
          name: 'name'
        }
      ]
    };
  });

  describe('selectRegionsDescription', () => {
    it('should return the correct description for selectRegions', () => {
      const expectedDescription =
        'The list of regions below follows the UN <a class="open_route" href="https://unstats.un.org/unsd/methodology/m49/" target=\'_blank\'>(M.49)</a> standard';

      const actualDescription = component.selectRegionsDescription;

      expect(actualDescription).toEqual(expectedDescription);
    });
  });

  describe('selectRegionsDescription', () => {
    it('should add an item to sub_scope array on onClicked()', () => {
      const initialLength = component.sub_scope.length;

      component.onClicked();

      expect(component.sub_scope.length).toBe(initialLength + 1);
    });
  });

  describe('cleanSubNationals', () => {
    it('should clean sub_scope array on cleanSubNationals()', () => {
      component.sub_scope = [{}];

      component.cleanSubNationals();

      expect(component.sub_scope.length).toBe(0);
    });
  });

  describe('deleteItem', () => {
    it('should delete an item from sub_scope array on deleteItem()', () => {
      component.sub_scope = [{}];
      const indexToDelete = 0;

      component.deleteItem(indexToDelete);

      expect(component.sub_scope).toEqual([]);
    });
  });

  describe('descriptionGeoScope', () => {
    it('descriptionGeoScope should return the expected string', () => {
      const description = component.descriptionGeoScope();

      expect(description).toContain('Select country/ geoscope for which innovation packaging and scaling readiness assessment will be conducted.');
      expect(description).toContain('Please note that geoscope cannot be changed after innovation package creation.');
      expect(description).toContain('To optimize the effectiveness of innovation packages, it is strongly advised to tailor them to specific contexts or geographies. If your intention is to design innovation packages for multiple countries or regions, it is crucial to consider creating separate packages for each geolocation.');
    });
  });

});
