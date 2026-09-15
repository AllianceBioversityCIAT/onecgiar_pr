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

    // P2-3621: the flags alone were not enough — the stale regions/countries stayed in the model,
    // were only hidden by the template, and reappeared on their own when the user came back to a
    // scope that renders that same field.
    it('should clear both lists when the scope becomes Global or yet-to-be-determined', () => {
      [GeoScopeEnum.GLOBAL, GeoScopeEnum.DETERMINED].forEach(scope => {
        component.body.regions = [{ id: 2 }];
        component.body.countries = [{ code: 4, name: 'Afghanistan' }];
        component.body.geo_scope_id = scope;

        component.resetHasScope();

        expect(component.body.regions).toEqual([]);
        expect(component.body.countries).toEqual([]);
      });
    });

    it('should clear only the countries when the scope becomes Regional', () => {
      component.body.regions = [{ id: 2 }];
      component.body.countries = [{ code: 4, name: 'Afghanistan' }];
      component.body.geo_scope_id = GeoScopeEnum.REGIONAL;

      component.resetHasScope();

      expect(component.body.countries).toEqual([]);
      expect(component.body.regions).toEqual([{ id: 2 }]);
    });

    it('should clear only the regions when the scope becomes Country or Sub-national', () => {
      [GeoScopeEnum.COUNTRY, GeoScopeEnum.SUB_NATIONAL].forEach(scope => {
        component.body.regions = [{ id: 2 }];
        component.body.countries = [{ code: 4, name: 'Afghanistan' }];
        component.body.geo_scope_id = scope;

        component.resetHasScope();

        expect(component.body.regions).toEqual([]);
        expect(component.body.countries).toEqual([{ code: 4, name: 'Afghanistan' }]);
      });
    });

    // Guard 1: clicking an already-selected radio emits null (see pr-radio-button onSelect).
    // A default branch here would wipe both lists on that single accidental click.
    it('should leave both lists untouched when the scope is cleared to null', () => {
      component.body.regions = [{ id: 2 }];
      component.body.countries = [{ code: 4, name: 'Afghanistan' }];
      component.body.has_regions = true;
      component.body.geo_scope_id = null;

      component.resetHasScope();

      expect(component.body.regions).toEqual([{ id: 2 }]);
      expect(component.body.countries).toEqual([{ code: 4, name: 'Afghanistan' }]);
      expect(component.body.has_regions).toBe(true);
    });

    // Guard 2: Country and Sub-national share a branch, so clearing sub_national here would drop
    // the per-country detail the user just typed while switching between those two scopes.
    it('should keep the sub_national rows when moving from Country to Sub-national', () => {
      component.body.countries = [{ code: 4, name: 'Afghanistan', sub_national: [{ id: 77 }] }];
      component.body.geo_scope_id = GeoScopeEnum.SUB_NATIONAL;

      component.resetHasScope();

      expect(component.body.countries[0].sub_national).toEqual([{ id: 77 }]);
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
      // P2-3622: the level has to be set for the real level to win over the `Result` fallback —
      // these two cases describe a route that KNOWS its level, and the fallback exists for the one
      // that does not (covered in its own describe below).
      component.resultLevelSE.currentResultLevelName = 'Some someWord';
      jest.spyOn(component.api.dataControlSE, 'getLastWord').mockReturnValue('someWord');

      const label = component.labelRadioButtons;

      expect(label).toBe(`What is the main geographic focus of the someWord?`);
      expect(component.api.dataControlSE.getLastWord).toHaveBeenCalledWith('Some someWord');
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
      // P2-3622: see the note above — a known level must still be the one that renders.
      component.resultLevelSE.currentResultLevelName = 'Some someWord';
      jest.spyOn(component.api.dataControlSE, 'getLastWord').mockReturnValue('someWord');

      const description = component.descriptionRadioButtons;

      expect(description).toBe(`This should reflect where the <strong>someWord</strong> has taken place/contributed to benefit.`);
      expect(component.api.dataControlSE.getLastWord).toHaveBeenCalledWith('Some someWord');
    });
    it('should return undefined when the module is not REPORTING', () => {
      component.internalModule = AppModuleEnum.getFromName(ModuleTypeEnum.ALL);

      const description = component.descriptionRadioButtons;

      expect(description).toBeUndefined();
    });
  });
});

/**
 * P2-3622 — the helper texts name the kind of result they talk about, and that name is written in
 * one place only (`current-result.service.ts`, inside `GET_resultById()`), reachable solely from
 * the result-detail tree. The bilateral review drawer renders this component with
 * `module="reporting"` on a route that never calls it, so the name was null and the sentences
 * rendered with a hole: "where the  has taken place", "specify for this ?".
 *
 * 🛑 The second test is the one that matters for regressions: W1/W2 DOES know the level and must
 * keep saying it. A fallback that overwrote a known level would fix the drawer by breaking the
 * form that works.
 */
describe('GeoscopeManagementComponent — the helper texts always name something (P2-3622)', () => {
  let component: GeoscopeManagementComponent;
  let fixture: ComponentFixture<GeoscopeManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GeoscopeManagementComponent, PrRadioButtonComponent, PrFieldHeaderComponent],
      imports: [HttpClientTestingModule, FormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(GeoscopeManagementComponent);
    component = fixture.componentInstance;
    component.internalModule = { name: ModuleTypeEnum.REPORTING, value: 1 };
  });

  it('falls back to "Result" when the route never set the result level', () => {
    component.resultLevelSE.currentResultLevelName = null;

    expect(component.resultLevelWord).toBe('Result');
    expect(component.descriptionRadioButtons).toContain('where the <strong>Result</strong> has taken place');
    expect(component.descriptionRadioButtons).not.toContain('<strong></strong>');
  });

  it('keeps using the real level when the route did set it', () => {
    component.resultLevelSE.currentResultLevelName = 'Output';

    expect(component.resultLevelWord).toBe('Output');
    expect(component.descriptionRadioButtons).toContain('where the <strong>Output</strong> has taken place');
  });

  it('never leaves the sentence with an empty slot, whatever the level is', () => {
    for (const level of [null, undefined, '', '   ', 'Outcome', 'Impact Area']) {
      component.resultLevelSE.currentResultLevelName = level as any;

      expect(component.resultLevelWord.trim()).not.toBe('');
      expect(component.descriptionRadioButtons).not.toContain('<strong></strong>');
    }
  });
});
