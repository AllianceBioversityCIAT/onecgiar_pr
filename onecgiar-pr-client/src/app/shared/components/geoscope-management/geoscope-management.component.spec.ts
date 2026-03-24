import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GeoscopeManagementComponent } from './geoscope-management.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrRadioButtonComponent } from '../../../custom-fields/pr-radio-button/pr-radio-button.component';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../custom-fields/pr-field-header/pr-field-header.component';
import { GeoScopeEnum } from '../../enum/geo-scope.enum';
import { ModuleTypeEnum } from '../../enum/api.enum';
import { AppModuleEnum } from '../../enum/app-module.enum';

describe('GeoscopeManagementComponent', () => {
  let component: GeoscopeManagementComponent;
  let fixture: ComponentFixture<GeoscopeManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GeoscopeManagementComponent, PrRadioButtonComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(GeoscopeManagementComponent);
    component = fixture.componentInstance;
    component.internalModule = {
      name: 'module',
      value: 1
    };
  });

  describe('resetHasScope', () => {
    it('should reset hasScope based on geo_scope_id', () => {
      component.body.geo_scope_id = GeoScopeEnum.DETERMINED;
      component.resetHasScope();
      expect(component.body.has_countries).toBeFalsy();
      expect(component.body.has_regions).toBeFalsy();

      component.body.geo_scope_id = GeoScopeEnum.REGIONAL;
      component.resetHasScope();
      expect(component.body.has_countries).toBeFalsy();
      expect(component.body.has_regions).toBeTruthy();

      component.body.geo_scope_id = GeoScopeEnum.COUNTRY;
      component.resetHasScope();
      expect(component.body.has_countries).toBeTruthy();
      expect(component.body.has_regions).toBeFalsy();
    });
  });

  describe('geographic_focus_description', () => {
    it('should return description for geographic focus id 2', () => {
      const description = component.geographic_focus_description(2);
      expect(description).toBe(
        'For region, multiple regions can be selected, unless the selection adds up to every region, in which case global should be selected.'
      );
    });
    it('should return description for geographic focus id 3', () => {
      const description = component.geographic_focus_description(3);
      expect(description).toBe(
        'For country, multiple countries can be selected, unless the selection adds up to a specific region, or set of regions, or global, in which case, region or global should be selected.'
      );
    });
    it('should return empty string for unknown geographic focus id', () => {
      const description = component.geographic_focus_description(1);
      expect(description).toBe('');
    });
  });

  describe('saveFormatData', () => {
    it('should reset countries if geo_scope_id is REGIONAL', () => {
      component.body.geo_scope_id = GeoScopeEnum.REGIONAL;
      component.saveFormatData();

      expect(component.body.countries).toEqual([]);
    });
    it('should reset regions and sub_national if geo_scope_id is COUNTRY', () => {
      component.body.geo_scope_id = GeoScopeEnum.COUNTRY;
      component.body.countries = [{ sub_national: [{ name: 'Subnational Area' }] }];
      component.saveFormatData();

      expect(component.body.regions).toEqual([]);
      expect(component.body.countries[0].sub_national).toEqual([]);
    });
    it('should reset regions and sub_national if geo_scope_id is SUB_NATIONAL', () => {
      component.body.geo_scope_id = GeoScopeEnum.SUB_NATIONAL;
      component.body.countries = [{ sub_national: [{ name: 'Subnational Area' }] }];
      component.saveFormatData();

      expect(component.body.regions).toEqual([]);
      expect(component.body.countries[0].sub_national).toEqual([]);
    });
    it('should reset regions and countries if geo_scope_id is neither REGIONAL, COUNTRY nor SUB_NATIONAL', () => {
      component.body.geo_scope_id = GeoScopeEnum.DETERMINED;
      component.body.regions = [{ name: 'Region' }];
      component.body.countries = [{ name: 'Country' }];
      component.saveFormatData();

      expect(component.body.regions).toEqual([]);
      expect(component.body.countries).toEqual([]);
    });
  });

  describe('includesScope', () => {
    it('should return true if geo_scope_id is included in the provided ids', () => {
      component.body.geo_scope_id = GeoScopeEnum.REGIONAL;
      const result = component.includesScope([GeoScopeEnum.REGIONAL, GeoScopeEnum.COUNTRY]);

      expect(result).toBeTruthy();
    });
  });

  describe('thereAnyText', () => {
    it('should return the correct string for countries', () => {
      const result = component.thereAnyText(true);
      const expectedString =
        "The list of countries below follows the <a href='https://www.iso.org/iso-3166-country-codes.html' class=\"open_route\" target='_blank'>ISO 3166<a> standard";

      expect(result).toBe(expectedString);
    });
    it('should return the correct string for regions', () => {
      const result = component.thereAnyText(false);
      const expectedString =
        "The list of regions below follows the <a href='https://unstats.un.org/unsd/methodology/m49/' class=\"open_route\" target='_blank'>UN (M.49)<a> standard";

      expect(result).toBe(expectedString);
    });
  });

  describe('ngOnInit', () => {
    it('should set geoscopeOptions with an additional option when module is REPORTING', () => {
      component.module = ModuleTypeEnum.REPORTING;

      component.ngOnInit();

      expect(component.internalModule).toBeDefined();
      expect(component.geoscopeOptions).toContainEqual({
        full_name: 'This is yet to be determined',
        id: 50
      });
    });
  });

  describe('labelRadioButtons', () => {
    it('should return the correct label when the module is REPORTING', () => {
      component.internalModule = AppModuleEnum.getFromName(ModuleTypeEnum.REPORTING);
      jest.spyOn(component.api.dataControlSE, 'getLastWord').mockReturnValue('someWord');

      const label = component.labelRadioButtons;

      expect(label).toBe(`What is the main geographic focus of the someWord?`);
      expect(component.api.dataControlSE.getLastWord).toHaveBeenCalledWith(component.resultLevelSE.currentResultLevelName);
    });
    it('should return the correct label when the module is not REPORTING', () => {
      component.internalModule = AppModuleEnum.getFromName(ModuleTypeEnum.ALL);

      const label = component.labelRadioButtons;

      expect(label).toBe('Select country/ geoscope for which packaging and scaling readiness assessment will be conducted');
    });
  });

  describe('descriptionRadioButtons', () => {
    it('should return the correct description when the module is REPORTING', () => {
      component.internalModule = AppModuleEnum.getFromName(ModuleTypeEnum.REPORTING);
      jest.spyOn(component.api.dataControlSE, 'getLastWord').mockReturnValue('someWord');

      const description = component.descriptionRadioButtons;

      expect(description).toBe(`This should reflect where the <strong>someWord</strong> has taken place/contributed to benefit.`);
      expect(component.api.dataControlSE.getLastWord).toHaveBeenCalledWith(component.resultLevelSE.currentResultLevelName);
    });
    it('should return undefined when the module is not REPORTING', () => {
      component.internalModule = AppModuleEnum.getFromName(ModuleTypeEnum.ALL);

      const description = component.descriptionRadioButtons;

      expect(description).toBeUndefined();
    });
  });
});
