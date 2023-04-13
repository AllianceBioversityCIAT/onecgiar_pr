import { HttpStatus, Injectable, Type } from '@nestjs/common';
import { ResultRepository } from '../../results/result.repository';
import { HandlersError, returnDataDto } from '../../../shared/handlers/error.utils';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultIpSdgTargetRepository } from './repository/result-ip-sdg-targets.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Version } from '../../results/versions/entities/version.entity';
import { ResultsComplementaryInnovationRepository } from '../results-complementary-innovations/repositories/results-complementary-innovation.repository';
import { EvidencesRepository } from '../../results/evidences/evidences.repository';
import { SaveStepTwoThree } from './dto/save-step-three.dto';
import { ResultsByIpInnovationUseMeasureRepository } from '../results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpActorRepository } from '../results-ip-actors/results-ip-actor.repository';
import { ResultsIpInstitutionTypeRepository } from '../results-ip-institution-type/results-ip-institution-type.repository';
import { ResultsIpActor } from '../results-ip-actors/entities/results-ip-actor.entity';
import { ResultsByIpInnovationUseMeasure } from '../results-by-ip-innovation-use-measures/entities/results-by-ip-innovation-use-measure.entity';
import { IpsrRepository } from '../ipsr.repository';
import { SaveStepFour } from './dto/save-step-four.dto';
import { ResultByInitiativesRepository } from '../../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { Evidence } from '../../../api/results/evidences/entities/evidence.entity';

@Injectable()
export class InnovationPathwayStepFourService {
  constructor(
    protected readonly _versionsService: VersionsService,
    protected readonly _handlersError: HandlersError,
    protected readonly _resultRepository: ResultRepository,
    protected readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    protected readonly _innovationByResultRepository: IpsrRepository,
    protected readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    protected readonly _evidenceRepository: EvidencesRepository,
  ) { }

  async getStepFour(resultId: number) {
    try {
      return {
        response: { valid: true },
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveMain(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour) {
    try {
      const result = await this._resultRepository.findOne({
        where: {
          id: resultId,
          is_active: true
        }
      });
      if (!result) {
        throw {
          response: result,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const vTemp = await this._versionsService.findBaseVersion();
      if (vTemp.status >= 300) {
        throw this._handlersError.returnErrorRes({ error: vTemp });
      }
      const version: Version = <Version>vTemp.response;

      const evidence = await this.saveEvidence(result.id, user, saveStepFourDto, version);
      const initiativeInvestment = await this.saveInitiativeInvestment(result.id, user, saveStepFourDto);


      return {
        response: evidence,
        message: 'Successful response',
        status: HttpStatus.OK,
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async saveEvidence(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour, version: Version) {
    try {
      const allEvidence: Evidence[] = await this._evidenceRepository.getEvidence(+resultId);
      const existingIds = allEvidence.map(e => e.link);

      const ipsrPictures: any[] = saveStepFourDto.ipsr_pictures;
      const ipsrMaterials: any[] = saveStepFourDto.ipsr_materials;
      const link_workshop_list: string = saveStepFourDto.link_workshop_list;

      let saveLinkWorkShop: Evidence[] = [];

      if (link_workshop_list) {
        const linkExists = allEvidence.filter(
          ae =>
            existingIds.find(e => ae.link === link_workshop_list)
        )

        if (!linkExists.length) {
          saveLinkWorkShop.push(await this._evidenceRepository.save({
            result_id: resultId,
            link: link_workshop_list,
            evidence_type_id: 4,
            version_id: version.id,
            created_by: user.id,
            creation_date: new Date(),
            last_updated_by: user.id,
            last_updated_date: new Date(),
          }));
        }
      }

      const picturesToActive = allEvidence.filter(
        ae =>
          ipsrPictures.find(e => e.link === ae.link) &&
          ae.is_active !== 1 &&
          ae.evidence_type_id === 3
      );

      const materialsToActive = allEvidence.filter(
        ae =>
          ipsrMaterials.find(e => e.link === ae.link) &&
          ae.is_active !== 0 &&
          ae.evidence_type_id === 4
      );

      const picturesToInactive = allEvidence.filter(
        ae =>
          !ipsrPictures.find(e => e.link === ae.link) &&
          ae.is_active === 1 &&
          ae.evidence_type_id === 3
      );

      const materialsToInactive = allEvidence.filter(
        ae =>
          !ipsrMaterials.find(e => e.link === ae.link) &&
          ae.is_active === 1 &&
          ae.evidence_type_id === 4
      );

      const picturesToSave = ipsrPictures?.filter(
        ip => !existingIds.includes(ip.link)
      );

      const materialsToSave = ipsrMaterials?.filter(
        ip => !existingIds.includes(ip.link)
      );

      let savePictures: Evidence[] = [];

      if (picturesToSave?.length > 0) {
        for (const entity of picturesToSave) {
          const newPictures = new Evidence();
          newPictures.result_id = resultId;
          newPictures.link = entity.link;
          newPictures.evidence_type_id = 3;
          newPictures.version_id = version.id;
          newPictures.created_by = user.id;
          newPictures.creation_date = new Date();
          newPictures.last_updated_by = user.id;
          newPictures.last_updated_date = new Date();
          savePictures.push(await this._evidenceRepository.save(newPictures));
        }
      }

      if (picturesToActive?.length > 0) {
        for (const entity of picturesToActive) {
          entity.is_active = 1;
          entity.last_updated_by = user.id;
          entity.last_updated_date = new Date();
          savePictures.push(await this._evidenceRepository.save(entity));
        }
      }

      if (picturesToInactive?.length > 0) {
        for (const entity of picturesToInactive) {
          entity.is_active = 1;
          entity.last_updated_by = user.id;
          entity.last_updated_date = new Date();
          savePictures.push(await this._evidenceRepository.save(entity));
        }
      }

      let saveMaterials: Evidence[] = [];

      if (materialsToSave?.length > 0) {
        for (const entity of materialsToSave) {
          const newMaterials = new Evidence();
          newMaterials.result_id = resultId;
          newMaterials.link = entity.link;
          newMaterials.evidence_type_id = 4;
          newMaterials.version_id = version.id;
          newMaterials.created_by = user.id;
          newMaterials.creation_date = new Date();
          newMaterials.last_updated_by = user.id;
          newMaterials.last_updated_date = new Date();
          saveMaterials.push(await this._evidenceRepository.save(newMaterials));
        }
      }

      if (materialsToActive?.length > 0) {
        for (const entity of materialsToActive) {
          entity.is_active = 1;
          entity.last_updated_by = user.id;
          entity.last_updated_date = new Date();
          saveMaterials.push(await this._evidenceRepository.save(entity));
        }
      }

      if (materialsToInactive?.length > 0) {
        for (const entity of materialsToInactive) {
          entity.is_active = 1;
          entity.last_updated_by = user.id;
          entity.last_updated_date = new Date();
          saveMaterials.push(await this._evidenceRepository.save(entity));
        }
      }

      return {
        response: {
          saveMaterials,
          savePictures,
          saveLinkWorkShop
        }
      }

    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
  async saveInitiativeInvestment(resultId: number, user: TokenDto, saveStepFourDto: SaveStepFour) {
    try {
      const resultByInitiative = await this._resultByInitiativeRepository.findOneBy({ result_id: resultId, is_active: true });

      if (!resultByInitiative) {
        throw {
          response: resultByInitiative,
          message: 'The result and initiative was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }


    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
