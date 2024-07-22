import { HttpStatus, Injectable } from '@nestjs/common';
import { FindOptionsRelations, In, Like } from 'typeorm';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { MQAPResultDto } from '../../m-qap/dtos/m-qap.dto';
import { MQAPService } from '../../m-qap/m-qap.service';
import { Result } from '../entities/result.entity';
import { ResultRepository } from '../result.repository';
import { Version } from '../../versioning/entities/version.entity';
import { ResultsKnowledgeProduct } from './entities/results-knowledge-product.entity';
import { ResultsKnowledgeProductMapper } from './results-knowledge-products.mapper';
import { ResultsKnowledgeProductsRepository } from './repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductAltmetricRepository } from './repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from './repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductInstitutionRepository } from './repositories/results-knowledge-product-institution.repository';
import { ResultsKnowledgeProductKeywordRepository } from './repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from './repositories/results-knowledge-product-metadata.repository';
import { ResultsKnowledgeProductDto } from './dto/results-knowledge-product.dto';
import { EvidencesRepository } from '../evidences/evidences.repository';
import { ResultsKnowledgeProductSaveDto } from './dto/results-knowledge-product-save.dto';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultRegionRepository } from '../result-regions/result-regions.repository';
import { ClarisaRegionsRepository } from '../../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { ClarisaRegion } from '../../../clarisa/clarisa-regions/entities/clarisa-region.entity';
import { ResultRegion } from '../result-regions/entities/result-region.entity';
import { ResultCountry } from '../result-countries/entities/result-country.entity';
import { ResultCountryRepository } from '../result-countries/result-countries.repository';
import { VersioningService } from '../../versioning/versioning.service';
import { AppModuleIdEnum } from '../../../shared/constants/role-type.enum';
import { ClarisaCountriesRepository } from '../../../clarisa/clarisa-countries/ClarisaCountries.repository';
import { ResultsKnowledgeProductFairScore } from './entities/results-knowledge-product-fair-scores.entity';
import { FairField } from './entities/fair-fields.entity';
import { FairFieldRepository } from './repositories/fair-fields.repository';
import { FairFieldEnum } from './entities/fair-fields.enum';
import { FairSpecificData, FullFairData } from './dto/fair-data.dto';
import { ResultsKnowledgeProductFairScoreRepository } from './repositories/results-knowledge-product-fair-scores.repository';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ClarisaInstitutionsRepository } from '../../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { ResultsCenter } from '../results-centers/entities/results-center.entity';
import { ResultsService } from '../results.service';
import { DeleteRecoverDataService } from '../../delete-recover-data/delete-recover-data.service';
import { isProduction } from '../../../shared/utils/validation.utils';
import { StringUtils } from '../../../shared/utils/string.utils';
import { ResultByIntitutionsRepository } from '../results_by_institutions/result_by_intitutions.repository';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { InstitutionRoleEnum } from '../results_by_institutions/entities/institution_role.enum';
import { MQAPBodyDto } from '../../m-qap/dtos/m-qap-body.dto';

@Injectable()
export class ResultsKnowledgeProductsService {
  private readonly _resultsKnowledgeProductRelations: FindOptionsRelations<ResultsKnowledgeProduct> =
    {
      result_knowledge_product_altmetric_array: true,
      result_knowledge_product_institution_array: {
        predicted_institution_object: {
          clarisa_center: true,
        },
      },
      result_knowledge_product_metadata_array: true,
      result_object: {
        result_region_array: {
          region_object: true,
        },
        result_country_array: {
          country_object: {
            cgspace_country_mapping_array: true,
          },
        },
        obj_version: true,
      },
    };

  constructor(
    private readonly _resultsKnowledgeProductRepository: ResultsKnowledgeProductsRepository,
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultService: ResultsService,
    private readonly _mqapService: MQAPService,
    private readonly _resultsKnowledgeProductMapper: ResultsKnowledgeProductMapper,
    private readonly _resultsKnowledgeProductAltmetricRepository: ResultsKnowledgeProductAltmetricRepository,
    private readonly _resultsKnowledgeProductAuthorRepository: ResultsKnowledgeProductAuthorRepository,
    private readonly _resultsKnowledgeProductInstitutionRepository: ResultsKnowledgeProductInstitutionRepository,
    private readonly _resultsKnowledgeProductKeywordRepository: ResultsKnowledgeProductKeywordRepository,
    private readonly _resultsKnowledgeProductMetadataRepository: ResultsKnowledgeProductMetadataRepository,
    private readonly _evidenceRepository: EvidencesRepository,
    private readonly _roleByUseRepository: RoleByUserRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _clarisaRegionsRepository: ClarisaRegionsRepository,
    private readonly _clarisaCountriesRepository: ClarisaCountriesRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _versioningService: VersioningService,
    private readonly _fairFieldRepository: FairFieldRepository,
    private readonly _resultsKnowledgeProductFairScoreRepository: ResultsKnowledgeProductFairScoreRepository,
    private readonly _resultCenterRepository: ResultsCenterRepository,
    private readonly _clarisaInstitutionRepository: ClarisaInstitutionsRepository,
    private readonly _deleteRecoverDataService: DeleteRecoverDataService,
    private readonly _returnResponse: ReturnResponse,
    private readonly _resultByInstitutionRepository: ResultByIntitutionsRepository,
    private readonly _globalParameterRepository: GlobalParameterRepository,
  ) {}

  async syncAgain(resultId: number, user: TokenDto) {
    try {
      const resultKnowledgeProduct: ResultsKnowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOne({
          where: {
            results_id: resultId,
          },
          relations: this._resultsKnowledgeProductRelations,
        });

      if (!resultKnowledgeProduct) {
        return {
          response: { title: resultKnowledgeProduct.name },
          message: `A Result Knowledge Product with result_id '${resultId}' does not exist.`,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const isAdmin: any = await this._roleByUseRepository.isUserAdmin(user.id);

      if (isAdmin?.is_admin == false) {
        if (
          resultKnowledgeProduct.knowledge_product_type == 'Journal Article'
        ) {
          throw {
            response: {},
            message: `The Result with id ${resultId} cannot be manually updated right now`,
            status: HttpStatus.PRECONDITION_FAILED,
          };
        }
      }

      const cgspaceResponse = await this.findOnCGSpace(
        resultKnowledgeProduct.handle,
        resultKnowledgeProduct.result_object?.obj_version?.cgspace_year,
        false,
      );

      if (cgspaceResponse.status !== HttpStatus.OK) {
        throw this._handlersError.returnErrorRes({ error: cgspaceResponse });
      }

      const newMetadata =
        cgspaceResponse.response as ResultsKnowledgeProductDto;

      const updatedKnowledgeProduct =
        this._resultsKnowledgeProductMapper.updateEntity(
          resultKnowledgeProduct,
          newMetadata,
          user.id,
          resultKnowledgeProduct.results_id,
        );

      updatedKnowledgeProduct.result_knowledge_product_id =
        resultKnowledgeProduct.result_knowledge_product_id;

      this._resultsKnowledgeProductMapper.patchAltmetricData(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );

      //authors
      updatedKnowledgeProduct.result_knowledge_product_author_array =
        await this._resultsKnowledgeProductAuthorRepository.find({
          where: {
            result_knowledge_product_id:
              updatedKnowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });
      this._resultsKnowledgeProductMapper.patchAuthors(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      this._resultsKnowledgeProductMapper.patchInstitutions(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );

      //keywords
      updatedKnowledgeProduct.result_knowledge_product_keyword_array =
        await this._resultsKnowledgeProductKeywordRepository.find({
          where: {
            result_knowledge_product_id:
              updatedKnowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });
      this._resultsKnowledgeProductMapper.patchKeywords(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      this._resultsKnowledgeProductMapper.patchMetadata(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );
      this._resultsKnowledgeProductMapper.patchRegions(
        updatedKnowledgeProduct,
        newMetadata,
        true,
      );

      await this._resultsKnowledgeProductRepository.update(
        {
          result_knowledge_product_id:
            updatedKnowledgeProduct.result_knowledge_product_id,
        },
        {
          findable: updatedKnowledgeProduct.findable,
          accesible: updatedKnowledgeProduct.accesible,
          interoperable: updatedKnowledgeProduct.interoperable,
          reusable: updatedKnowledgeProduct.reusable,
          cgspace_countries: updatedKnowledgeProduct.cgspace_countries,
          cgspace_regions: updatedKnowledgeProduct.cgspace_regions,
          last_updated_by: user.id,
          comodity: updatedKnowledgeProduct.comodity,
          sponsors: updatedKnowledgeProduct.sponsors,
          description: updatedKnowledgeProduct.description,
          doi: updatedKnowledgeProduct.doi,
          knowledge_product_type:
            updatedKnowledgeProduct.knowledge_product_type,
          licence: updatedKnowledgeProduct.licence,
        },
      );

      //updating general result tables
      await this._resultRepository.update(
        { id: resultId },
        {
          title: newMetadata.title,
          description: newMetadata.description,
        },
      );

      //updating relations
      await this._resultsKnowledgeProductAltmetricRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_altmetric_array ?? [],
      );
      await this._resultsKnowledgeProductAuthorRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_author_array ?? [],
      );

      if (
        updatedKnowledgeProduct.result_knowledge_product_institution_array
          .length > 0
      ) {
        const globalParameter = await this._globalParameterRepository.findOne({
          where: { name: 'kp_mqap_institutions_confidence' },
          select: ['value'],
        });

        if (!globalParameter) {
          throw new Error(
            "Global parameter 'kp_mqap_institutions_confidence' not found",
          );
        }

        const confidenceThreshold = +globalParameter.value;

        const existingInstitutions =
          await this._resultsKnowledgeProductInstitutionRepository.find({
            where: {
              is_active: true,
              result_knowledge_product_id:
                resultKnowledgeProduct.result_knowledge_product_id,
            },
          });

        const updatedInstitutionIds =
          updatedKnowledgeProduct.result_knowledge_product_institution_array.map(
            (institution) => institution.predicted_institution_id,
          );

        for (const existingInstitution of existingInstitutions) {
          if (
            !updatedInstitutionIds.includes(
              existingInstitution.predicted_institution_id,
            )
          ) {
            await this._resultsKnowledgeProductInstitutionRepository.update(
              {
                result_kp_mqap_institution_id:
                  existingInstitution.result_kp_mqap_institution_id,
              },
              { is_active: false, last_updated_by: user.id },
            );

            await this._resultByInstitutionRepository.update(
              {
                result_kp_mqap_institution_id:
                  existingInstitution.result_kp_mqap_institution_id,
              },
              { is_active: false, last_updated_by: user.id },
            );
          }
        }

        for (const institution of updatedKnowledgeProduct.result_knowledge_product_institution_array) {
          const insExist =
            await this._resultsKnowledgeProductInstitutionRepository.findOne({
              where: {
                result_knowledge_product_id:
                  resultKnowledgeProduct.result_knowledge_product_id,
                predicted_institution_id: institution.predicted_institution_id,
                is_active: true,
              },
            });

          if (!insExist) {
            try {
              const savedInstitution =
                await this._resultsKnowledgeProductInstitutionRepository.save(
                  institution,
                );

              const institutionData = {
                result_id: resultId,
                institutions_id:
                  institution.confidant >= confidenceThreshold
                    ? institution.predicted_institution_id
                    : null,
                institution_roles_id:
                  InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
                is_predicted: institution.confidant >= confidenceThreshold,
                result_kp_mqap_institution_id:
                  savedInstitution.result_kp_mqap_institution_id,
                created_by: user.id,
                last_updated_by: user.id,
              };

              await this._resultByInstitutionRepository.save(institutionData);
            } catch (error) {
              throw new Error(
                `Error saving institution or result by institution: ${error}`,
              );
            }
          }
        }
      }

      await this._resultsKnowledgeProductKeywordRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_keyword_array ?? [],
      );
      await this._resultsKnowledgeProductMetadataRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_metadata_array ?? [],
      );

      await this.separateCentersFromCgspacePartners(
        updatedKnowledgeProduct,
        true,
      );

      //geolocation
      await this.updateCountries(updatedKnowledgeProduct, newMetadata, true);
      await this._resultCountryRepository.save(
        updatedKnowledgeProduct.result_object.result_country_array ?? [],
      );

      await this.updateGeoLocation(
        updatedKnowledgeProduct.result_object,
        updatedKnowledgeProduct,
        newMetadata,
      );

      await this._resultRegionRepository.save(
        updatedKnowledgeProduct.result_object.result_region_array ?? [],
      );

      //fair
      updatedKnowledgeProduct.result_knowledge_product_fair_score_array =
        await this._resultsKnowledgeProductFairScoreRepository.find({
          where: {
            result_knowledge_product_id:
              updatedKnowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
          relations: {
            fair_field_object: {
              parent_object: true,
            },
          },
        });
      await this.updateFair(updatedKnowledgeProduct, newMetadata, true);
      await this._resultsKnowledgeProductFairScoreRepository.save(
        updatedKnowledgeProduct.result_knowledge_product_fair_score_array ?? [],
      );

      return {
        response: updatedKnowledgeProduct,
        message: 'The Result Knowledge Product has been updated successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async updateFair(
    knowledgeProduct: ResultsKnowledgeProduct,
    resultsKnowledgeProductDto: ResultsKnowledgeProductDto,
    upsert = false,
  ) {
    const allFairFields: FairField[] = await this._fairFieldRepository.find({
      where: { is_active: true },
      relations: { parent_object: true, children_array: true },
    });
    let updatedFields: ResultsKnowledgeProductFairScore[] = [];

    for (const field of Object.values(FairFieldEnum)) {
      const currentFairFieldIndex: number = (
        knowledgeProduct.result_knowledge_product_fair_score_array ?? []
      ).findIndex(
        (fs) =>
          fs.fair_field_object.short_name == field && fs.is_baseline == false,
      );

      const currentFairFieldObject: ResultsKnowledgeProductFairScore =
        currentFairFieldIndex < 0
          ? new ResultsKnowledgeProductFairScore()
          : (knowledgeProduct.result_knowledge_product_fair_score_array ?? [])[
              currentFairFieldIndex
            ];

      if (!currentFairFieldObject.fair_field_id) {
        currentFairFieldObject.fair_field_id = allFairFields.find(
          (ff) => ff.short_name == field,
        )?.fair_field_id;
        currentFairFieldObject.result_knowledge_product_id =
          knowledgeProduct.result_knowledge_product_id;
      }

      let valuePath: string;
      let currentFairField: FairField = allFairFields.find(
        (ff) => ff.short_name == field,
      );
      while (currentFairField?.parent_id) {
        valuePath = `${valuePath ?? ''}.${currentFairField?.short_name}`;
        currentFairField = allFairFields.find(
          (ff) => ff.fair_field_id == currentFairField?.parent_id,
        );
      }

      valuePath = `${valuePath ?? ''}.${currentFairField?.short_name}`;
      valuePath = valuePath.indexOf('.') == 0 ? valuePath.slice(1) : valuePath;
      const pathArray: string[] = valuePath.split('.').reverse();
      let value: number;
      let currentObject: FairSpecificData | FullFairData =
        resultsKnowledgeProductDto.fair_data;
      if (field == FairFieldEnum.TOTAL) {
        value = currentObject?.total_score;
      } else {
        let currentPath = pathArray.shift();
        if (pathArray.length == 0) {
          value = currentObject[currentPath]?.score;
        } else {
          while (pathArray.length > 0) {
            currentObject = (
              currentObject[currentPath] as FairSpecificData
            ).indicators.find((i) => i.name == pathArray[0]);
            value = currentObject?.score;
            currentPath = pathArray.shift();
          }
        }
      }

      currentFairFieldObject.fair_value = value;
      currentFairFieldObject.is_baseline = false;
      if (!currentFairFieldObject.created_by) {
        currentFairFieldObject.created_by = upsert
          ? knowledgeProduct.last_updated_by
          : knowledgeProduct.created_by;
      } else {
        currentFairFieldObject.last_updated_by =
          knowledgeProduct.last_updated_by;
      }

      switch (field) {
        case FairFieldEnum.FINDABLE:
          knowledgeProduct.findable = value;
          break;
        case FairFieldEnum.ACCESIBLE:
          knowledgeProduct.accesible = value;
          break;
        case FairFieldEnum.INTEROPERABLE:
          knowledgeProduct.interoperable = value;
          break;
        case FairFieldEnum.REUSABLE:
          knowledgeProduct.reusable = value;
          break;
        default:
          break;
      }

      updatedFields.push(currentFairFieldObject);
    }

    if (!upsert) {
      const baselineFields: ResultsKnowledgeProductFairScore[] = [];
      updatedFields.forEach((fs) => {
        const baselineField = new ResultsKnowledgeProductFairScore();
        baselineField.result_knowledge_product_id =
          fs.result_knowledge_product_id;
        baselineField.fair_field_id = fs.fair_field_id;
        baselineField.fair_value = fs.fair_value;
        baselineField.is_baseline = true;
        baselineField.created_by = fs.created_by;
        baselineField.last_updated_by = fs.last_updated_by;
        baselineFields.push(baselineField);
      });

      updatedFields = updatedFields.concat(baselineFields);
    }

    knowledgeProduct.result_knowledge_product_fair_score_array = updatedFields;
  }

  async updateCountries(
    newKnowledgeProduct: ResultsKnowledgeProduct,
    resultsKnowledgeProductDto: ResultsKnowledgeProductDto,
    upsert = false,
  ) {
    const allClarisaCountries = await this._clarisaCountriesRepository.find();

    const countries = (resultsKnowledgeProductDto.cgspace_countries ?? []).map(
      (mqapIso) => {
        let country: ResultCountry;
        if (upsert) {
          country = (
            newKnowledgeProduct.result_object.result_country_array ?? []
          ).find((orc) => orc.country_object?.iso_alpha_2 == mqapIso);
          if (country) {
            country['matched'] = true;
          }
        }

        country ??= new ResultCountry();

        //searching for country by iso-2
        const clarisaCountry = allClarisaCountries.find(
          (cc) => cc.iso_alpha_2 == mqapIso,
        )?.id;

        country.country_id = clarisaCountry;
        if (!clarisaCountry) {
          console.warn(
            `country with ISO Code "${mqapIso}" does not have a mapping in CLARISA for handle "${resultsKnowledgeProductDto.handle}"`,
          );
        }

        country.result_id = newKnowledgeProduct.results_id;

        return country;
      },
    );

    (newKnowledgeProduct.result_object.result_country_array ?? []).forEach(
      (oc) => {
        if (!oc['matched']) {
          if (oc.result_country_id) {
            oc.is_active = false;
          }

          countries.push(oc);
        } else {
          delete oc['matched'];
        }
      },
    );

    newKnowledgeProduct.result_object.result_country_array = countries;
  }

  async findOnCGSpace(
    handle: string,
    versionCgspaceYear: number,
    validateExisting = true,
  ) {
    try {
      if (!handle) {
        throw {
          response: {},
          message: 'Missing data: handle',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (validateExisting) {
        const currentVersion: Version =
          await this._versioningService.$_findActivePhase(
            AppModuleIdEnum.REPORTING,
          );
        versionCgspaceYear = currentVersion?.phase_year;
      }

      const hasQuery = (handle ?? '').indexOf('?');
      const linkSplit = (handle ?? '')
        .slice(0, hasQuery != -1 ? hasQuery : handle.length)
        .split('/');
      const handleId = linkSplit.slice(linkSplit.length - 2).join('/');

      let response: ResultsKnowledgeProductDto = null;
      if (validateExisting) {
        const resultKnowledgeProduct: ResultsKnowledgeProduct =
          await this._resultsKnowledgeProductRepository.findOne({
            where: {
              handle: Like(handleId),
              is_active: true,
              result_object: {
                is_active: true,
              },
            },
            //relations: this._resultsKnowledgeProductRelations,
          });

        if (resultKnowledgeProduct) {
          const infoToMap = await this._resultRepository.getResultInfoToMap(
            resultKnowledgeProduct.results_id,
          );
          return {
            response: infoToMap,
            message:
              'This knowledge product has already been reported in the PRMS Reporting Tool.',
            status: HttpStatus.CONFLICT,
          };
        }
      }

      const mqapResponse: MQAPResultDto =
        await this._mqapService.getDataFromCGSpaceHandle(
          MQAPBodyDto.fromHandle(handle),
        );

      if (!mqapResponse) {
        throw {
          response: {},
          message: `Please add a valid handle (received: ${handle}). Only handles from CGSpace can be reported.`,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const cgYear =
        this._resultsKnowledgeProductMapper.getPublicationYearFromMQAPResponse(
          mqapResponse,
        );

      if ((mqapResponse?.Type ?? '') == 'Journal Article') {
        if (
          ['online_publication_date', 'issued_date'].includes(
            cgYear.field_name,
          ) &&
          (cgYear.year ?? 0) != versionCgspaceYear
        ) {
          throw {
            response: { title: mqapResponse?.Title },
            message: `Only journal articles published in ${versionCgspaceYear} are eligible for this reporting cycle.<br>
              Kindly review the rules provided at the beginning of the submission.<br><br>
              If you believe this is an error, please contact your Center’s knowledge management team to review this information in CGSpace.<br><br>
              <b>About this error:</b><br>
              Please be aware that for journal articles, the reporting system automatically verifies the “Date Issued” field in CGSpace when the "Date Online" is not present. For details on the rules applied with dates, refer to the knowledge product guidance document.`,
            status: HttpStatus.UNPROCESSABLE_ENTITY,
          };
        }
      } else if ((cgYear.year ?? 0) != versionCgspaceYear) {
        throw {
          response: { title: mqapResponse?.Title },
          message:
            `Reporting knowledge products from years outside the current reporting cycle (${versionCgspaceYear}) is not possible. ` +
            'Should you require assistance in modifying the publication year for this knowledge product, ' +
            'please contact your Center’s knowledge management team to review this information in CGSpace.',
          status: HttpStatus.UNPROCESSABLE_ENTITY,
        };
      }

      const errors = this._getErrorsFromMqapResponse(mqapResponse);
      if (errors.details.length > 0) {
        throw {
          response: errors.details,
          message: errors.error,
          status: HttpStatus.UNPROCESSABLE_ENTITY,
        };
      }

      response =
        this._resultsKnowledgeProductMapper.mqapResponseToKnowledgeProductDto(
          mqapResponse,
        );

      return {
        response: response,
        message: `The Result Knowledge Product ${
          !validateExisting ? 'is yet to be created' : 'can be updated'
        }`,
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  private _getErrorsFromMqapResponse(mqapResponse: MQAPResultDto): {
    error: string;
    details: string[];
  } {
    const details: string[] = [];
    let error =
      'The creation of the Knowledge Product failed due to duplicated fields: ';

    if (
      mqapResponse.Citation &&
      Array.isArray(mqapResponse.Citation) &&
      mqapResponse.Citation.length > 1
    ) {
      details.push(
        `Citation is not valid. values: [${mqapResponse.Citation.join(', ')}]`,
      );
    }

    if (
      mqapResponse.DOI &&
      Array.isArray(mqapResponse.DOI) &&
      mqapResponse.DOI.length > 1
    ) {
      details.push(
        `DOI is not valid. values: [${mqapResponse.DOI.join(', ')}]`,
      );
    }

    if (
      mqapResponse.Description &&
      Array.isArray(mqapResponse.Description) &&
      mqapResponse.Description.length > 1
    ) {
      details.push(
        `Description is not valid. values: [${mqapResponse.Description.join(
          ', ',
        )}]`,
      );
    }

    if (
      mqapResponse['Issued date'] &&
      Array.isArray(mqapResponse['Issued date']) &&
      mqapResponse['Issued date'].length > 1
    ) {
      details.push(
        `Issued date is not valid. values: [${mqapResponse['Issued date'].join(
          ', ',
        )}]`,
      );
    }

    if (
      mqapResponse['Online publication date'] &&
      Array.isArray(mqapResponse['Online publication date']) &&
      mqapResponse['Online publication date'].length > 1
    ) {
      details.push(
        `Online publication date is not valid. values: [${mqapResponse[
          'Online publication date'
        ].join(', ')}]`,
      );
    }

    if (
      mqapResponse['Publication Date'] &&
      Array.isArray(mqapResponse['Publication Date']) &&
      mqapResponse['Publication Date'].length > 1
    ) {
      details.push(
        `Publication Date is not valid. values: [${mqapResponse[
          'Publication Date'
        ].join(', ')}]`,
      );
    }

    if (
      mqapResponse.Rights &&
      Array.isArray(mqapResponse.Rights) &&
      mqapResponse.Rights.length > 1
    ) {
      details.push(
        `Rights is not valid. values: [${mqapResponse.Rights.join(', ')}]`,
      );
    }

    if (
      mqapResponse.Title &&
      Array.isArray(mqapResponse.Title) &&
      mqapResponse.Title.length > 1
    ) {
      details.push(
        `Title is not valid. values: [${mqapResponse.Title.join(', ')}]`,
      );
    }

    if (
      mqapResponse.Type &&
      Array.isArray(mqapResponse.Type) &&
      mqapResponse.Type.length > 1
    ) {
      details.push(
        `Type is not valid. values: [${mqapResponse.Type.join(', ')}]`,
      );
    }

    const individualItems = details.map(
      (e) => e.split('is not valid')?.[0]?.trim(),
    );
    const itemString = StringUtils.join(individualItems, ', ', ', and ');

    error += `${itemString}. Kindly reach out to the librarian to address this duplication issue.`;

    return { error, details };
  }

  async create(
    resultsKnowledgeProductDto: ResultsKnowledgeProductDto,
    user: TokenDto,
  ) {
    try {
      if (
        !(
          resultsKnowledgeProductDto.id ||
          resultsKnowledgeProductDto.result_data
        )
      ) {
        throw {
          response: {},
          message: 'Missing data needed to create a result',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const currentVersion: Version =
        await this._versioningService.$_findActivePhase(
          AppModuleIdEnum.REPORTING,
        );

      if (!currentVersion) {
        throw {
          response: {},
          message: 'Current Version Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      let newResult: Result = null;

      if (!resultsKnowledgeProductDto.id) {
        const newResultResponse = await this._resultService.createOwnerResult(
          resultsKnowledgeProductDto.result_data,
          user,
        );

        if (newResultResponse.status >= 300) {
          throw this._handlersError.returnErrorRes({
            error: newResultResponse,
          });
        }

        newResult = newResultResponse.response as Result;
      } else {
        const changeResultType =
          await this._deleteRecoverDataService.changeResultType(
            resultsKnowledgeProductDto.id,
            4,
            6,
            resultsKnowledgeProductDto.modification_justification,
            user,
            false,
            resultsKnowledgeProductDto.title,
          );

        if (changeResultType.statusCode >= 300) {
          throw this._handlersError.returnErrorRes({
            error: changeResultType.response,
          });
        }

        newResult = changeResultType.response as Result;
      }

      resultsKnowledgeProductDto.version_id = newResult.version_id;
      resultsKnowledgeProductDto.result_code = newResult.result_code;

      let newKnowledgeProduct: ResultsKnowledgeProduct =
        new ResultsKnowledgeProduct();
      newKnowledgeProduct = this._resultsKnowledgeProductMapper.updateEntity(
        newKnowledgeProduct,
        resultsKnowledgeProductDto,
        user.id,
        newResult.id,
      );

      newKnowledgeProduct.is_melia = false;
      newKnowledgeProduct.result_object = newResult;

      newKnowledgeProduct =
        await this._resultsKnowledgeProductRepository.save(newKnowledgeProduct);

      resultsKnowledgeProductDto.id = newResult.id;

      newKnowledgeProduct =
        this._resultsKnowledgeProductMapper.populateKPRelations(
          newKnowledgeProduct,
          resultsKnowledgeProductDto,
        );

      await this.separateCentersFromCgspacePartners(newKnowledgeProduct, false);

      // * Updating relations
      await this._resultsKnowledgeProductAltmetricRepository.save(
        newKnowledgeProduct.result_knowledge_product_altmetric_array ?? [],
      );
      await this._resultsKnowledgeProductAuthorRepository.save(
        newKnowledgeProduct.result_knowledge_product_author_array ?? [],
      );

      if (
        newKnowledgeProduct.result_knowledge_product_institution_array.length >
        0
      ) {
        const globalParameter = await this._globalParameterRepository.findOne({
          where: { name: 'kp_mqap_institutions_confidence' },
          select: ['value'],
        });

        if (!globalParameter) {
          throw new Error(
            "Global parameter 'kp_mqap_institutions_confidence' not found",
          );
        }

        const confidenceThreshold = +globalParameter.value;

        for (const institution of newKnowledgeProduct.result_knowledge_product_institution_array) {
          try {
            const savedInstitution =
              await this._resultsKnowledgeProductInstitutionRepository.save(
                institution,
              );

            if (!savedInstitution.predicted_institution_object.clarisa_center) {
              const isPredicted = institution.confidant >= confidenceThreshold;

              await this._resultByInstitutionRepository.save({
                result_id: newResult.id,
                institutions_id: isPredicted
                  ? institution.predicted_institution_id
                  : null,
                institution_roles_id:
                  InstitutionRoleEnum.KNOWLEDGE_PRODUCT_ADDITIONAL_CONTRIBUTORS,
                is_predicted: isPredicted,
                result_kp_mqap_institution_id:
                  savedInstitution.result_kp_mqap_institution_id,
                created_by: user.id,
                last_updated_by: user.id,
              });
            }
          } catch (error) {
            throw new Error(
              `Error saving institution or result by institution: ${error}`,
            );
          }
        }
      }

      await this._resultsKnowledgeProductKeywordRepository.save(
        newKnowledgeProduct.result_knowledge_product_keyword_array ?? [],
      );
      await this._resultsKnowledgeProductMetadataRepository.save(
        newKnowledgeProduct.result_knowledge_product_metadata_array ?? [],
      );

      // * Geolocation
      await this.updateCountries(
        newKnowledgeProduct,
        resultsKnowledgeProductDto,
        false,
      );

      await this._resultCountryRepository.save(
        newKnowledgeProduct.result_object.result_country_array ?? [],
      );

      await this.updateGeoLocation(
        newResult,
        newKnowledgeProduct,
        resultsKnowledgeProductDto,
      );

      await this._resultRegionRepository.save(
        newResult.result_region_array ?? [],
      );

      await this.updateFair(
        newKnowledgeProduct,
        resultsKnowledgeProductDto,
        false,
      );
      await this._resultsKnowledgeProductFairScoreRepository.save(
        newKnowledgeProduct.result_knowledge_product_fair_score_array ?? [],
      );
      await this._resultsKnowledgeProductRepository.update(
        {
          result_knowledge_product_id:
            newKnowledgeProduct.result_knowledge_product_id,
        },
        {
          findable: newKnowledgeProduct.findable,
          accesible: newKnowledgeProduct.accesible,
          interoperable: newKnowledgeProduct.interoperable,
          reusable: newKnowledgeProduct.reusable,
        },
      );

      // * Updating general result tables
      await this._resultRepository.update(
        { id: newResult.id },
        {
          title: resultsKnowledgeProductDto.title,
          description: resultsKnowledgeProductDto.description,
        },
      );

      // * Adding link to this knowledge product to existing evidences
      this._evidenceRepository
        .findBy({ link: Like(resultsKnowledgeProductDto.handle) })
        .then((re) => {
          return Promise.all(
            re.map((e) => {
              this._evidenceRepository.update(
                { id: e.id },
                {
                  knowledge_product_related: newResult.id,
                  result_id: newResult.id,
                  evidence_type_id: 1,
                },
              );
            }),
          );
        })
        .catch((error) => this._handlersError.returnErrorRes({ error }));

      // * Creating own evidence linking it to itself
      this._evidenceRepository.save({
        link: `https://hdl.handle.net/${resultsKnowledgeProductDto.handle}`,
        result_id: newResult.id,
        created_by: user.id,
        is_supplementary: false,
        evidence_type_id: 1,
      });

      return {
        response: resultsKnowledgeProductDto,
        message: 'The Result Knowledge Product has been created successfully',
        status: HttpStatus.CREATED,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async separateCentersFromCgspacePartners(
    knowledgeProduct: ResultsKnowledgeProduct,
    upsert = false,
  ) {
    // we get the centers currently mapped to the result
    const sectionTwoCenters = await this._resultCenterRepository.find({
      where: {
        result_id: knowledgeProduct.result_object.id,
        is_active: true,
      },
      relations: {
        clarisa_center_object: true,
      },
    });

    /*if the kp is new, we need to load the institution corresponding to the 
    id returned by cgspace in order to execute the next step*/
    if (!upsert) {
      const possibleCgInstitutionIds = (
        knowledgeProduct.result_knowledge_product_institution_array ?? []
      )
        .filter((cgi) => cgi.predicted_institution_id)
        .map((cgi) => cgi.predicted_institution_id);
      const possibleCgInstitutions =
        await this._clarisaInstitutionRepository.find({
          where: {
            id: In(possibleCgInstitutionIds),
          },
          relations: { clarisa_center: true },
        });

      knowledgeProduct.result_knowledge_product_institution_array = (
        knowledgeProduct.result_knowledge_product_institution_array ?? []
      ).map((cgi) => {
        const possibleCgInstitution = possibleCgInstitutions.find(
          (pci) => pci.id == cgi.predicted_institution_id,
        );
        if (possibleCgInstitution) {
          cgi.predicted_institution_object = possibleCgInstitution;
        }
        return cgi;
      });
    }

    let newSectionTwoCenters: ResultsCenter[] = [];

    const updatedCgInstitutions = (
      knowledgeProduct.result_knowledge_product_institution_array ?? []
    ).map((cgi) => {
      //if m-qap >97% certain of the institution match AND the institution is a center
      if (
        cgi.confidant > 97 &&
        cgi.predicted_institution_object.clarisa_center
      ) {
        cgi.is_active = false;
      }

      //if the center has not been mapped already, we will create a new db record
      if (
        !sectionTwoCenters.find(
          (stc) =>
            stc.clarisa_center_object.institutionId ==
            cgi.predicted_institution_id,
        ) &&
        cgi.predicted_institution_object.clarisa_center
      ) {
        const newSectionTwoCenter: ResultsCenter = new ResultsCenter();
        newSectionTwoCenter.center_id =
          cgi.predicted_institution_object.clarisa_center.code;
        newSectionTwoCenter.is_primary = false;
        newSectionTwoCenter.result_id = knowledgeProduct.results_id;
        newSectionTwoCenter.created_by =
          knowledgeProduct.last_updated_by || knowledgeProduct.created_by;
        newSectionTwoCenter.from_cgspace = true;

        newSectionTwoCenters.push(newSectionTwoCenter);
      }

      return cgi;
    });

    if (upsert) {
      //if the center already existed, we will update the flag depending on
      //the check if now comes from cgspace or not
      sectionTwoCenters.forEach((stc) => {
        const updatedCenter = updatedCgInstitutions.find(
          (cgi) =>
            cgi.predicted_institution_id ==
            stc.clarisa_center_object.institutionId,
        );

        stc.from_cgspace = !!updatedCenter;
      });
    }

    newSectionTwoCenters = await this._resultCenterRepository.save([
      ...newSectionTwoCenters,
      ...sectionTwoCenters,
    ]);

    knowledgeProduct.result_knowledge_product_institution_array =
      updatedCgInstitutions;
  }

  private async updateGeoLocation(
    newResult: Result,
    newKnowledgeProduct: ResultsKnowledgeProduct,
    resultsKnowledgeProductDto: ResultsKnowledgeProductDto,
  ) {
    //loading the world tree. this will help us immensely in the following steps
    const worldTree = await this._clarisaRegionsRepository.loadWorldTree();

    //cleaning regions
    const resultRegions = (newResult.result_region_array ?? [])
      .filter((rr) => rr.region_id)
      .map((rr) => {
        rr.region_object = worldTree.findById(rr.region_id)?.data;
        return rr;
      });
    const regions = resultRegions.map((rr) => rr.region_object);

    let cleanedCGRegions: ClarisaRegion[] = [];
    for (const region of regions) {
      //1. we check if the region has been added before. if so, we ignore it
      if (cleanedCGRegions.some((r) => r.um49Code == region.um49Code)) {
        continue;
      }

      //2. we check if the cleanedRegions array at least one descendant.
      if (cleanedCGRegions.some((r) => worldTree.isDescendant(r, region))) {
        //2.a we ignore it, as it has a descendant already in the list
        continue;
      }

      //3. we check if the cleanedRegions array has one or multiple ancestors
      const ancestors = cleanedCGRegions.filter((r) =>
        worldTree.isAncestor(r, region),
      );
      //3.a if there are ancestors, we remove them from the cleanedRegions list
      cleanedCGRegions = cleanedCGRegions.filter(
        (r) => !ancestors.find((a) => a.um49Code == r.um49Code),
      );

      //4. we add it to the cleanedRegions list
      cleanedCGRegions.push(region);
    }

    /*
      now that we have all the "leaves" from the regions coming from CGSpace,
      we need to verify if the regions are not roots. so, using the worldTree, 
      we find the region on the tree and get the parent of the region.
      if the region itself is not a root, it should be preserved. 
      if it is, the region children will be used instead.
    */
    const processedCleanedRegions: ClarisaRegion[] = cleanedCGRegions.flatMap(
      (crn) => {
        const regionNode = worldTree.find(crn);
        const regionLevel = regionNode.data?.['level'] ?? 0;
        if (regionLevel == 0) {
          return []; // should not happen
        }
        return regionLevel == 1 ? regionNode.childrenData : [crn];
      },
    );

    /* 
      we check if the region was already mapped to the result. if it was, we 
      remove it from the processedCleanedRegions and add the mapped region to the
      final cleanedResultRegions. if not, nothing happens
    */
    const cleanedResultRegions: ResultRegion[] = [];
    for (const rr of resultRegions) {
      const inProcessed = processedCleanedRegions.findIndex(
        (cr) => rr.region_id == cr.um49Code,
      );
      if (inProcessed > -1) {
        cleanedResultRegions.push(rr);
        processedCleanedRegions.splice(inProcessed, 1);
      } else {
        if (rr.result_region_id) {
          rr.is_active = false;
          cleanedResultRegions.push(rr);
        }
      }
    }

    /*
      if there are still regions that are not mapped to the result, we create them
    */
    for (const pcr of processedCleanedRegions) {
      const newResultRegion = new ResultRegion();
      newResultRegion.result_id = newResult.id;
      newResultRegion.region_id = pcr.um49Code;

      cleanedResultRegions.push(newResultRegion);
    }
    //end cleaning regions

    newResult.result_region_array = cleanedResultRegions;
    newResult.has_regions = (newResult.result_region_array ?? []).length != 0;

    newResult.has_countries =
      (newResult.result_country_array ?? []).length != 0;
    //newResult.has_regions = (newKnowledgeProduct.cgspace_regions??'').length != 0;

    if (resultsKnowledgeProductDto.is_global_geoscope) {
      newResult.geographic_scope_id = 1;
    } else if (!newResult.has_countries && !newResult.has_regions) {
      /*
      in case we do not explicitly receive "global" as a region from M-QAP,
      but the countries and regions array is empty, we are going to flag this
      as "to be determined"
      */
      newResult.geographic_scope_id = 50;
    } else {
      if (newResult.has_regions) {
        newResult.geographic_scope_id = 2;
      } else {
        newResult.geographic_scope_id =
          (newResult.result_country_array ?? []).length > 1 ? 3 : 4;
      }
    }

    //updating general result tables
    await this._resultRepository.update(
      { id: newResult.id },
      {
        geographic_scope_id: newResult.geographic_scope_id,
        has_countries: newResult.has_countries,
        has_regions: newResult.has_regions,
      },
    );
  }

  async findResultKnowledgeProductByHandle(handle: string) {
    try {
      if ((handle ?? '').length < 1) {
        throw {
          response: {},
          message: 'missing data: handle',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const knowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOneBy({
          handle: Like(handle),
        });

      if (!knowledgeProduct) {
        throw {
          response: {},
          message: `There is not a Knowledge Product with the handle ${handle}`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      const response =
        this._resultsKnowledgeProductMapper.entityToDto(knowledgeProduct);
      return {
        response,
        message:
          'This knowledge product has already been reported in the PRMS Reporting Tool.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOneByKnowledgeProductId(id: number) {
    try {
      if (id < 1) {
        throw {
          response: {},
          message: 'missing data: id',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const knowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOne({
          where: { result_knowledge_product_id: id },
          relations: { result_object: { obj_version: true } },
        });

      if (!knowledgeProduct) {
        throw {
          response: {},
          message: `There is not a Knowledge Product with the id ${id}`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      const response =
        this._resultsKnowledgeProductMapper.entityToDto(knowledgeProduct);

      // validations
      response.warnings = this.getWarnings(
        response,
        knowledgeProduct.result_object.obj_version.cgspace_year,
      );

      return {
        response,
        message: 'The Result Knowledge Product has already been created.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findOneByResultId(id: number) {
    try {
      if (id < 1) {
        throw {
          response: {},
          message: 'missing data: id',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const result = await this._resultRepository.findOne({
        where: { id },
        relations: { obj_version: true },
      });

      if (!result) {
        throw {
          response: {},
          message: `There is not a Result with the id ${id}`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      const knowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOne({
          where: {
            results_id: result.id,
            //...this._resultsKnowledgeProductWhere,
          },
          relations: { result_object: { obj_version: true } },
        });

      if (!knowledgeProduct) {
        throw {
          response: {},
          message: `The Result with id ${id} does not have a linked Knowledge Product Details`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      knowledgeProduct.result_knowledge_product_author_array =
        await this._resultsKnowledgeProductAuthorRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });

      knowledgeProduct.result_knowledge_product_altmetric_array =
        await this._resultsKnowledgeProductAltmetricRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });

      knowledgeProduct.result_knowledge_product_institution_array =
        await this._resultsKnowledgeProductInstitutionRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });

      knowledgeProduct.result_knowledge_product_keyword_array =
        await this._resultsKnowledgeProductKeywordRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });

      knowledgeProduct.result_knowledge_product_metadata_array =
        await this._resultsKnowledgeProductMetadataRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });

      knowledgeProduct.result_knowledge_product_fair_score_array =
        await this._resultsKnowledgeProductFairScoreRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
            is_baseline: false,
          },
          relations: {
            fair_field_object: {
              parent_object: true,
            },
          },
        });

      const response =
        this._resultsKnowledgeProductMapper.entityToDto(knowledgeProduct);

      // validations
      response.warnings = this.getWarnings(
        response,
        result.obj_version.cgspace_year,
      );

      return {
        response,
        message: 'The Result Knowledge Product has been found.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  getWarnings(
    response: ResultsKnowledgeProductDto,
    cgspaceYear: number,
  ): string[] {
    const warnings: string[] = [];

    if (response.doi?.length < 1) {
      warnings.push(
        'Journal articles without the DOI will directly go to ' +
          'the Quality Assurance. In case you need support to add the DOI in CGSPACE, ' +
          'please contact the librarian of your Center.',
      );
    }

    if (response.doi?.length > 1 && !response.altmetric_detail_url) {
      warnings.push(
        'Please make sure the DOI is valid otherwise the journal article will directly go ' +
          'to the Quality Assurance. In case you need support to correct the DOI in CGSPACE, ' +
          'please contact the librarian of your Center.',
      );
    }

    const cgspaceMetadata = response.metadata.find(
      (m) => m.source === 'CGSpace',
    );
    const wosMetadata = response.metadata.find((m) => m.source !== 'CGSpace');

    if (response.type == 'Journal Article') {
      if (
        (cgspaceMetadata?.issue_year ?? 0) !== (wosMetadata?.issue_year ?? 0)
      ) {
        warnings.push(
          'The year of publication is automatically retrieved from an external service (Web ' +
            'of Science or Scopus). In case of inconsistencies, the CGIAR Quality Assurance ' +
            'team will manually validate the record. We remind you that only knowledge products ' +
            `published in ${cgspaceYear} can be reported.`,
        );
      }

      if ((wosMetadata?.issue_year ?? 0) < 1) {
        warnings.push(
          'The year of publication is automatically retrieved from an external service (Web ' +
            'of Science or Scopus). If the year does not show, it might be due to a delay in ' +
            'the indexing. The CGIAR Quality Assurance team will validate this information at ' +
            'the end of the reporting cycle.',
        );
      }
    }

    return warnings;
  }

  async upsert(
    id: number,
    user: TokenDto,
    sectionSevenData: ResultsKnowledgeProductSaveDto,
  ) {
    try {
      if (id < 1) {
        throw {
          response: {},
          message: 'missing data: id',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const result = await this._resultRepository.findOneBy({
        id,
      });

      if (!result) {
        throw {
          response: {},
          message: `There is not a Result with the id ${id}`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      let knowledgeProduct =
        await this._resultsKnowledgeProductRepository.findOne({
          where: { results_id: result.id },
        });

      if (!knowledgeProduct) {
        throw {
          response: {},
          message: `The Result with id ${id} does not have a linked Knowledge Product Details`,
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!sectionSevenData.isMeliaProduct) {
        sectionSevenData.ostSubmitted = null;
        sectionSevenData.ostMeliaId = null;
        sectionSevenData.clarisaMeliaTypeId = null;
      }

      if (sectionSevenData.ostSubmitted) {
        sectionSevenData.clarisaMeliaTypeId = null;
      } else {
        sectionSevenData.ostMeliaId = null;
      }

      await this._resultsKnowledgeProductRepository.update(
        {
          result_knowledge_product_id:
            knowledgeProduct.result_knowledge_product_id,
        },
        {
          last_updated_by: user.id,
          is_melia: sectionSevenData.isMeliaProduct,
          melia_previous_submitted: sectionSevenData.ostSubmitted,
          melia_type_id: sectionSevenData.clarisaMeliaTypeId,
          ost_melia_study_id: sectionSevenData.ostMeliaId,
        },
      );

      knowledgeProduct = await this._resultsKnowledgeProductRepository.findOne({
        where: { results_id: result.id },
        relations: this._resultsKnowledgeProductRelations,
      });

      knowledgeProduct.result_knowledge_product_fair_score_array =
        await this._resultsKnowledgeProductFairScoreRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
          relations: {
            fair_field_object: {
              parent_object: true,
            },
          },
        });

      knowledgeProduct.result_knowledge_product_keyword_array =
        await this._resultsKnowledgeProductKeywordRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });

      knowledgeProduct.result_knowledge_product_author_array =
        await this._resultsKnowledgeProductAuthorRepository.find({
          where: {
            result_knowledge_product_id:
              knowledgeProduct.result_knowledge_product_id,
            is_active: true,
          },
        });

      return {
        response: {},
        message: 'The section has been updated successfully.',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }

  async findByFilterActiveKps(filter?: {
    resultCodes?: number[];
    resultStatus?: number;
    phase?: number;
  }) {
    try {
      const result_object: any = {
        is_active: true,
      };

      if (filter?.resultCodes?.length) {
        result_object.result_code = In(filter.resultCodes);
      }

      if (filter?.resultStatus) {
        result_object.status_id = filter.resultStatus;
      }

      if (filter?.phase) {
        result_object.version_id = filter.phase;
      }

      const kps = await this._resultsKnowledgeProductRepository.find({
        where: {
          is_active: true,
          result_object: result_object,
        },
        relations: {
          result_object: true,
        },
      });

      return this._returnResponse.format({
        message:
          'The active knowledge products have not been retrieved successfully',
        response: kps,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return this._returnResponse.format(error, !isProduction());
    }
  }

  async getSectionSevenDataForReport(
    resultCodesArray: number[],
    phase?: number,
  ) {
    try {
      const data =
        await this._resultsKnowledgeProductRepository.getSectionSevenDataForReport(
          resultCodesArray,
          phase,
        );

      return {
        response: data,
        message:
          'The data for the knowledge products have been retrieved successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error });
    }
  }
}
