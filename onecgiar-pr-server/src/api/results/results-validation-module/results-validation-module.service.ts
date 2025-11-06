import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { resultValidationRepository } from './results-validation-module.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { Validation } from './entities/validation.entity';
import { GetValidationSectionDto } from './dto/getValidationSection.dto';
import { env } from 'process';
import { ReturnResponseUtil } from '../../../shared/utils/response.util';

@Injectable()
export class ResultsValidationModuleService {
  private readonly _logger: Logger = new Logger(
    ResultsValidationModuleService.name,
  );
  constructor(
    private readonly _resultValidationRepository: resultValidationRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
  ) {}

  async calculateValidationSections(resultId: number) {
    try {
      const response =
        await this._resultValidationRepository.validateResultById(resultId);

      const submit = response.reduce(
        (previousValue, currentValue: any) =>
          previousValue * parseInt(currentValue.validation),
        1,
      );

      return ReturnResponseUtil.format({
        response: {
          green_checks: response.map((item) => ({
            section_name: item.section_name,
            validation: Boolean(item.validation),
          })),
          submit: Boolean(submit),
        },
        message: 'Validation sections calculated successfully',
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      this._handlersError.returnErrorRes({ error });
    }
  }

  async getGreenchecksByResult1(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const response: GetValidationSectionDto[] = [];

      response.push(
        await this._resultValidationRepository.generalInformationValidation(
          result.id,
          result.result_level_id,
          result.result_type_id,
        ),
      );
      response.push(
        await this._resultValidationRepository.tocValidation(
          result.id,
          result.result_level_id,
        ),
      );

      if (result.result_type_id == 6) {
        response.push({ section_name: 'geographic-location', validation: 1 });
        response.push({ section_name: 'partners', validation: 1 });
      } else {
        response.push(
          await this._resultValidationRepository.partnersValidation(result.id),
        );
        response.push(
          await this._resultValidationRepository.geoLocationValidation(
            result.id,
          ),
        );
      }
      response.push({ section_name: 'links-to-results', validation: 1 });

      response.push(
        await this._resultValidationRepository.evidenceValidation(
          result.result_type_id,
          result.id,
        ),
      );

      switch (result.result_type_id) {
        case 1:
          response.push(
            await this._resultValidationRepository.policyChangeValidation(
              result.id,
            ),
          );
          break;

        case 2:
          response.push(
            await this._resultValidationRepository.innovationUseValidation(
              result.id,
            ),
          );
          break;

        case 5:
          response.push(
            await this._resultValidationRepository.capDevValidation(result.id),
          );
          break;

        case 6:
          response.push(
            await this._resultValidationRepository.knowledgeProductValidation(
              result.id,
            ),
          );
          break;

        case 7:
          response.push(
            await this._resultValidationRepository.innovationDevValidation(
              result.id,
            ),
          );
          break;
      }

      const submit = response.reduce(
        (previousValue, currentValue: any) =>
          previousValue * parseInt(currentValue.validation),
        1,
      );

      return {
        response: {
          green_checks: response,
          submit: submit,
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
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
      const response: GetValidationSectionDto[] = [];
      const validation =
        await this._resultValidationRepository.validationResultExist(result.id);

      response.push({
        section_name: 'general-information',
        validation: validation?.general_information || 0,
      });
      response.push({
        section_name: 'theory-of-change',
        validation: validation?.theory_of_change || 0,
      });

      if (result.result_type_id == 6) {
        response.push({ section_name: 'geographic-location', validation: 1 });
        response.push({
          section_name: 'partners',
          validation: validation?.partners || 0,
        });
      } else {
        response.push({
          section_name: 'geographic-location',
          validation: validation?.geographic_location || 0,
        });
        response.push({
          section_name: 'partners',
          validation: validation?.partners || 0,
        });
      }
      response.push({ section_name: 'links-to-results', validation: 1 });

      response.push({
        section_name: 'evidences',
        validation: validation?.evidence || 0,
      });

      switch (result.result_type_id) {
        case 1:
          response.push({
            section_name: 'policy-change1-info',
            validation: validation?.section_seven || 0,
          });
          break;

        case 2:
          response.push({
            section_name: 'innovation-use-info',
            validation: validation?.section_seven || 0,
          });
          break;

        case 5:
          response.push({
            section_name: 'cap-dev-info',
            validation: validation?.section_seven || 0,
          });
          break;

        case 6:
          response.push({
            section_name: 'knowledge-product-info',
            validation: validation?.section_seven || 0,
          });
          break;

        case 7:
          response.push({
            section_name: 'innovation-dev-info',
            validation: validation?.section_seven || 0,
          });
          break;
      }

      const submit = response.reduce(
        (previousValue, currentValue: any) =>
          previousValue * parseInt(currentValue.validation),
        1,
      );

      return {
        response: {
          green_checks: response,
          submit: submit,
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async saveGreenCheck(resultId: number) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      if (!result) {
        throw {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }
      const response: GetValidationSectionDto[] = [];
      const validation =
        await this._resultValidationRepository.validationResultExist(result.id);

      const phase = await this._resultValidationRepository.version();
      if (
        phase.version != result.version_id &&
        result.created_date < new Date(env.PREVIOUS_PHASE_DATE)
      ) {
        const previousPhase =
          await this._resultValidationRepository.oldGreenCheckVersion(
            result.id,
          );
        return {
          response: {
            green_checks: previousPhase,
          },
          message: 'Result for previus phase',
          status: HttpStatus.OK,
        };
      }

      await this._resultValidationRepository.inactiveOldInserts(result.id);
      const newValidation = new Validation();

      newValidation.is_active = true;
      const vGeneral =
        await this._resultValidationRepository.generalInformationValidation(
          result.id,
          result.result_level_id,
          result.result_type_id,
        );
      newValidation.general_information = vGeneral.validation;
      response.push(vGeneral);

      const vToc = await this._resultValidationRepository.tocValidation(
        result.id,
        result.result_level_id,
      );
      newValidation.theory_of_change = vToc.validation;
      response.push(vToc);

      if (result.result_type_id == 6) {
        newValidation.geographic_location = 1;
        response.push({
          section_name: 'geographic-location',
          validation: newValidation.geographic_location,
        });
        const vPartners =
          await this._resultValidationRepository.partnersValidation(result.id);
        newValidation.partners = vPartners.validation;
        response.push(vPartners);
      } else {
        const vPartners =
          await this._resultValidationRepository.partnersValidation(result.id);
        newValidation.partners = vPartners.validation;
        response.push(vPartners);
        const vGeoLocation =
          await this._resultValidationRepository.geoLocationValidation(
            result.id,
          );
        newValidation.geographic_location = vGeoLocation.validation;
        response.push(vGeoLocation);
      }

      newValidation.links_to_results = 1;
      response.push({
        section_name: 'links-to-results',
        validation: newValidation.links_to_results,
      });

      const vEvidence =
        await this._resultValidationRepository.evidenceValidation(
          result.result_type_id,
          result.id,
        );
      newValidation.evidence = vEvidence.validation;
      response.push(vEvidence);

      switch (result.result_type_id) {
        case 1:
          const vSection71 =
            await this._resultValidationRepository.policyChangeValidation(
              result.id,
            );
          newValidation.section_seven = vSection71.validation;
          response.push(vSection71);
          break;

        case 2:
          const vSection72 =
            await this._resultValidationRepository.innovationUseValidation(
              result.id,
            );
          newValidation.section_seven = vSection72.validation;
          response.push(vSection72);
          break;

        case 5:
          const vSection75 =
            await this._resultValidationRepository.capDevValidation(result.id);
          newValidation.section_seven = vSection75.validation;
          response.push(vSection75);
          break;

        case 6:
          const vSection76 =
            await this._resultValidationRepository.knowledgeProductValidation(
              result.id,
            );
          newValidation.section_seven = vSection76.validation;
          response.push(vSection76);
          break;

        case 7:
          const vSection77 =
            await this._resultValidationRepository.innovationDevValidation(
              result.id,
            );
          newValidation.section_seven = vSection77.validation;
          response.push(vSection77);
          break;
      }

      if (validation) {
        delete validation.results_id;
        await this._resultValidationRepository.update(
          validation.id,
          newValidation,
        );
      } else {
        newValidation.results_id = result.id;
        await this._resultValidationRepository.save(newValidation);
      }

      const submit = response.reduce(
        (previousValue, currentValue: any) =>
          previousValue * parseInt(currentValue.validation),
        1,
      );

      return {
        response: {
          green_checks: response,
          submit: submit,
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async saveAllGreenCheck() {
    try {
      const results = await this._resultRepository.getAllResultId();
      for (const iterator of results) {
        const { id: resultId } = iterator;
        const result = await this._resultRepository.getResultById(resultId);
        if (!result) {
          continue;
        }
        const response: GetValidationSectionDto[] = [];
        const validation =
          await this._resultValidationRepository.validationResultExist(
            result.id,
          );
        await this._resultValidationRepository.inactiveOldInserts(result.id);
        const newValidation = new Validation();

        if (validation) {
          newValidation.id = validation.id;
          newValidation.results_id = validation.results_id;
        } else {
          newValidation.results_id = result.id;
        }

        newValidation.is_active = true;
        const vGeneral =
          await this._resultValidationRepository.generalInformationValidation(
            result.id,
            result.result_level_id,
            result.result_type_id,
          );
        newValidation.general_information = vGeneral.validation;
        response.push(vGeneral);
        const vToc = await this._resultValidationRepository.tocValidation(
          result.id,
          result.result_level_id,
        );
        newValidation.theory_of_change = vToc.validation;
        response.push(vToc);

        if (result.result_type_id == 6) {
          newValidation.geographic_location = 1;
          response.push({
            section_name: 'geographic-location',
            validation: newValidation.geographic_location,
          });
          const vPartners =
            await this._resultValidationRepository.partnersValidation(
              result.id,
            );
          newValidation.partners = vPartners.validation;
          response.push(vPartners);
        } else {
          const vPartners =
            await this._resultValidationRepository.partnersValidation(
              result.id,
            );
          newValidation.partners = vPartners.validation;
          response.push(vPartners);
          const vGeoLocation =
            await this._resultValidationRepository.geoLocationValidation(
              result.id,
            );
          newValidation.geographic_location = vGeoLocation.validation;
          response.push(vGeoLocation);
        }

        newValidation.links_to_results = 1;
        response.push({
          section_name: 'links-to-results',
          validation: newValidation.links_to_results,
        });

        const vEvidence =
          await this._resultValidationRepository.evidenceValidation(
            result.result_type_id,
            result.id,
          );
        newValidation.evidence = vEvidence.validation;
        response.push(vEvidence);

        switch (result.result_type_id) {
          case 1:
            const vSection71 =
              await this._resultValidationRepository.policyChangeValidation(
                result.id,
              );
            newValidation.section_seven = vSection71.validation;
            response.push(vSection71);
            break;

          case 2:
            const vSection72 =
              await this._resultValidationRepository.innovationUseValidation(
                result.id,
              );
            newValidation.section_seven = vSection72.validation;
            response.push(vSection72);
            break;

          case 5:
            const vSection75 =
              await this._resultValidationRepository.capDevValidation(
                result.id,
              );
            newValidation.section_seven = vSection75.validation;
            response.push(vSection75);
            break;

          case 6:
            const vSection76 =
              await this._resultValidationRepository.knowledgeProductValidation(
                result.id,
              );
            newValidation.section_seven = vSection76.validation;
            response.push(vSection76);
            break;

          case 7:
            const vSection77 =
              await this._resultValidationRepository.innovationDevValidation(
                result.id,
              );
            newValidation.section_seven = vSection77.validation;
            response.push(vSection77);
            break;
        }

        await this._resultValidationRepository.save(newValidation);
        this._logger.verbose(
          `The validations of the result with id ${resultId} have been saved correctly.`,
        );

        response.reduce(
          (previousValue, currentValue: any) =>
            previousValue * parseInt(currentValue.validation),
          1,
        );
      }

      return {
        response: {
          results,
        },
        message: 'Sections have been successfully validated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
