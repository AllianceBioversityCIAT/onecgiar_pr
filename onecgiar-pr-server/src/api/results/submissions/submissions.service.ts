import { HttpStatus, Injectable, Logger } from '@nestjs/common';
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
import { UserNotificationSettingsService } from '../../user-notification-settings/user-notification-settings.service';
import { IntellectualPropertyExpertRepository } from '../intellectual_property_experts/repositories/intellectual_property_experts.repository';
import * as handlebars from 'handlebars';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';
import { EmailTemplate } from '../../../shared/microservices/email-notification-management/enum/email-notification.enum';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { EmailNotificationManagementService } from '../../../shared/microservices/email-notification-management/email-notification-management.service';

@Injectable()
export class SubmissionsService {
  private readonly _logger: Logger = new Logger(SubmissionsService.name);
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
    private readonly _intellectualPropertyExpertRepository: IntellectualPropertyExpertRepository,
    private readonly _globalParametersRepository: GlobalParameterRepository,
    private readonly _templateRepository: TemplateRepository,
    private readonly _emailNotificationManagementService: EmailNotificationManagementService,
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

      await this.sentNotification(
        result,
        user,
        NotificationLevelEnum.RESULT,
        NotificationTypeEnum.RESULT_SUBMITTED,
      );

      const hasContactRequest =
        await this._resultRepository.getResultInnovationDevelopmentByResultId(
          result.id,
        );
      if (result.result_type_id === 7 && hasContactRequest) {
        const emails =
          await this._intellectualPropertyExpertRepository.getIpExpertsEmailsByResultId(
            result.id,
          );

        const bccEmails = await this._globalParametersRepository.findOne({
          where: { name: 'technical_team_email' },
          select: { value: true },
        });

        const template = await this._templateRepository.findOne({
          where: { name: EmailTemplate.IP_EXPERTS_SUPPORT },
        });
        if (!template) {
          this._logger.warn(
            'Email template email_template_roles_update not found. Skipping notification.',
          );
          return;
        }

        for (const email of emails) {
          const emailData: Record<string, any> = {
            userName: `${email.first_name} ${email.last_name}`.trim(),
            resultUrl: `${process.env.RESULTS_URL}${result.result_code}/general-information?phase=${result.version_id}`,
          };
          const compiledTemplate = handlebars.compile(template.template);

          this._emailNotificationManagementService.sendEmail({
            from: {
              email: process.env.EMAIL_SENDER,
              name: 'PRMS Reporting Tool -',
            },
            emailBody: {
              subject:
                'PRMS – IP Support Request for Innovation Development Result',
              to: [email.email],
              cc: [],
              bcc: bccEmails.value,
              message: {
                text: 'Account roles updated',
                socketFile: compiledTemplate(emailData),
              },
            },
          });
        }
      }

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

      await this.sentNotification(
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

      await this.sentNotification(
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

      await this.sentNotification(
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
        result,
      );

    const saveNotification =
      await this._notificationService.emitResultNotification(
        nLevel,
        nType,
        recipients,
        user.id,
        result.id,
      );

    return saveNotification;
  }
}
