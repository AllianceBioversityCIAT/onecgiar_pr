import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepN3Component } from './step-n3.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { StepN4ReferenceMaterialLinksComponent } from '../step-n4/components/step-n4-reference-material-links/step-n4-reference-material-links.component';

describe('StepN3Component', () => {
  let component: StepN3Component;
  let fixture: ComponentFixture<StepN3Component>;
  let mockRouter: any;

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn(),
      navigateByUrl: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [StepN3Component, StepN4ReferenceMaterialLinksComponent],
      imports: [HttpClientTestingModule, CheckboxModule, CustomFieldsModule],
      providers: [
        {
          provide: Router,
          useValue: mockRouter
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StepN3Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call GETAllClarisaInnovationReadinessLevels, GETAllClarisaInnovationUseLevels, getSectionInformation, this.api.dataControlSE.detailSectionTitle with "Step 3" on ngOnInit', () => {
    const GETAllClarisaInnovationReadinessLevelsSpy = jest.spyOn(component, 'GETAllClarisaInnovationReadinessLevels');
    const GETAllClarisaInnovationUseLevelsSpy = jest.spyOn(component, 'GETAllClarisaInnovationUseLevels');
    const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');
    const detailSectionTitleSpy = jest.spyOn(component.api.dataControlSE, 'detailSectionTitle');

    component.ngOnInit();

    expect(GETAllClarisaInnovationReadinessLevelsSpy).toHaveBeenCalled();
    expect(GETAllClarisaInnovationUseLevelsSpy).toHaveBeenCalled();
    expect(getSectionInformationSpy).toHaveBeenCalled();
    expect(detailSectionTitleSpy).toHaveBeenCalledWith('Step 3');
  });

  it('should update the "open" property of response items based on the matching item in ipsrStep3Body', () => {
    const response = {
      result_ip_result_complementary: [
        { result_by_innovation_package_id: 1, open: false },
        { result_by_innovation_package_id: 2, open: false },
        { result_by_innovation_package_id: 3, open: false }
      ]
    };
    component.ipsrStep3Body = {
      result_ip_result_complementary: [
        { result_by_innovation_package_id: 1, open: true },
        { result_by_innovation_package_id: 3, open: true }
      ]
    } as any;

    component.openClosed(response);

    expect(response.result_ip_result_complementary[0].open).toBe(true);
    expect(response.result_ip_result_complementary[1].open).toBe(false);
    expect(response.result_ip_result_complementary[2].open).toBe(true);
  });

  it('should not update the "open" property of response items if ipsrStep3Body is empty', () => {
    const response = {
      result_ip_result_complementary: [
        { result_by_innovation_package_id: 1, open: false },
        { result_by_innovation_package_id: 2, open: false },
        { result_by_innovation_package_id: 3, open: false }
      ]
    };
    component.ipsrStep3Body = {
      result_ip_result_complementary: []
    } as any;

    component.openClosed(response);

    expect(response.result_ip_result_complementary[0].open).toBe(false);
    expect(response.result_ip_result_complementary[1].open).toBe(false);
    expect(response.result_ip_result_complementary[2].open).toBe(false);
  });

  it('should not update the "open" property of response items if there are no matching items in ipsrStep3Body', () => {
    const response = {
      result_ip_result_complementary: [
        { result_by_innovation_package_id: 1, open: false },
        { result_by_innovation_package_id: 2, open: false },
        { result_by_innovation_package_id: 3, open: false }
      ]
    };
    component.ipsrStep3Body = {
      result_ip_result_complementary: [
        { result_by_innovation_package_id: 4, open: true },
        { result_by_innovation_package_id: 5, open: true }
      ]
    } as any;

    component.openClosed(response);

    expect(response.result_ip_result_complementary[0].open).toBe(false);
    expect(response.result_ip_result_complementary[1].open).toBe(false);
    expect(response.result_ip_result_complementary[2].open).toBe(false);
  });

  it('should return true if readiness_level_evidence_based_index is not 0 based on this.rangesOptions', () => {
    component.rangesOptions = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const bodyItem = { readiness_level_evidence_based: 2 };
    const updateRangeLevel1 = component.updateRangeLevel1(bodyItem);
    expect(updateRangeLevel1).toBe(true);
  });

  it('should return false if readiness_level_evidence_based_index is 0 based on this.innovationUseList', () => {
    component.innovationUseList = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const bodyItem = { use_level_evidence_based: 1 };
    const updateRangeLevel2 = component.updateRangeLevel2(bodyItem);
    expect(updateRangeLevel2).toBe(false);
  });

  it('should call GETInnovationPathwayByRiId and update ipsrStep3Body, convertOrganizations, result_core_innovation on getSectionInformation', () => {
    const response = {
      result_ip_result_complementary: [
        { result_by_innovation_package_id: 1, open: false },
        { result_by_innovation_package_id: 2, open: false },
        { result_by_innovation_package_id: 3, open: false }
      ],
      innovatonUse: {
        organization: [],
        actors: []
      },
      result_core_innovation: null
    };
    const GETInnovationPathwayByRiIdSpy = jest.spyOn(component.api.resultsSE, 'GETInnovationPathwayByRiId').mockReturnValue(of({ response }));
    const openClosedSpy = jest.spyOn(component, 'openClosed');
    const convertOrganizationsSpy = jest.spyOn(component, 'convertOrganizations');

    component.getSectionInformation();

    expect(GETInnovationPathwayByRiIdSpy).toHaveBeenCalled();
    expect(openClosedSpy).toHaveBeenCalledWith(response);
    expect(convertOrganizationsSpy).toHaveBeenCalledWith(response.innovatonUse.organization);
    expect(component.result_core_innovation).toBeNull();
    expect(component.ipsrStep3Body.innovatonUse.actors.length).toBe(1);
    expect(component.ipsrStep3Body.innovatonUse.organization.length).toBe(1);
  });

  it('should return true if innoUseLevel is 0 based on this.ipsrStep3Body.result_ip_result_core.use_level_evidence_based', () => {
    component.innovationUseList = [{ id: 1 }, { id: 2 }, { id: 3 }];
    component.ipsrStep3Body = { result_ip_result_core: { use_level_evidence_based: 1 } } as any;
    const isOptionalUseLevel = component.isOptionalUseLevel();
    expect(isOptionalUseLevel).toBe(true);
  });

  it('should return false if innoUseLevel is not 0 based on this.ipsrStep3Body.result_ip_result_core.use_level_evidence_based', () => {
    component.innovationUseList = [{ id: 1 }, { id: 2 }, { id: 3 }];
    component.ipsrStep3Body = { result_ip_result_core: { use_level_evidence_based: 2 } } as any;
    const isOptionalUseLevel = component.isOptionalUseLevel();
    expect(isOptionalUseLevel).toBe(false);
  });

  it('should call PATCHInnovationPathwayByRiId and getSectionInformation on onSaveSection', () => {
    const PATCHInnovationPathwayByRiIdSpy = jest.spyOn(component.api.resultsSE, 'PATCHInnovationPathwayByRiId').mockReturnValue(of({ response: {} }));
    const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');
    const convertOrganizationsTosaveSpy = jest.spyOn(component, 'convertOrganizationsTosave');

    component.onSaveSection();

    expect(convertOrganizationsTosaveSpy).toHaveBeenCalled();
    expect(PATCHInnovationPathwayByRiIdSpy).toHaveBeenCalled();
    expect(getSectionInformationSpy).toHaveBeenCalled();
  });

  it('it should navigate to the previous page on onSaveSectionWithStep if readOnly is true and props is "previous"', () => {
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationPhase = '1';
    const navigateSpy = jest.spyOn(mockRouter, 'navigate').mockResolvedValue(true);

    component.onSaveSectionWithStep('previous');

    expect(navigateSpy).toHaveBeenCalledWith(['/ipsr/detail/null/ipsr-innovation-use-pathway/step-2'], { queryParams: { phase: '1' } });
  });

  it('it should navigate to the next page on onSaveSectionWithStep if readOnly is true and props is "next"', () => {
    component.api.rolesSE.readOnly = true;
    component.ipsrDataControlSE.resultInnovationPhase = '1';
    const navigateSpy = jest.spyOn(mockRouter, 'navigate').mockResolvedValue(true);

    component.onSaveSectionWithStep('next');

    expect(navigateSpy).toHaveBeenCalledWith(['/ipsr/detail/null/ipsr-innovation-use-pathway/step-4'], { queryParams: { phase: '1' } });
  });

  it('it should call convertOrganizationsTosave, PATCHInnovationPathwayByRiIdNextPrevius, getSectionInformation, and navigate on onSaveSectionWithStep if readOnly is false', () => {
    component.api.rolesSE.readOnly = false;
    const convertOrganizationsTosaveSpy = jest.spyOn(component, 'convertOrganizationsTosave');
    const PATCHInnovationPathwayByRiIdNextPreviusSpy = jest
      .spyOn(component.api.resultsSE, 'PATCHInnovationPathwayByRiIdNextPrevius')
      .mockReturnValue(of({}));
    const getSectionInformationSpy = jest.spyOn(component, 'getSectionInformation');
    const navigateSpy = jest.spyOn(mockRouter, 'navigate').mockResolvedValue(true);

    component.onSaveSectionWithStep('next');

    expect(convertOrganizationsTosaveSpy).toHaveBeenCalled();
    expect(PATCHInnovationPathwayByRiIdNextPreviusSpy).toHaveBeenCalled();
    expect(getSectionInformationSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('should call GETAllClarisaInnovationReadinessLevels on GETAllClarisaInnovationReadinessLevels', () => {
    const GETAllClarisaInnovationReadinessLevelsSpy = jest
      .spyOn(component.api.resultsSE, 'GETAllClarisaInnovationReadinessLevels')
      .mockReturnValue(of({ response: {} }));

    component.GETAllClarisaInnovationReadinessLevels();

    expect(GETAllClarisaInnovationReadinessLevelsSpy).toHaveBeenCalled();
  });

  it('should call GETAllClarisaInnovationUseLevels on GETAllClarisaInnovationUseLevels', () => {
    const GETAllClarisaInnovationUseLevelsSpy = jest
      .spyOn(component.api.resultsSE, 'GETAllClarisaInnovationUseLevels')
      .mockReturnValue(of({ response: {} }));

    component.GETAllClarisaInnovationUseLevels();

    expect(GETAllClarisaInnovationUseLevelsSpy).toHaveBeenCalled();
  });

  it('should return the expected HTML string on goToStep', () => {
    component.ipsrDataControlSE = {
      resultInnovationCode: '12345',
      resultInnovationPhase: '1'
    } as any;

    const result = component.goToStep();

    expect(result)
      .toBe(`<li>In case you want to add one more complementary innovation/enabler/solution <a class='open_route' href='/ipsr/detail/12345/ipsr-innovation-use-pathway/step-2/complementary-innovation?phase=${component.ipsrDataControlSE.resultInnovationPhase}' target='_blank'> Go to step 2</a></li>
        <li><strong>YOUR READINESS AND USE SCORES IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a> AND <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>`);
  });

  it('should return the expected string on readinessLevelSelfAssessmentText', () => {
    const result = component.readinessLevelSelfAssessmentText();
    expect(result).toBe(`
    <li><a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">Click here</a>  to see all innovation readiness levels</li>
    <li><strong>YOUR READINESS SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-readiness-headless/" class="open_route" target="_blank">READINESS CALCULATOR</a>.</strong></li>
    `);
  });

  it('should return the expected string on useLevelDelfAssessment', () => {
    const result = component.useLevelDelfAssessment();
    expect(result)
      .toBe(`<li><a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">Click here</a> to see all innovation use levels</li>
    <li><strong>YOUR USE SCORE IN JUST 3 CLICKS: TRY THE NEW <a href="https://www.scalingreadiness.org/calculator-use-headless/" class="open_route" target="_blank">USE CALCULATOR</a>.</strong></li>`);
  });

  it('should call map on convertOrganizations', () => {
    const organizations = [
      { id: 1, parent_institution_type_id: 1 },
      { id: 2, parent_institution_type_id: 2 },
      { id: 3, parent_institution_type_id: 3 }
    ];
    const mapSpy = jest.spyOn(organizations, 'map');

    component.convertOrganizations(organizations);

    expect(mapSpy).toHaveBeenCalled();
  });

  it('should call map on convertOrganizationsTosave', () => {
    const organizations = [
      { id: 1, institution_sub_type_id: 1 },
      { id: 2, institution_sub_type_id: 2 },
      { id: 3, institution_sub_type_id: 3 }
    ];
    component.ipsrStep3Body = {
      innovatonUse: {
        organization: organizations
      }
    } as any;
    const mapSpy = jest.spyOn(organizations, 'forEach');

    component.convertOrganizationsTosave();

    expect(mapSpy).toHaveBeenCalled();
  });

  it('should return the expected url string on resultUrl', () => {
    const url = component.resultUrl('12345', '1');
    expect(url).toBe('/result/result-detail/12345/general-information?phase=1');
  });
});
