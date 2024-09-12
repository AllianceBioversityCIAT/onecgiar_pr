import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { submissionRepository } from './submissions.repository';
import { ResultRepository } from '../result.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { Submission } from './entities/submission.entity';
import { resultValidationRepository } from '../results-validation-module/results-validation-module.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { IpsrService } from '../../ipsr/ipsr.service';
import { ResultsInnovationPackagesValidationModuleService } from '../../ipsr/results-innovation-packages-validation-module/results-innovation-packages-validation-module.service';
import { RoleEnum } from '../../../shared/constants/role-type.enum';
import { NotificationService } from '../../notification/notification.service';
import {
  NotificationLevelEnum,
  NotificationTypeEnum,
} from '../../notification/enum/notification.enum';
import { In } from 'typeorm';
import { UserNotificationSettingRepository } from '../../user-notification-settings/user-notification-settings.repository';
import { NotificationDto } from '../../../shared/microservices/socket-management/dto/create-socket.dto';
import { UserNotificationSettingsService } from '../../user-notification-settings/user-notification-settings.service';

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _submissionRepository: submissionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _resultValidationRepository: resultValidationRepository,
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _generalInformationIpsrService: IpsrService,
    private readonly _resultInnovationPackageValidationService: ResultsInnovationPackagesValidationModuleService,
    private readonly _notificationService: NotificationService,
    private readonly _userNotificationSettingsService: UserNotificationSettingsService,
  ) {}

  async submitFunction(
    resultId: number,
    user: TokenDto,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const role = await this._roleByUserRepository.validationRolePermissions(
        user.id,
        result.id,
        [RoleEnum.ADMIN, RoleEnum.LEAD, RoleEnum.CO_LEAD, RoleEnum.COORDINATOR],
      );
      if (!role) {
        return {
          response: {},
          message: 'The user does not have the necessary role for this action.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      if (!result) {
        return {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const isValid = await this._resultValidationRepository.resultIsValid(
        result.id,
      );
      if (!isValid) {
        return {
          response: {},
          message:
            'This result cannot be submit, sections are missing to complete',
          status: HttpStatus.NOT_ACCEPTABLE,
        };
      }

      const data = await this._resultRepository.update(result.id, {
        status: 1,
        status_id: 3,
      });
      const newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = true;
      newSubmissions.status_id = 3;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);

      this.sentNotification(
        result,
        user,
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_SUBMITTED,
      );

      return {
        response: data,
        message: 'the result has been submitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async submitFunctionIPSR(
    resultId: number,
    user: TokenDto,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const role = await this._roleByUserRepository.validationRolePermissions(
        user.id,
        result.id,
        [3, 4, 5],
      );
      if (!role) {
        return {
          response: {},
          message: 'The user does not have the necessary role for this action.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }

      if (!result) {
        return {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      const isValid =
        await this._resultInnovationPackageValidationService.getGreenchecksByinnovationPackage(
          result.id,
        );
      if (!isValid.response.validResult) {
        return {
          response: {},
          message:
            'This result cannot be submit, sections are missing to complete',
          status: HttpStatus.NOT_ACCEPTABLE,
        };
      }

      const data = await this._resultRepository.update(result.id, {
        status: 1,
        status_id: 3,
      });
      const newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = true;
      newSubmissions.status_id = 3;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);

      const ipsr =
        await this._generalInformationIpsrService.findInnovationDetail(
          result.id,
        );

      this.sentNotification(
        result,
        user,
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_SUBMITTED,
      );

      return {
        response: {
          innoPckg: ipsr.response,
          newSubmissions,
          data,
        },
        message: 'the result has been submitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async unsubmitFunction(
    resultId: number,
    user: TokenDto,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const role = await this._roleByUserRepository.validationRolePermissions(
        user.id,
        result.id,
        [3, 4, 5],
      );
      if (!role) {
        return {
          response: {},
          message: 'The user does not have the necessary role for this action.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }
      if (!result) {
        return {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!createSubmissionDto?.comment) {
        return {
          response: {},
          message: 'No justification provided',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const data = await this._resultRepository.update(result.id, {
        status: 0,
        status_id: 1,
      });
      const newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = false;
      newSubmissions.status_id = 1;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);

      this.sentNotification(
        result,
        user,
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_UNSUBMITTED,
      );

      return {
        response: data,
        message: 'the result has been unsubmitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async unsubmitFunctionIPSR(
    resultId: number,
    user: TokenDto,
    createSubmissionDto: CreateSubmissionDto,
  ) {
    try {
      const result = await this._resultRepository.getResultById(resultId);
      const role = await this._roleByUserRepository.validationRolePermissions(
        user.id,
        result.id,
        [3, 4, 5],
      );
      if (!role) {
        return {
          response: {},
          message: 'The user does not have the necessary role for this action.',
          status: HttpStatus.UNAUTHORIZED,
        };
      }
      if (!result) {
        return {
          response: {},
          message: 'Results Not Found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      if (!createSubmissionDto?.comment) {
        return {
          response: {},
          message: 'No justification provided',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const data = await this._resultRepository.update(result.id, {
        status: 0,
        status_id: 1,
      });
      const newSubmissions = new Submission();
      newSubmissions.user_id = user.id;
      newSubmissions.status = false;
      newSubmissions.status_id = 1;
      newSubmissions.comment = createSubmissionDto.comment;
      newSubmissions.results_id = result.id;
      await this._submissionRepository.save(newSubmissions);

      const ipsr =
        await this._generalInformationIpsrService.findInnovationDetail(
          result.id,
        );

      this.sentNotification(
        result,
        user,
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_UNSUBMITTED,
      );

      return {
        response: {
          innoPckg: ipsr.response,
          data,
        },
        message: 'the result has been unsubmitted successfully',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  private async sentNotification(
    result: any,
    user: TokenDto,
    nLevel: NotificationLevelEnum,
    nType: NotificationTypeEnum,
  ) {
    const recipients =
      await this._userNotificationSettingsService.getNotificationUpdatesRecipients(
        result.initiative_id,
      );

    const desc =
      nType === NotificationTypeEnum.RESULT_SUBMITTED
        ? `The result ${result.result_code} has been submitted`
        : `The result ${result.result_code} has been unsubmitted`;

    const notification: NotificationDto = {
      official_code: result.initiative_official_code,
      desc,
      created_date: new Date(),
    };

    const saveNotification =
      await this._notificationService.emitResultNotification(
        nLevel,
        nType,
        recipients,
        user.id,
        result.id,
        notification,
      );

    return saveNotification;
  }
}
