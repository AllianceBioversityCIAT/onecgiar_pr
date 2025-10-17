import {
  Injectable,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RootResultsDto, SubmittedByDto } from './dto/create-bilateral.dto';
import { ResultRepository } from '../results/result.repository';
import { VersioningService } from '../versioning/versioning.service';
import { AppModuleIdEnum } from '../../shared/constants/role-type.enum';
import { HandlersError } from '../../shared/handlers/error.utils';
import { Result, SourceEnum } from '../results/entities/result.entity';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ClarisaRegionsRepository } from '../../clarisa/clarisa-regions/ClariasaRegions.repository';
import { Between, In, Like } from 'typeorm';
import { ClarisaGeographicScopeRepository } from '../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultRegionRepository } from '../results/result-regions/result-regions.repository';
import { ClarisaCountriesRepository } from '../../clarisa/clarisa-countries/ClarisaCountries.repository';
import { ResultCountryRepository } from '../results/result-countries/result-countries.repository';
import { ClarisaSubnationalScopeRepository } from '../../clarisa/clarisa-subnational-scope/clarisa-subnational-scope.repository';
import { ResultCountrySubnationalRepository } from '../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultCountry } from '../results/result-countries/entities/result-country.entity';
import { YearRepository } from '../results/years/year.repository';
import { ResultRegion } from '../results/result-regions/entities/result-region.entity';
import { InstitutionRoleEnum } from '../results/results_by_institutions/entities/institution_role.enum';
import { ResultByIntitutionsRepository } from '../results/results_by_institutions/result_by_intitutions.repository';
import { ResultsByInstitution } from '../results/results_by_institutions/entities/results_by_institution.entity';
import { ClarisaInstitutionsRepository } from '../../clarisa/clarisa-institutions/ClariasaInstitutions.repository';
import { EvidencesService } from '../results/evidences/evidences.service';
import { EvidencesRepository } from '../results/evidences/evidences.repository';
import { Evidence } from '../results/evidences/entities/evidence.entity';
import { ResultsKnowledgeProductsRepository } from '../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ClarisaCentersRepository } from '../../clarisa/clarisa-centers/clarisa-centers.repository';
import { NonPooledProjectRepository } from '../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultTypeRepository } from '../results/result_types/resultType.repository';
import { UserService } from '../../auth/modules/user/user.service';
import { CreateUserDto } from '../../auth/modules/user/dto/create-user.dto';
import { ResultsKnowledgeProductsService } from '../results/results-knowledge-products/results-knowledge-products.service';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ResultsKnowledgeProductDto } from '../results/results-knowledge-products/dto/results-knowledge-product.dto';
import { ResultsTocResultRepository } from '../results/results-toc-results/repositories/results-toc-results.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { User } from '../../auth/modules/user/entities/user.entity';

@Injectable()
export class BilateralService {
  constructor(
    private readonly _resultRepository: ResultRepository,
    private readonly _handlersError: HandlersError,
    private readonly _versioningService: VersioningService,
    private readonly _userRepository: UserRepository,
    private readonly _clarisaRegionsRepository: ClarisaRegionsRepository,
    private readonly _yearRepository: YearRepository,
    private readonly _geoScopeRepository: ClarisaGeographicScopeRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _clarisaCountriesRepository: ClarisaCountriesRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _clarisaSubnationalAreasRepository: ClarisaSubnationalScopeRepository,
    private readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _clarisaInstitutionsRepository: ClarisaInstitutionsRepository,
    private readonly _evidencesRepository: EvidencesRepository,
    private readonly _evidencesService: EvidencesService,
    private readonly _resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
    private readonly _clarisaCenters: ClarisaCentersRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultTypeRepository: ResultTypeRepository,
    private readonly _userService: UserService,
    private readonly _resultsKnowledgeProductsService: ResultsKnowledgeProductsService,
    private readonly _resultsTocResultsRepository: ResultsTocResultRepository,
    private readonly _clarisaInitiatives: ClarisaInitiativesRepository,
    private readonly _resultsTocResultsIndicatorsRepository: ResultsTocResultIndicatorsRepository,
  ) {}

  async create(
    rootResultsDto: RootResultsDto,
    isAdmin?: boolean,
    versionId?: number,
  ) {
    if (
      !rootResultsDto?.results ||
      !Array.isArray(rootResultsDto.results) ||
      rootResultsDto.results.length === 0
    ) {
      throw new BadRequestException(
        'The "results" array is required and cannot be empty.',
      );
    }
    try {
      const createdResults = [];
      for (const result of rootResultsDto.results) {
        const bilateralDto = result.data;

        let adminUser = await this._userRepository.findOne({
          where: { email: 'admin@prms.pr' },
        });

        let resultType;
        if (result.type === 'knowledge_product') {
          resultType = { id: 6, name: 'Knowledge product' };
        } else {
          resultType = await this._resultTypeRepository.findOne({
            where: { name: result.type },
          });
          console.log('resultType (from DB):', resultType);
          if (!resultType) {
            throw new NotFoundException(
              `Result type not found for name: ${result.type}`,
            );
          }
        }

        const createdByUser = await this.findOrCreateUser(bilateralDto.created_by, adminUser)
        const userId = createdByUser.id;

        const submittedUser = await this.findOrCreateUser(bilateralDto.submitted_by, createdByUser)
        const submittedUserId = submittedUser.id;


        // === Crear encabezado del Result ===
        const version = await this._versioningService.$_findActivePhase(
          AppModuleIdEnum.REPORTING,
        );
        if (!version)
          throw this._handlersError.returnErrorRes({
            error: version,
            debug: true,
          });

        const year = await this._yearRepository.findOne({
          where: { active: true },
        });
        if (!year) throw new NotFoundException('Active year not found');

        const lastCode = await this._resultRepository.getLastResultCode();

        const newResultHeader = await this._resultRepository.save({
          created_by: userId,
          version_id: isAdmin && versionId ? versionId : version.id,
          title: bilateralDto.title,
          description: bilateralDto.description,
          reported_year_id: year.year,
          result_code: lastCode + 1,
          result_type_id: resultType.id,
          external_submitter: submittedUserId,
          external_submitted_date:
            bilateralDto.submitted_by?.submitted_date ?? null,
          external_submitted_comment:
            bilateralDto.submitted_by?.comment ?? null,
          ...(bilateralDto.created_date && {
            created_date: bilateralDto.created_date,
          }),
          source: SourceEnum.Bilateral,
        });

        // === Geo Focus ===
        const {
          scope_code,
          scope_label,
          regions,
          countries,
          subnational_areas,
        } = bilateralDto.geo_focus;
        const scope = await this.findScope(scope_code, scope_label);
        this.validateGeoFocus(scope, regions, countries, subnational_areas);

        await this.handleRegions(newResultHeader, scope, regions);
        await this.handleCountries(
          newResultHeader,
          countries,
          subnational_areas,
          scope.id,
          userId,
        );

        await this._resultRepository.save({
          ...newResultHeader,
          geographic_scope_id: this.resolveScopeId(scope.id, countries),
        });

        // === Instituciones ===
        const { contributing_center, contributing_partners } = bilateralDto;

        const allInstitutions = [
          ...(contributing_center || []),
          ...(contributing_partners || []),
        ];

        await this.handleTocMapping(
          bilateralDto.toc_mapping,
          userId,
          newResultHeader.id,
        );

        await this.handleInstitutions(
          newResultHeader.id,
          allInstitutions,
          userId,
        );

        await this.handleEvidence(
          newResultHeader.id,
          bilateralDto.evidence,
          userId,
        );

        await this.handleNonPooledProject(
          newResultHeader.id,
          userId,
          bilateralDto.contributing_bilateral_projects,
          bilateralDto.lead_center,
        );

        const tokenDto: TokenDto = {
          id: userId,
          email: createdByUser.email,
          first_name: createdByUser.first_name,
          last_name: createdByUser.last_name,
        };
        let kpDto = bilateralDto.knowledge_product;
        let resultDto: ResultsKnowledgeProductDto;
        if (resultType.id === 6 /*Knowledge Product*/) {
          const cgspaceInfo =
            await this._resultsKnowledgeProductsService.findOnCGSpace(
              kpDto.handle,
              tokenDto,
              null,
            );
          resultDto = cgspaceInfo.response as ResultsKnowledgeProductDto;
          await this._resultsKnowledgeProductsService.create(
            resultDto,
            tokenDto,
          );
        }

        createdResults.push({
          id: newResultHeader.id,
          result_code: newResultHeader.result_code,
        });
      }
      return {
        response: {
          results: createdResults,
        },
        message: 'Results Bilateral created successfully.',
        status: 201,
      };
    } catch (error) {
      console.error('Error creating bilateral:', error);
      throw error;
    }
    }

    private async findOrCreateUser(
        userData,
        adminUser,
    ): Promise<any> {
        if (!userData?.email) {
            throw new BadRequestException('User email is required.');
        }

        let user = await this._userRepository.findOne({
            where: { email: userData.email },
        });

        if (!user) {
            const createUserDto: CreateUserDto = {
            first_name: userData.name ?? '(no name)',
            last_name: '(external)',
            email: userData.email,
            is_cgiar: true,
            created_by: adminUser,
            };

            console.log('Creating new user for email:', createUserDto);
            const createdUserResult = await this._userService.createFull(
            createUserDto,
            adminUser,
            );
            console.log('Created user:', createdUserResult);

            return createdUserResult;
        }

        return user;
    }

  private async handleTocMapping(tocArray, userId, resultId) {
    for (const toc of tocArray) {
      const mapToToc =
        await this._resultsTocResultsRepository.findTocResultsForBilateral(toc);

      console.log('mapToToc:', mapToToc);

      const init = await this._clarisaInitiatives.findOne({
        where: { official_code: toc.science_program_id },
      });

      const newTocMapping = this._resultsTocResultsRepository.create({
        created_by: userId,
        toc_result_id: mapToToc[0].toc_result_id,
        initiative_id: init ? init.id : null,
        result_id: resultId,
      });
      await this._resultsTocResultsRepository.save(newTocMapping);

      const newTocContributorsIndicator =
        this._resultsTocResultsIndicatorsRepository.create({
          created_by: userId,
          results_toc_results_id: newTocMapping.result_toc_result_id,
          toc_results_indicator_id: mapToToc[0].toc_results_indicator_id,
        });
      await this._resultsTocResultsIndicatorsRepository.save(
        newTocContributorsIndicator,
      );
    }
  }

  private async handleNonPooledProject(
    resultId,
    userId,
    bilateralProjects,
    lead_center,
  ) {

    const foundInstitution = await this._clarisaInstitutionsRepository.findOne({
      where: [
            { name: Like(`%${lead_center}%`) },
            { acronym: Like(`%${lead_center}%`) },
        ],
    });

    let clarisaCenter;
    if (foundInstitution.id) {
        clarisaCenter = await this._clarisaCenters.findOne({
            where: { institutionId: foundInstitution.id },
        });
        if (!clarisaCenter) {
           clarisaCenter = null 
        }
    }

    for (const nonpp of bilateralProjects) {
      await this._nonPooledProjectRepository.save({
        results_id: resultId,
        grant_title: nonpp.grant_title,
        lead_center_id: clarisaCenter?.code ?? null,
        funder_institution_id: foundInstitution.id,
        created_by: userId,
      });
    }
  }

  private async handleEvidence(resultId, evidence, userId) {
    const evidencesArray = evidence.filter((e) => !!e?.link);
    const testDuplicate = evidencesArray.map((e) => e.link);
    if (new Set(testDuplicate).size !== testDuplicate.length) {
      throw {
        response: {},
        message: 'Duplicate links found in the evidence',
        status: HttpStatus.BAD_REQUEST,
      };
    }

    const long: number = evidencesArray.length > 6 ? 6 : evidencesArray.length;
    for (let index = 0; index < long; index++) {
      const evidence = evidencesArray[index];

      evidence.link = await this._evidencesService.getHandleFromRegularLink(
        evidence.link,
      );

      const newEvidence = new Evidence();
      newEvidence.created_by = userId;
      newEvidence.description = evidence?.description ?? null;
      newEvidence.link = evidence.link;
      newEvidence.result_id = resultId;

      const hasQuery = (evidence.link ?? '').indexOf('?');
      const linkSplit = (evidence.link ?? '')
        .slice(0, hasQuery != -1 ? hasQuery : evidence.link?.length)
        .split('/');
      const handleId = linkSplit.slice(linkSplit.length - 2).join('/');

      const knowledgeProduct =
        await this._resultsKnowledgeProductsRepository.findOne({
          where: { handle: Like(handleId) },
          relations: { result_object: true },
        });

      if (knowledgeProduct) {
        newEvidence.knowledge_product_related =
          knowledgeProduct.result_object.id;
      }

      await this._evidencesRepository.save(newEvidence);
    }
  }

  private async handleInstitutions(resultId, institutions, userId) {
    const whereConditions = [];

    const institutionIds = institutions
      .map((r) => r.institution_id)
      .filter((id) => id !== null && id !== undefined);
    if (institutionIds.length) {
      whereConditions.push({ id: In(institutionIds) });
    }

    const names = institutions
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);
    if (names.length) {
      whereConditions.push({ name: In(names) });
    }

    const acronyms = institutions
      .map((r) => r.iso_alpha_3)
      .filter((acronym) => acronym !== null && acronym !== undefined);
    if (acronyms.length) {
      whereConditions.push({ acronym: In(acronyms) });
    }

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one institution identifier (id, name, or acronym) must be provided.',
      );
    }

    const foundInstitutions = await this._clarisaInstitutionsRepository.find({
      where: whereConditions,
    });

    const mappedInstitutions = foundInstitutions.map((institution) => ({
      institutions_id: institution.id,
    }));

    await this._resultByIntitutionsRepository.updateInstitutions(
      resultId,
      mappedInstitutions,
      userId,
      false,
      [InstitutionRoleEnum.ACTOR],
    );
    const saveInstitutions: ResultsByInstitution[] = [];
    for (let index = 0; index < institutions.length; index++) {
      const isInstitutions =
        await this._resultByIntitutionsRepository.getResultByInstitutionExists(
          resultId,
          institutions[index].institutions_id,
          InstitutionRoleEnum.ACTOR,
        );
      if (!isInstitutions) {
        const institutionsNew: ResultsByInstitution =
          new ResultsByInstitution();
        institutionsNew.created_by = userId;
        institutionsNew.institution_roles_id = 1;
        institutionsNew.institutions_id = institutions[index].institutions_id;
        institutionsNew.last_updated_by = userId;
        institutionsNew.result_id = resultId;
        institutionsNew.is_active = true;
        saveInstitutions.push(institutionsNew);
      }
    }
    await this._resultByIntitutionsRepository.save(saveInstitutions);
  }

  private async findSubmittedByUser({
    email,
    submitted_date,
    name,
  }: SubmittedByDto) {
    if (email) return this._userRepository.findOne({ where: { email } });

    if (submitted_date) {
      const start = new Date(submitted_date);
      const end = new Date(submitted_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      return this._userRepository.findOne({
        where: { created_date: Between(start, end) },
      });
    }

    if (name) {
      const [firstName, ...lastParts] = name.trim().split(/\s+/);
      const lastName = lastParts.join(' ') || null;
      const where: any[] = [{ first_name: firstName }];

      if (lastName) {
        where.push(
          { last_name: lastName },
          { first_name: firstName, last_name: lastName },
        );
      }

      return this._userRepository.findOne({ where });
    }

    return null;
  }

  private async findScope(scope_code?: number, scope_label?: string) {
    const where = scope_code ? { id: scope_code } : { name: scope_label };
    const scope = await this._geoScopeRepository.findOne({ where });
    if (!scope) {
      throw new NotFoundException(
        `No geographic scope found for ${scope_code ? `code ${scope_code}` : `label "${scope_label}"`}`,
      );
    }
    return scope;
  }

  private validateGeoFocus(scope, regions, countries, subnational_areas) {
    const label = scope.name;

    const validators = {
      2: {
        field: regions,
        message: `Regions are required for scope "${label}".`,
      },
      4: {
        field: countries,
        message: `Countries are required for scope "${label}".`,
      },
      5: {
        field: countries?.length && subnational_areas?.length,
        message: `Countries and subnational areas are required for scope "${label}".`,
      },
    };

    const validator = validators[scope.code];
    if (validator && !validator.field)
      throw new BadRequestException(validator.message);
  }

  private async handleRegions(result: Result, scope, regions) {
    const hasRegions = Array.isArray(regions) && regions.length > 0;
    if ((!hasRegions && scope.id !== 2) || scope.id === 3 || scope.id === 4) {
      await this._resultRegionRepository.updateRegions(result.id, []);
      result.has_regions = false;
      return;
    }

    const um49codes = regions
      .map((r) => r.um49code)
      .filter((code) => code !== null && code !== undefined);
    const names = regions
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);

    const whereConditions = [
      ...(um49codes.length ? [{ um49Code: In(um49codes) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one region identifier (um49code or name) must be provided.',
      );
    }

    const foundRegions = await this._clarisaRegionsRepository.find({
      where: whereConditions,
    });

    if (!foundRegions.length) {
      throw new NotFoundException(
        `No regions found matching the provided data (codes: ${um49codes.join(', ') || 'N/A'}, names: ${names.join(', ') || 'N/A'}).`,
      );
    }

    const regionIds = foundRegions.map((r) => r.um49Code);

    await this._resultRegionRepository.updateRegions(result.id, regionIds);
    const resultRegionArray: ResultRegion[] = [];
    for (const region of foundRegions) {
      const exist =
        await this._resultRegionRepository.getResultRegionByResultIdAndRegionId(
          result.id,
          region.um49Code,
        );

      if (!exist) {
        const newRegion = new ResultRegion();
        newRegion.region_id = region.um49Code;
        newRegion.result_id = result.id;
        resultRegionArray.push(newRegion);
      }
    }

    if (resultRegionArray.length) {
      await this._resultRegionRepository.save(resultRegionArray);
    }

    result.has_regions = true;
    result.geographic_scope_id = [4, 50].includes(scope.id) ? 50 : scope.id;

    await this._resultRepository.save(result);
  }

  private resolveScopeId(scopeId: number, countries?: any[]) {
    if ([4, 50].includes(scopeId)) return 50;
    if (scopeId === 3 && countries) return countries.length > 1 ? 3 : 4;
    return scopeId;
  }

  private async handleCountries(
    result,
    countries,
    subnational_areas,
    scopeId,
    userId,
  ) {
    const hasCountries = Array.isArray(countries) && countries.length > 0;

    // Caso sin países válidos o alcance global/regional sin detalle
    if ((!hasCountries && scopeId !== 3) || scopeId === 4) {
      await this._resultCountryRepository.updateCountries(result.id, []);
      result.has_countries = false;
      return;
    }

    // --- Buscar países en clarisa_countries ---
    const ids = countries
      .map((r) => r.id)
      .filter((id) => id !== null && id !== undefined);
    const names = countries
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);
    const isoAlpha3s = countries
      .map((r) => r.iso_alpha_3)
      .filter((code) => code !== null && code !== undefined);
    const isoAlpha2s = countries
      .map((r) => r.iso_alpha_2)
      .filter((code) => code !== null && code !== undefined);

    const whereConditions = [
      ...(ids.length ? [{ id: In(ids) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
      ...(isoAlpha3s.length ? [{ iso_alpha_3: In(isoAlpha3s) }] : []),
      ...(isoAlpha2s.length ? [{ iso_alpha_2: In(isoAlpha2s) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one country identifier (id, name, iso_alpha_3, or iso_alpha_2) must be provided.',
      );
    }

    const foundCountries = await this._clarisaCountriesRepository.find({
      where: whereConditions,
    });

    if (!foundCountries.length) {
      throw new NotFoundException(
        `No countries found matching any of the provided identifiers: ids=${ids.join(', ') || 'N/A'}, names=${names.join(', ') || 'N/A'}.`,
      );
    }

    const foundCountryIds = foundCountries.map((c) => c.id);

    await this._resultCountryRepository.updateCountries(
      result.id,
      foundCountryIds,
    );

    const resultCountryArray = await this.handleResultCountryArray(
      result,
      foundCountries,
    );
    await this.handleSubnationals(
      resultCountryArray,
      subnational_areas,
      scopeId,
      userId,
    );

    result.has_countries = true;
  }

  private async handleResultCountryArray(result, countries) {
    const resultCountryArray: ResultCountry[] = [];

    for (const c of countries) {
      const exist =
        await this._resultCountryRepository.getResultCountrieByIdResultAndCountryId(
          result.id,
          c.id,
        );
      if (!exist) {
        const newCountry = new ResultCountry();
        newCountry.country_id = c.id;
        newCountry.result_id = result.id;
        resultCountryArray.push(newCountry);
      }
    }

    if (resultCountryArray.length) {
      await this._resultCountryRepository.save(resultCountryArray);
    }

    return resultCountryArray;
  }

  private async handleSubnationals(
    resultCountryArray,
    subnational_areas,
    geoScopeId,
    userId,
  ) {
    if (geoScopeId !== 5) return;

    const ids = subnational_areas
      .map((r) => r.id)
      .filter((id) => id !== null && id !== undefined);
    const names = subnational_areas
      .map((r) => r.name)
      .filter((name) => name !== null && name !== undefined);

    const whereConditions = [
      ...(ids.length ? [{ id: In(ids) }] : []),
      ...(names.length ? [{ name: In(names) }] : []),
    ];

    if (whereConditions.length === 0) {
      throw new BadRequestException(
        'At least one subnational area identifier (id or name) must be provided.',
      );
    }

    const foundSubnationalAreas =
      await this._clarisaSubnationalAreasRepository.find({
        where: whereConditions,
      });

    if (!foundSubnationalAreas.length) {
      throw new NotFoundException(
        `No subnational areas found matching any of the provided identifiers: ids=${ids.join(', ') || 'N/A'}, names=${names.join(', ') || 'N/A'}.`,
      );
    }

    const foundCountryIds = foundSubnationalAreas.map((c) => c.code);

    await Promise.all(
      resultCountryArray.map(async (rc) => {
        await Promise.all([
          this._resultCountrySubnationalRepository.bulkUpdateSubnational(
            rc.result_country_id,
            foundCountryIds,
            userId,
          ),
          this._resultCountrySubnationalRepository.upsertSubnational(
            rc.result_country_id,
            foundCountryIds,
            userId,
          ),
        ]);
      }),
    );
  }
}
