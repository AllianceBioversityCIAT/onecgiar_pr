import { Injectable, HttpStatus } from '@nestjs/common';
import { CreateResultsValidationModuleDto } from './dto/create-results-validation-module.dto';
import { UpdateResultsValidationModuleDto } from './dto/update-results-validation-module.dto';
import { resultValidationRepository } from './results-validation-module.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';

@Injectable()
export class ResultsValidationModuleService {

  constructor(
    private readonly _resultValidationRepository: resultValidationRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError
  ){}

  create(createResultsValidationModuleDto: CreateResultsValidationModuleDto) {
    return 'This action adds a new resultsValidationModule';
  }

  async getGreenchecksByResult(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      let response: GetValidationSectionDto[] = [];

      response.push(await this._resultValidationRepository.generalInformationValidation(result.id, result.result_level_id));
      response.push(await this._resultValidationRepository.tocValidation(result.id));
      response.push(await this._resultValidationRepository.partnersValidation(result.id));
      response.push({section_name: 'links-to-results', validation: 1 });
      response.push(await this._resultValidationRepository.evidenceValidation(result.id));

      switch (result.result_type_id) {
        case 1:
          response.push(await this._resultValidationRepository.policyChangeValidation(result.id));
          break;

        case 2:
          response.push(await this._resultValidationRepository.innovationUseValidation(result.id));
          break;
        
        case 5:
          response.push(await this._resultValidationRepository.capDevValidation(result.id));
          break;

        case 7:
          response.push(await this._resultValidationRepository.innovationDevValidation(result.id));
          break;
      }

      const submit = response.reduce((previousValue, currentValue:any) => (previousValue * parseInt(currentValue.validation)), 1 );

      return {
        response: {
          green_checks: response,
          submit: submit
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };

    } catch (error) {
      return this._handlersError.returnErrorRes({error});
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsValidationModule`;
  }

  update(id: number, updateResultsValidationModuleDto: UpdateResultsValidationModuleDto) {
    return `This action updates a #${id} resultsValidationModule`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsValidationModule`;
  }
}
