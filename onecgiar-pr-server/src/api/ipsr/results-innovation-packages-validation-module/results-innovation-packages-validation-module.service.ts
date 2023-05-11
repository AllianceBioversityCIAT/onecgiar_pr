import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateResultsInnovationPackagesValidationModuleDto } from './dto/create-results-innovation-packages-validation-module.dto';
import { UpdateResultsInnovationPackagesValidationModuleDto } from './dto/update-results-innovation-packages-validation-module.dto';
import { GetValidationSectionInnoPckgDto, GreenchecksResponse } from './dto/get-validation-section-inno-pckg.dto';
import { IpsrRepository } from '../ipsr.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { ResultsInnovationPackagesValidationModuleRepository } from './results-innovation-packages-validation-module.repository';

@Injectable()
export class ResultsInnovationPackagesValidationModuleService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _ipsrReposotory: IpsrRepository,
    private readonly _resultInnovationPackageValidationModuleRepository: ResultsInnovationPackagesValidationModuleRepository,
  ) { }

  async getGreenchecksByinnovationPackage(resultId: number): Promise<GreenchecksResponse> {
    try {
      const resultExist = await this._resultRepository.findOneBy({ id: resultId, is_active: true });
      const ipExist = await this._ipsrReposotory.findOneBy({ result_innovation_package_id: resultId, ipsr_role_id: 1, is_active: true });
      if (!resultExist) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      if (!ipExist) {
        throw {
          response: {},
          message: 'Innovation package Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      let response: GetValidationSectionInnoPckgDto[] = [];

      const gi = await this._resultInnovationPackageValidationModuleRepository.generalInformation(resultId);
      const contributors = await this._resultInnovationPackageValidationModuleRepository.contributors(resultId);
      const stepOne: GetValidationSectionInnoPckgDto = await this._resultInnovationPackageValidationModuleRepository.stepOne(resultId);
      const stepTwo: GetValidationSectionInnoPckgDto = await this._resultInnovationPackageValidationModuleRepository.stepTwo(resultId);
      const stepThree: GetValidationSectionInnoPckgDto = await this._resultInnovationPackageValidationModuleRepository.stepThree(resultId);
      const stepFour: GetValidationSectionInnoPckgDto = await this._resultInnovationPackageValidationModuleRepository.stepFour(resultId);
      const pathway = {
        sectionName: 'IPSR Innovation use pathway',
        validation: parseInt(stepOne?.validation) && parseInt(stepTwo?.validation) && parseInt(stepThree?.validation) && parseInt(stepFour?.validation),
      }
      const links = this._resultInnovationPackageValidationModuleRepository.links();

      const validResult = parseInt(gi?.validation) && parseInt(contributors?.validation) && pathway?.validation && parseInt(links?.validation)

      return {
        response: {
          mainSection: [
            gi,
            contributors,
            pathway,
            links
          ],
          stepSections: [
            stepOne,
            stepTwo,
            stepThree,
            stepFour
          ],
          validResult
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return {
        response: {
          mainSection: [],
          stepSections: [
          ],
          validResult:  0
        },
        message: error,
        status: HttpStatus.BAD_REQUEST,
      };
    }
  }

  // async innovationPackageValidation(resultId: number) {
  //   try {
  //     const validation: GreenchecksResponse = await this.getGreenchecksByinnovationPackage(resultId);

  //     return {
  //       message: 'Sections have been successfully validated',
  //       status: HttpStatus.OK,
  //     };
  //   } catch (error) {
  //     return this._handlersError.returnErrorRes(error);
  //   }
  // }


}