import { HttpStatus, Injectable } from '@nestjs/common';
import {
  GetValidationSectionInnoPckgDto,
  GreenchecksResponse,
} from './dto/get-validation-section-inno-pckg.dto';
import { IpsrRepository } from '../ipsr.repository';
import { ResultRepository } from '../../results/result.repository';
import { ResultsInnovationPackagesValidationModuleRepository } from './results-innovation-packages-validation-module.repository';
import { DataSource } from 'typeorm';
import { Result } from '../../results/entities/result.entity';
import { ValidationMapsEnum } from '../../results/results-validation-module/enum/validation-maps.enum';

@Injectable()
export class ResultsInnovationPackagesValidationModuleService {
  private readonly nameMappers = {
    [ValidationMapsEnum.GENERAL_INFORMATION]: 'General Information',
    [ValidationMapsEnum.CONTRIBUTOR_PARTNERS]: 'Contributors',
  };
  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _ipsrReposotory: IpsrRepository,
    private readonly _resultInnovationPackageValidationModuleRepository: ResultsInnovationPackagesValidationModuleRepository,
    private readonly _dataSource: DataSource,
  ) { }

  async getGreenchecksByinnovationPackage(
    resultId: number,
  ): Promise<GreenchecksResponse> {
    try {
      const resultExist = await this._resultRepository.findOneBy({
        id: resultId,
        is_active: true,
      });
      const ipExist = await this._ipsrReposotory.findOneBy({
        result_innovation_package_id: resultId,
        ipsr_role_id: 1,
        is_active: true,
      });

      if (!ipExist || !resultExist) {
        return {
          response: {
            mainSection: [],
            stepSections: [],
            validResult: 0,
          },
          message: 'Innovation package not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const gi =
        await this._resultInnovationPackageValidationModuleRepository.generalInformation(
          resultId,
        );
      const contributors =
        await this._resultInnovationPackageValidationModuleRepository.contributors(
          resultId,
        );
      const stepOne: GetValidationSectionInnoPckgDto =
        await this._resultInnovationPackageValidationModuleRepository.stepOne(
          resultId,
        );
      const stepTwo: GetValidationSectionInnoPckgDto =
        await this._resultInnovationPackageValidationModuleRepository.stepTwo(
          resultId,
        );
      const stepThree: GetValidationSectionInnoPckgDto =
        await this._resultInnovationPackageValidationModuleRepository.stepThree(
          resultId,
        );
      const stepFour: GetValidationSectionInnoPckgDto =
        await this._resultInnovationPackageValidationModuleRepository.stepFour(
          resultId,
        );
      const pathway = {
        sectionName: 'IPSR Innovation use pathway',
        validation:
          parseInt(stepOne?.validation) &&
          parseInt(stepTwo?.validation) &&
          parseInt(stepThree?.validation) &&
          parseInt(stepFour?.validation),
      };
      const links =
        this._resultInnovationPackageValidationModuleRepository.links();

      const validResult =
        parseInt(gi?.validation) &&
        parseInt(contributors?.validation) &&
        pathway?.validation &&
        parseInt(links?.validation);

      return {
        response: {
          mainSection: [gi, contributors, pathway, links],
          stepSections: [stepOne, stepTwo, stepThree, stepFour],
          validResult,
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return {
        response: {
          mainSection: [],
          stepSections: [],
          validResult: 0,
        },
        message: error,
        status: HttpStatus.BAD_REQUEST,
      };
    }
  }

  async getGreenchecksByinnovationPackageSPV2(resultId: number) {
    try {
      const result = await this._dataSource.getRepository(Result).findOne({
        where: {
          id: Number(resultId),
          is_active: true,
        },
        relations: {
          obj_version: {
            obj_portfolio: true,
          },
        },
      });

      if (!result) {
        return {
          response: {
            mainSection: [],
            stepSections: [],
            validResult: 0,
          },
          message: 'Result not found',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      const pathway = [];
      const sectionsTwo: ValidationMapsEnum[] = [
        ValidationMapsEnum.IPSR_STEP_TWO_ONE,
        ValidationMapsEnum.IPSR_STEP_TWO_TWO,
      ];

      const responsePathwayStepTwo =
        await this._resultInnovationPackageValidationModuleRepository.queryValidation(
          resultId,
          sectionsTwo,
        );
      const formatStepTwo = responsePathwayStepTwo.map((item) => ({
        subSection: item.section_name.split(' ')?.[1],
        sectionName: item.section_name,
        validation: Boolean(Number(item.validation)),
      }));

      const baseStepTwo = {
        step: 2,
        sectionName: 'Step 2',
        validation: formatStepTwo.reduce(
          (acc, item) => acc && item.validation,
          true,
        ),
        stepSubSections: formatStepTwo,
      };

      const sectionsOtherSteps: ValidationMapsEnum[] = [
        ValidationMapsEnum.IPSR_STEP_ONE,
        ValidationMapsEnum.IPSR_STEP_FOUR,
        ValidationMapsEnum.IPSR_STEP_THREE,
      ];
      const responsePathwayOtherSteps =
        await this._resultInnovationPackageValidationModuleRepository.queryValidation(
          resultId,
          sectionsOtherSteps,
        );
      const baseOtherSteps = responsePathwayOtherSteps.map((item) => ({
        step: Number(item.section_name.split(' ')?.[1]),
        sectionName: item.section_name,
        validation: Boolean(Number(item.validation)),
      }));

      pathway.push(baseStepTwo);
      pathway.push(...baseOtherSteps);

      const commonSections = [
        ValidationMapsEnum.GENERAL_INFORMATION,
        ValidationMapsEnum.CONTRIBUTOR_PARTNERS,
      ];
      const responseCommonSections =
        await this._resultInnovationPackageValidationModuleRepository.queryValidation(
          resultId,
          commonSections,
        );
      const formatCommonSections = responseCommonSections.map((item) => ({
        sectionName: this.nameMappers?.[item.section_name],
        validation: Boolean(Number(item.validation)),
      }));

      formatCommonSections.push({
        sectionName: 'IPSR Innovation use pathway',
        validation: pathway.reduce((acc, item) => acc && item.validation, true),
      });

      return {
        response: {
          mainSection: formatCommonSections,
          stepSections: pathway.sort((a, b) => a.step - b.step),
          validResult: formatCommonSections.reduce(
            (acc, item) => acc && item.validation,
            true,
          ),
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return {
        response: {
          mainSection: [],
          stepSections: [],
          validResult: 0,
        },
        message: error,
        status: HttpStatus.BAD_REQUEST,
      };
    }
  }

  async getGreenchecksByinnovationPackageV2(
    resultId: number,
  ): Promise<GreenchecksResponse> {
    try {
      const resultExist = await this._resultRepository.findOneBy({
        id: resultId,
        is_active: true,
      });
      const ipExist = await this._ipsrReposotory.findOneBy({
        result_innovation_package_id: resultId,
        ipsr_role_id: 1,
        is_active: true,
      });

      if (!ipExist || !resultExist) {
        return {
          response: {
            mainSection: [],
            stepSections: [],
            validResult: 0,
          },
          message: 'Innovation package not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const gi =
        await this._resultInnovationPackageValidationModuleRepository.generalInformationV2(
          resultId,
        );
      const contributors =
        await this._resultInnovationPackageValidationModuleRepository.contributors(
          resultId,
        );
      const stepOne: GetValidationSectionInnoPckgDto =
        await this._resultInnovationPackageValidationModuleRepository.stepOne(
          resultId,
        );
      const stepTwo: GetValidationSectionInnoPckgDto =
        await this._resultInnovationPackageValidationModuleRepository.stepTwo(
          resultId,
        );
      const stepThree: GetValidationSectionInnoPckgDto =
        await this._resultInnovationPackageValidationModuleRepository.stepThree(
          resultId,
        );
      const stepFour: GetValidationSectionInnoPckgDto =
        await this._resultInnovationPackageValidationModuleRepository.stepFour(
          resultId,
        );
      const pathway = {
        sectionName: 'IPSR Innovation use pathway',
        validation:
          parseInt(stepOne?.validation) &&
          parseInt(stepTwo?.validation) &&
          parseInt(stepThree?.validation) &&
          parseInt(stepFour?.validation),
      };
      const links =
        this._resultInnovationPackageValidationModuleRepository.links();

      const validResult =
        parseInt(gi?.validation) &&
        parseInt(contributors?.validation) &&
        pathway?.validation &&
        parseInt(links?.validation);

      return {
        response: {
          mainSection: [gi, contributors, pathway, links],
          stepSections: [stepOne, stepTwo, stepThree, stepFour],
          validResult,
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return {
        response: {
          mainSection: [],
          stepSections: [],
          validResult: 0,
        },
        message: error,
        status: HttpStatus.BAD_REQUEST,
      };
    }
  }
}
